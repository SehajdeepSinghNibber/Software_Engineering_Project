"""Central configuration for the ML inference service.

All settings can be overridden through environment variables. Every variable
is optional; sensible defaults are provided so the service can run out of the
box during development.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    # Optional fallback parser if python-dotenv is not installed
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.isfile(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Runtime configuration for the inference service."""

    host: str = os.getenv("ML_HOST", "127.0.0.1")
    port: int = int(os.getenv("ML_PORT", "8100"))
    #: Default model used by POST /predict when no "model" field is given.
    default_model: str = os.getenv("ML_MODEL_TYPE", "drnet").strip().lower()
    #: Optional path to a trained checkpoint (weights *.pt / *.pth file).
    model_path: str | None = os.getenv("ML_MODEL_PATH") or None
    #: Square input size (must be divisible per-model, e.g. 8 for dehamer).
    input_size: int = int(os.getenv("ML_INPUT_SIZE", "256"))
    #: Input normalization: "auto" (per-model default), "01" ([0, 1]) or "11" ([-1, 1]).
    input_norm: str = os.getenv("ML_INPUT_NORM", "auto").strip().lower()
    #: Torch device: "auto", "cpu" or "cuda".
    device: str = os.getenv("ML_DEVICE", "auto").strip().lower()
    #: Maximum accepted upload size for a single image in megabytes.
    max_upload_mb: int = int(os.getenv("ML_MAX_UPLOAD_MB", "10"))
    #: Keep loaded models in memory between requests (recommended for production).
    model_cache: bool = _env_bool("ML_MODEL_CACHE", True)


settings = Settings()


def validate() -> None:
    """Validate configuration and abort early with a clear message."""
    if settings.input_size < 1:
        raise ValueError("ML_INPUT_SIZE must be a positive integer")
    if settings.input_norm not in {"auto", "01", "11"}:
        raise ValueError("ML_INPUT_NORM must be 'auto', '01' or '11'")
    if settings.device not in {"auto", "cpu", "cuda"}:
        raise ValueError("ML_DEVICE must be 'auto', 'cpu' or 'cuda'")
