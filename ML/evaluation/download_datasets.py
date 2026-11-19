"""Download shared haze benchmarks into the git-ignored ML/data directory."""

from __future__ import annotations

import argparse
from pathlib import Path

import gdown

ML_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ML_DIR / "data"
DATASETS = {
    "rice1": ("RICE1", "1clttcabWC1zd8qliY134YjpPQRG1LFGw"),
    "sots": ("SOTS", "1JEHmny2nS8d2TjuJc0SON3iq2iLeDWLK"),
    "o_haze": ("O-HAZE", "1IaP8E-fsJrfKTBSlVdWUJTa8ztRDtWxJ"),
    "nh_haze": ("NH-HAZE", "12_hoxtRilDTNppiUHzOiubK_BJ9xSyDa"),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("datasets", nargs="*", choices=sorted(DATASETS), help="Defaults to all shared datasets.")
    args = parser.parse_args()
    selected = args.datasets or list(DATASETS)
    failures = 0
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    for key in selected:
        name, folder_id = DATASETS[key]
        target = DATA_DIR / name
        print(f"Downloading {name} to {target}")
        try:
            files = gdown.download_folder(
                id=folder_id,
                output=str(target),
                quiet=False,
                resume=True,
            )
            print(f"{name}: downloaded/listed {len(files or [])} files.")
        except Exception as exc:
            failures += 1
            print(f"{name}: download failed: {exc}")
            if "401" in str(exc) or "permission" in str(exc).lower():
                print("Make this Drive folder accessible to anyone with the link, then rerun this command.")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
