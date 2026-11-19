"""Run dehazing inference on paired datasets and report PSNR/SSIM."""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

ML_DIR = Path(__file__).resolve().parents[1]
SERVICE_DIR = ML_DIR / "inference_service"
sys.path.insert(0, str(SERVICE_DIR))

from config import ML_DIR as CONFIG_ML_DIR  # noqa: E402
from inference import predict  # noqa: E402
from model_loader import MODEL_REGISTRY  # noqa: E402

DATA_DIR = Path(CONFIG_ML_DIR) / "data"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
PAIR_DIRS = {
    "rice1": (("cloud",), ("label",)),
    "sots": (("hazy",), ("clear",)),
    "o_haze": (("hazy",), ("gt", "clear", "ground_truth")),
    "nh_haze": (("hazy",), ("gt", "clear", "ground_truth")),
}


def _find_image_dir(root: Path, names: tuple[str, ...]) -> Path:
    wanted = {name.lower() for name in names}
    matches = [p for p in root.rglob("*") if p.is_dir() and p.name.lower() in wanted]
    if root.name.lower() in wanted:
        matches.insert(0, root)
    if not matches:
        raise FileNotFoundError(f"Could not find one of {sorted(wanted)} under {root}")
    return matches[0]


def _key(path: Path) -> str:
    value = path.stem.lower()
    value = re.sub(r"([_-])(hazy|gt|clear|label)$", "", value)
    return value


def _image_map(folder: Path) -> dict[str, Path]:
    result = {}
    for path in folder.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
            result.setdefault(_key(path), path)
    return result


def _ssim(first: np.ndarray, second: np.ndarray) -> float:
    x = torch.from_numpy(first).permute(2, 0, 1).unsqueeze(0).float()
    y = torch.from_numpy(second).permute(2, 0, 1).unsqueeze(0).float()
    coords = torch.arange(11, dtype=torch.float32) - 5
    gaussian = torch.exp(-(coords**2) / (2 * 1.5**2))
    gaussian /= gaussian.sum()
    window = (gaussian[:, None] * gaussian[None, :]).expand(3, 1, 11, 11).contiguous()
    mu_x = F.conv2d(x, window, padding=5, groups=3)
    mu_y = F.conv2d(y, window, padding=5, groups=3)
    mu_x2, mu_y2, mu_xy = mu_x.square(), mu_y.square(), mu_x * mu_y
    sigma_x = F.conv2d(x * x, window, padding=5, groups=3) - mu_x2
    sigma_y = F.conv2d(y * y, window, padding=5, groups=3) - mu_y2
    sigma_xy = F.conv2d(x * y, window, padding=5, groups=3) - mu_xy
    c1, c2 = 0.01**2, 0.03**2
    score = ((2 * mu_xy + c1) * (2 * sigma_xy + c2)) / ((mu_x2 + mu_y2 + c1) * (sigma_x + sigma_y + c2))
    return float(score.mean().item())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", choices=sorted(PAIR_DIRS))
    parser.add_argument("--model", default="dehazeformer_b_rice1", choices=sorted(MODEL_REGISTRY))
    parser.add_argument("--limit", type=int, default=0, help="Optional image limit; 0 means the full dataset.")
    parser.add_argument("--output", type=Path, help="CSV path; defaults to ML/results/<dataset>-<model>.csv")
    args = parser.parse_args()

    dataset_root = DATA_DIR / {"rice1": "RICE1", "sots": "SOTS", "o_haze": "O-HAZE", "nh_haze": "NH-HAZE"}[args.dataset]
    hazy_dir = _find_image_dir(dataset_root, PAIR_DIRS[args.dataset][0])
    clear_dir = _find_image_dir(dataset_root, PAIR_DIRS[args.dataset][1])
    hazy, clear = _image_map(hazy_dir), _image_map(clear_dir)
    pairs = [(key, hazy[key], clear[key]) for key in sorted(hazy.keys() & clear.keys())]
    if args.limit > 0:
        pairs = pairs[: args.limit]
    if not pairs:
        raise SystemExit(f"No matching hazy/clear image pairs found under {dataset_root}.")

    output = args.output or (ML_DIR / "results" / f"{args.dataset}-{args.model}.csv")
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for index, (key, hazy_path, clear_path) in enumerate(pairs, 1):
        result = predict(hazy_path.read_bytes(), args.model)
        restored = np.asarray(Image.open(io.BytesIO(result["png"])).convert("RGB"), dtype=np.float32) / 255.0
        target_image = Image.open(clear_path).convert("RGB")
        if target_image.size != (restored.shape[1], restored.shape[0]):
            target_image = target_image.resize((restored.shape[1], restored.shape[0]), Image.Resampling.LANCZOS)
        target = np.asarray(target_image, dtype=np.float32) / 255.0
        mse = float(np.mean((restored - target) ** 2))
        psnr = math.inf if mse == 0 else 10.0 * math.log10(1.0 / mse)
        rows.append({"image": key, "psnr_db": psnr, "ssim": _ssim(restored, target)})
        if index % 10 == 0 or index == len(pairs):
            print(f"{args.dataset} / {args.model}: {index}/{len(pairs)}")

    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["image", "psnr_db", "ssim"])
        writer.writeheader()
        writer.writerows(rows)
    summary = {
        "dataset": args.dataset,
        "model": args.model,
        "pairs": len(rows),
        "unmatched_hazy": len(hazy.keys() - clear.keys()),
        "mean_psnr_db": float(np.mean([row["psnr_db"] for row in rows])),
        "mean_ssim": float(np.mean([row["ssim"] for row in rows])),
        "csv": str(output),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
