"""Install the model checkpoints used by the inference catalog."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import os
import sys
import tempfile
import urllib.request
from collections import OrderedDict
from pathlib import Path

import torch

from config import BASELINES_DIR, ML_DIR
from dehazers import weights as managed_weights
from dehazers.specs import SPECS


PRETRAINED_DIR = Path(ML_DIR) / "checkpoints" / "pretrained"
AUXILIARY_SOURCES = {
    "aodnet": {
        "url": "https://raw.githubusercontent.com/weberwcwei/AODnet-by-pytorch/master/model_pretrained/AOD_net_epoch_relu_10.pth",
        "sha256": "6df1dab7ffcdd71f7b5470573455377f5799f147bb54a113993c3dad4146dac5",
        "size": 16727,
        "target": PRETRAINED_DIR / "aodnet_official.pth",
        "architecture": Path(BASELINES_DIR) / "AOD_Net.py",
        "class_name": "AODnet",
        "upstream": "https://github.com/weberwcwei/AODnet-by-pytorch",
    },
    "lightdehazenet": {
        "url": "https://raw.githubusercontent.com/hayatkhan8660-maker/Light-DehazeNet/main/trained_weights/trained_LDNet.pth",
        "sha256": "513145696fb22a831c45c0ad0f863d05f0265d157deb8fb57e5cb1fc4fdc7e9e",
        "size": 125557,
        "target": PRETRAINED_DIR / "lightdehazenet_official.pth",
        "architecture": Path(BASELINES_DIR) / "Light-DehazeNet.py",
        "class_name": "LightDehaze_Net",
        "upstream": "https://github.com/hayatkhan8660-maker/Light-DehazeNet",
    },
}


def _download(url: str, target: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "ClearLens-model-installer/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response, target.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_architecture(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import model architecture at {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _safe_aod_state(path: Path) -> dict[str, torch.Tensor]:
    # This legacy checkpoint serializes an AODnet object. Map its one custom
    # pickle global to the local, reviewed architecture and use the restricted
    # unpickler; never use unrestricted torch.load on downloaded files.
    module = _load_architecture("model", Path(AUXILIARY_SOURCES["aodnet"]["architecture"]))
    managed_weights._ALLOWED[("model", "AODnet")] = module.AODnet
    try:
        model = managed_weights._restricted_load(str(path))
    except Exception as exc:
        raise RuntimeError(f"Could not safely read the AOD-Net checkpoint: {exc}") from exc
    if not isinstance(model, torch.nn.Module):
        raise RuntimeError("The AOD-Net checkpoint did not contain a model object.")
    state = model.state_dict()
    target = module.AODnet()
    target.load_state_dict(state, strict=True)
    return state


def _safe_light_state(path: Path) -> dict[str, torch.Tensor]:
    module = _load_architecture("Light_DehazeNet", Path(AUXILIARY_SOURCES["lightdehazenet"]["architecture"]))
    try:
        state = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise RuntimeError(f"Could not safely read the Light-DehazeNet checkpoint: {exc}") from exc
    if isinstance(state, dict):
        for key in ("state_dict", "model_state_dict", "model"):
            if isinstance(state.get(key), dict):
                state = state[key]
                break
    if not isinstance(state, dict):
        raise RuntimeError("The Light-DehazeNet checkpoint does not contain a state_dict.")
    cleaned = OrderedDict(
        (key.removeprefix("module."), value)
        for key, value in state.items()
        if isinstance(key, str) and isinstance(value, torch.Tensor)
    )
    module.LightDehaze_Net().load_state_dict(cleaned, strict=True)
    return cleaned


def install_auxiliary(name: str) -> Path:
    source = AUXILIARY_SOURCES[name]
    PRETRAINED_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"clearlens_{name}_") as temp_dir:
        original = Path(temp_dir) / f"{name}.pth"
        _download(source["url"], original)
        if original.stat().st_size != source["size"] or _sha256(original) != source["sha256"]:
            raise RuntimeError(f"Checksum or size mismatch for {name}; checkpoint was rejected.")

        state = _safe_aod_state(original) if name == "aodnet" else _safe_light_state(original)
        payload = {
            "state_dict": state,
            "meta": {
                "model": name,
                "source": source["upstream"],
                "sha256": source["sha256"],
                "license": "Upstream repository does not publish a license file.",
            },
        }
        temporary = source["target"].with_suffix(".pth.tmp")
        torch.save(payload, temporary)
        os.replace(temporary, source["target"])
    print(f"Installed {name} ({source['size']:,} bytes) at {source['target']}")
    return source["target"]


def main() -> None:
    choices = sorted(set(SPECS) | set(AUXILIARY_SOURCES))
    parser = argparse.ArgumentParser(description="Download and verify ClearLens dehazing checkpoints.")
    parser.add_argument("models", nargs="*", choices=choices, help="Model IDs; omit to install all catalog weights.")
    parser.add_argument("--all", action="store_true", help="Install every configured model checkpoint.")
    args = parser.parse_args()
    selected = choices if args.all or not args.models else args.models

    for name in selected:
        if name in SPECS:
            path = managed_weights.ensure(name)
            print(f"Installed {name} at {path}")
        else:
            install_auxiliary(name)


if __name__ == "__main__":
    main()
