"""Supervised training entry point for the AOD-Net dehazing baseline."""

from __future__ import annotations

import argparse
import os
import random
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset


ROOT = Path(__file__).resolve().parents[2]
BASELINES_DIR = ROOT / "ML" / "baselines"
sys.path.insert(0, str(BASELINES_DIR))

from AOD_Net import AODnet


IMAGE_SUFFIXES = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}
DEFAULT_CHECKPOINT = ROOT / "ML" / "checkpoints" / "aod_best.pt"


def paired_images(hazy_dir: Path, clear_dir: Path) -> list[tuple[Path, Path]]:
    """Pair top-level hazy/clear images by case-insensitive file stem."""
    for folder in (hazy_dir, clear_dir):
        if not folder.is_dir():
            raise ValueError(f"Image directory does not exist: {folder}")

    def index(folder: Path) -> dict[str, Path]:
        images: dict[str, Path] = {}
        for path in folder.iterdir():
            if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
                key = path.stem.casefold()
                if key in images:
                    raise ValueError(
                        f"Multiple images with the same filename stem in {folder}: {key}"
                    )
                images[key] = path
        return images

    hazy = index(hazy_dir)
    clear = index(clear_dir)
    unmatched_hazy = sorted(hazy.keys() - clear.keys())
    unmatched_clear = sorted(clear.keys() - hazy.keys())
    if unmatched_hazy or unmatched_clear:
        raise ValueError(
            "Hazy and clear directories must contain matching filename stems. "
            f"Unmatched hazy: {unmatched_hazy[:5]}; "
            f"unmatched clear: {unmatched_clear[:5]}."
        )

    pairs = [(hazy[key], clear[key]) for key in sorted(hazy)]
    if len(pairs) < 2:
        raise ValueError(
            f"At least two matching hazy/clear image pairs are required; found {len(pairs)}."
        )
    return pairs


class PairedDehazingDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(
        self,
        pairs: list[tuple[Path, Path]],
        patch_size: int,
        training: bool,
    ) -> None:
        self.pairs = pairs
        self.patch_size = patch_size
        self.training = training

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        hazy_path, clear_path = self.pairs[index]
        with Image.open(hazy_path) as image:
            hazy = image.convert("RGB")
        with Image.open(clear_path) as image:
            clear = image.convert("RGB")
        if hazy.size != clear.size:
            raise ValueError(
                f"Paired images must have identical dimensions: "
                f"{hazy_path.name} is {hazy.size}, {clear_path.name} is {clear.size}."
            )

        width, height = hazy.size
        scale = max(1.0, self.patch_size / width, self.patch_size / height)
        if scale > 1:
            resized = (round(width * scale), round(height * scale))
            hazy = hazy.resize(resized, Image.Resampling.BICUBIC)
            clear = clear.resize(resized, Image.Resampling.BICUBIC)

        width, height = hazy.size
        if self.training:
            left = random.randint(0, width - self.patch_size)
            top = random.randint(0, height - self.patch_size)
        else:
            left = (width - self.patch_size) // 2
            top = (height - self.patch_size) // 2
        box = (left, top, left + self.patch_size, top + self.patch_size)
        hazy = hazy.crop(box)
        clear = clear.crop(box)

        if self.training:
            if random.random() < 0.5:
                hazy = hazy.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                clear = clear.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if random.random() < 0.5:
                hazy = hazy.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                clear = clear.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

        def to_tensor(image: Image.Image) -> torch.Tensor:
            array = np.asarray(image, dtype=np.float32).copy() / 255.0
            return torch.from_numpy(array).permute(2, 0, 1).contiguous()

        return to_tensor(hazy), to_tensor(clear)


def evaluate(
    model: torch.nn.Module,
    loader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    device: torch.device,
) -> tuple[float, float]:
    model.eval()
    loss_sum = 0.0
    squared_error_sum = 0.0
    pixel_count = 0
    sample_count = 0
    with torch.inference_mode():
        for hazy, clear in loader:
            hazy = hazy.to(device)
            clear = clear.to(device)
            prediction = model(hazy)
            batch_size = hazy.shape[0]
            loss_sum += F.l1_loss(prediction, clear).item() * batch_size
            squared_error_sum += F.mse_loss(
                prediction.clamp(0, 1), clear, reduction="sum"
            ).item()
            pixel_count += clear.numel()
            sample_count += batch_size

    mean_loss = loss_sum / sample_count
    mse = squared_error_sum / pixel_count
    psnr = float("inf") if mse == 0 else -10.0 * np.log10(mse)
    return mean_loss, float(psnr)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Train AOD-Net on paired hazy/clear images. "
            "Each directory should contain corresponding images with matching filenames."
        )
    )
    parser.add_argument("--hazy-dir", type=Path, required=True)
    parser.add_argument("--clear-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--patch-size", type=int, default=128)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--train-split", type=float, default=0.9)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    args = parser.parse_args()

    if args.epochs < 1 or args.batch_size < 1 or args.patch_size < 16:
        parser.error("epochs and batch-size must be positive; patch-size must be >= 16")
    if args.learning_rate <= 0:
        parser.error("learning-rate must be positive")
    if not 0 < args.train_split < 1:
        parser.error("train-split must be between 0 and 1")
    if args.workers < 0:
        parser.error("workers cannot be negative")
    return args


def main() -> None:
    args = parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    if args.device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("--device cuda was requested but CUDA is unavailable")
    device = torch.device(
        "cuda" if args.device == "cuda" or (args.device == "auto" and torch.cuda.is_available()) else "cpu"
    )

    pairs = paired_images(args.hazy_dir, args.clear_dir)
    generator = torch.Generator().manual_seed(args.seed)
    order = torch.randperm(len(pairs), generator=generator).tolist()
    validation_count = min(max(1, round(len(pairs) * (1 - args.train_split))), len(pairs) - 1)
    validation_indices = set(order[:validation_count])
    train_pairs = [pair for index, pair in enumerate(pairs) if index not in validation_indices]
    validation_pairs = [pair for index, pair in enumerate(pairs) if index in validation_indices]

    train_dataset = PairedDehazingDataset(train_pairs, args.patch_size, training=True)
    validation_dataset = PairedDehazingDataset(
        validation_pairs, args.patch_size, training=False
    )
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.workers,
        pin_memory=device.type == "cuda",
    )
    validation_loader = DataLoader(
        validation_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.workers,
        pin_memory=device.type == "cuda",
    )

    model = AODnet().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=5
    )
    initial_validation_loss, initial_validation_psnr = evaluate(
        model, validation_loader, device
    )
    print(
        f"Initial validation: val_l1={initial_validation_loss:.6f} "
        f"val_psnr={initial_validation_psnr:.2f}dB"
    )
    best_validation_loss = float("inf")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    print(
        f"Training AOD-Net on {len(train_pairs)} pairs; validating on "
        f"{len(validation_pairs)} pairs using {device}."
    )

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss_sum = 0.0
        sample_count = 0
        for hazy, clear in train_loader:
            hazy = hazy.to(device)
            clear = clear.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = F.l1_loss(model(hazy), clear)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss_sum += loss.item() * hazy.shape[0]
            sample_count += hazy.shape[0]

        train_loss = train_loss_sum / sample_count
        validation_loss, validation_psnr = evaluate(model, validation_loader, device)
        scheduler.step(validation_loss)
        print(
            f"Epoch {epoch:03d}/{args.epochs} "
            f"train_l1={train_loss:.6f} val_l1={validation_loss:.6f} "
            f"val_psnr={validation_psnr:.2f}dB "
            f"lr={optimizer.param_groups[0]['lr']:.2e}"
        )

        if validation_loss < best_validation_loss:
            best_validation_loss = validation_loss
            checkpoint = {
                "state_dict": {
                    key: value.detach().cpu()
                    for key, value in model.state_dict().items()
                },
                "epoch": epoch,
                "validation_loss": validation_loss,
                "validation_psnr": validation_psnr,
                "architecture": "aod",
                "normalization": "01",
                "seed": args.seed,
            }
            temporary_path = args.output.with_name(args.output.name + ".tmp")
            torch.save(checkpoint, temporary_path)
            os.replace(temporary_path, args.output)

    print(
        f"Best validation L1: {best_validation_loss:.6f}. "
        f"Checkpoint saved to {args.output.resolve()}"
    )


if __name__ == "__main__":
    main()
