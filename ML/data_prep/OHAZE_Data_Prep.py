"""Validate and stage paired O-HAZE hazy/clear images for model training."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image


IMAGE_SUFFIXES = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}


def image_index(folder: Path) -> dict[str, Path]:
    if not folder.is_dir():
        raise ValueError(f"Image directory does not exist: {folder}")
    images: dict[str, Path] = {}
    for path in folder.iterdir():
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
            stem = re.sub(
                r"_outdoor_(?:gt|hazy)$", "", path.stem, flags=re.IGNORECASE
            ).casefold()
            if stem in images:
                raise ValueError(f"Duplicate image filename stem in {folder}: {stem}")
            images[stem] = path
    return images


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Check matching O-HAZE hazy/clear images and copy them, without "
            "resizing, into paired training folders."
        )
    )
    parser.add_argument("--hazy-dir", type=Path, required=True)
    parser.add_argument("--clear-dir", type=Path, required=True)
    parser.add_argument(
        "--output-dir", type=Path, default=Path("ML/data/paired")
    )
    parser.add_argument(
        "--max-side",
        type=int,
        default=800,
        help="Resize both images in each pair to this maximum side (0 keeps original resolution).",
    )
    args = parser.parse_args()
    if args.max_side < 0:
        parser.error("--max-side cannot be negative")

    hazy = image_index(args.hazy_dir)
    clear = image_index(args.clear_dir)
    if not hazy:
        raise ValueError(f"No supported images found in {args.hazy_dir}")
    if hazy.keys() != clear.keys():
        raise ValueError(
            "Hazy and clear directories must contain the same filename stems. "
            f"Missing clear matches: {sorted(hazy.keys() - clear.keys())[:5]}; "
            f"missing hazy matches: {sorted(clear.keys() - hazy.keys())[:5]}."
        )

    for stem in sorted(hazy):
        hazy_path, clear_path = hazy[stem], clear[stem]
        with Image.open(hazy_path) as hazy_image, Image.open(clear_path) as clear_image:
            if hazy_image.size != clear_image.size:
                raise ValueError(
                    f"Image dimensions differ for '{stem}': "
                    f"{hazy_image.size} vs {clear_image.size}."
                )
            hazy_image.verify()
            clear_image.verify()

    output_dir = args.output_dir.resolve()
    hazy_output = output_dir / "hazy"
    clear_output = output_dir / "clear"
    for source_dir in (args.hazy_dir.resolve(), args.clear_dir.resolve()):
        if (
            output_dir == source_dir
            or source_dir in output_dir.parents
            or output_dir in source_dir.parents
        ):
            raise ValueError(
                f"Output directory must not overlap an input directory: {output_dir}"
            )

    hazy_output.mkdir(parents=True, exist_ok=True)
    clear_output.mkdir(parents=True, exist_ok=True)
    for stem in sorted(hazy):
        for source, folder in (
            (hazy[stem], hazy_output),
            (clear[stem], clear_output),
        ):
            with Image.open(source) as image:
                image = image.convert("RGB")
                if args.max_side and max(image.size) > args.max_side:
                    scale = args.max_side / max(image.size)
                    size = (
                        max(1, round(image.width * scale)),
                        max(1, round(image.height * scale)),
                    )
                    image = image.resize(size, Image.Resampling.LANCZOS)
                destination = folder / f"{stem}{source.suffix.lower()}"
                save_options = (
                    {"quality": 95, "optimize": True}
                    if destination.suffix.lower() in {".jpg", ".jpeg"}
                    else {}
                )
                image.save(destination, **save_options)

    print(
        f"Validated and staged {len(hazy)} image pairs in {output_dir} "
        f"(max side: {args.max_side or 'original'})"
    )
    print(f"Train with --hazy-dir \"{hazy_output}\" --clear-dir \"{clear_output}\"")


if __name__ == "__main__":
    main()
