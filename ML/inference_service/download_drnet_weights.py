"""Fetch the official pretrained DRNet 3-task checkpoint for dehazing."""

from __future__ import annotations

import os

import gdown

from config import ML_DIR


CHECKPOINT_ID = "1xNKOQQamZfnULrKasnNi1V3-jKnd13MQ"
CHECKPOINT_PATH = os.path.join(ML_DIR, "checkpoints", "DRNet_3tasks.pth")


def main() -> None:
    os.makedirs(os.path.dirname(CHECKPOINT_PATH), exist_ok=True)
    if os.path.isfile(CHECKPOINT_PATH) and os.path.getsize(CHECKPOINT_PATH) > 50 * 1024 * 1024:
        print(f"DRNet weights already exist: {CHECKPOINT_PATH}")
        return
    result = gdown.download(
        id=CHECKPOINT_ID,
        output=CHECKPOINT_PATH,
        quiet=False,
        fuzzy=False,
        resume=True,
    )
    if not result or not os.path.isfile(CHECKPOINT_PATH) or os.path.getsize(CHECKPOINT_PATH) < 50 * 1024 * 1024:
        if os.path.exists(CHECKPOINT_PATH):
            os.remove(CHECKPOINT_PATH)
        raise RuntimeError("DRNet checkpoint download was incomplete; please retry.")
    print(f"Installed the official DRNet checkpoint at {CHECKPOINT_PATH}")


if __name__ == "__main__":
    main()
