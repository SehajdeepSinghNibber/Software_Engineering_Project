"""Install the official pretrained Dehamer (CVPR 2022) outdoor checkpoint.

Source: https://github.com/Li-Chongyi/Dehamer (MIT). The authors publish one
checkpoint per training dataset in a Google Drive folder linked from their
README; this project uses the RESIDE-OTS (outdoor) checkpoint (~0.5 GB).

Usage:
    python download_dehamer_weights.py
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import gdown
import torch

from config import ML_DIR
from model_loader import DEHAMER_CHECKPOINT, _build_dehamer


MODEL_ID = "dehamer"
#: ckpts/outdoor/PSNR3518_SSIM09860.pt in the authors' Drive folder
#: https://drive.google.com/drive/folders/1YZnKreDfqbs_GHB76Ko4qtifpPWPbCwU
GDRIVE_FILE_ID = "1R78U9ieg_Oqi2-RxtrHF3d955evQux4l"
SHA256 = "c604106a2c7249f9491741b0f8506681437c1ceba19a6c5c09d9b438876a22ab"
DOWNLOAD_PATH = Path(ML_DIR) / "checkpoints" / "pretrained" / "downloads" / "dehamer_outdoor_upstream.pt"
#: The released checkpoints carry two Swin branches that upstream's
#: ``UNet_emb`` never builds (its test script loads with ``strict=False``).
UNUSED_PREFIXES = ("swin_2.", "swin_3.")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _clean_state(path: Path) -> dict[str, torch.Tensor]:
    """Verify the download and return a state dict that loads strictly."""
    if _sha256(path) != SHA256:
        raise RuntimeError(f"{path.name}: SHA-256 mismatch, refusing to load it.")
    state = torch.load(path, map_location="cpu", weights_only=True)
    state = {k.removeprefix("module."): v for k, v in state.items()}
    state = {k: v for k, v in state.items() if not k.startswith(UNUSED_PREFIXES)}
    _build_dehamer().load_state_dict(state, strict=True)
    return state


def install() -> None:
    target = Path(DEHAMER_CHECKPOINT)
    if target.is_file():
        print(f"Dehamer weights already installed: {target}")
        return

    DOWNLOAD_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DOWNLOAD_PATH.is_file():
        print("Downloading the official Dehamer outdoor checkpoint (~0.5 GB) ...")
        result = gdown.download(id=GDRIVE_FILE_ID, output=str(DOWNLOAD_PATH), quiet=False, resume=True)
        if not result or not DOWNLOAD_PATH.is_file():
            raise RuntimeError("Dehamer checkpoint download was incomplete; please retry.")

    print("Verifying checkpoint ...")
    state = _clean_state(DOWNLOAD_PATH)
    tmp = target.with_suffix(".tmp")
    torch.save(state, tmp)
    tmp.replace(target)
    DOWNLOAD_PATH.unlink()
    print(f"Installed {MODEL_ID} -> {target}")


def main() -> None:
    try:
        install()
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
