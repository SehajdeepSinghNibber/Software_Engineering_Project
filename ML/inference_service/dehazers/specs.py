"""Static metadata for the open-source pretrained dehazing models.

Every entry points at the *official* repository and the *official* checkpoint
published by the paper's authors (Google Drive file ids taken from each
repository's README). ``source_sha256`` pins the exact file that was verified
when this integration was written, so a tampered or changed download is
rejected before anything is deserialised.

Nothing in this module (or this package) touches the project's own model
(``aod`` in ``model_loader.py``).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class WeightsSource:
    """Where the official checkpoint comes from and how to verify it."""

    gdrive_id: str
    filename: str  # name of the original file as published
    sha256: str
    size_bytes: int
    #: "state_dict" -> torch.save({"state_dict"/"model": OrderedDict})
    #: "pickled_module" -> torch.save(nn.Module) (legacy whole-model pickle)
    fmt: str
    #: key that wraps the state_dict inside the checkpoint dict, if any
    state_key: str | None = None


@dataclass(frozen=True)
class ModelSpec:
    id: str
    display_name: str
    architecture: str
    description: str
    paper: str
    year: int
    repo: str
    license: str
    license_note: str
    trained_on: str
    params_millions: float
    #: Longest image side fed to the network when the request gives no size.
    default_max_side: int
    #: Input is reflect-padded to a multiple of this before the forward pass.
    pad_multiple: int
    #: Human readable value range the network consumes.
    input_range: str
    weights: WeightsSource
    #: Published SOTS-outdoor PSNR (dB) from the paper, for the UI.
    reported_psnr: float | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)


SPECS: dict[str, ModelSpec] = {
    "dehazeformer_b_outdoor": ModelSpec(
        id="dehazeformer_b_outdoor",
        display_name="DehazeFormer-B",
        architecture="Swin-style vision transformer U-Net with RescaleNorm, "
        "SK fusion and soft reconstruction (5 stages, 24-48-96 channels)",
        description="Transformer dehazer from Song et al. (IEEE TIP 2023). "
        "Official RESIDE-Outdoor (OTS) checkpoint — the strongest of the "
        "integrated open-source models on outdoor photographs.",
        paper="Song, Zhou, Qian, Du — Vision Transformers for Single Image "
        "Dehazing, IEEE TIP 2023",
        year=2023,
        repo="https://github.com/IDKiro/DehazeFormer",
        license="MIT",
        license_note="MIT license (Copyright (c) 2022 IDKiro). Code and "
        "weights may be used and redistributed with the notice retained.",
        trained_on="RESIDE OTS (outdoor)",
        params_millions=2.51,
        default_max_side=768,
        pad_multiple=4,
        input_range="[-1, 1]",
        reported_psnr=34.95,
        tags=("transformer", "recommended"),
        weights=WeightsSource(
            gdrive_id="1w6239qHuA0Wlr-f-Mm-9sOgYfyZnxYAj",
            filename="outdoor/dehazeformer-b.pth",
            sha256="1cf1ba0f20515c492214f8a813a6de70dafc81b539e7d3337a40b00d63fc6f6c",
            size_bytes=11229929,
            fmt="state_dict",
            state_key="state_dict",
        ),
    ),
    "ffa_net_outdoor": ModelSpec(
        id="ffa_net_outdoor",
        display_name="FFA-Net",
        architecture="Feature-fusion attention CNN: 3 groups x 19 blocks "
        "with channel + pixel attention, full resolution (64 channels)",
        description="Feature Fusion Attention Network (Qin et al., AAAI "
        "2020). Official RESIDE-Outdoor checkpoint. High quality but heavy: "
        "it never downsamples, so it is slow on CPU.",
        paper="Qin, Wang, Bai, Xie, Jia — FFA-Net: Feature Fusion Attention "
        "Network for Single Image Dehazing, AAAI 2020",
        year=2020,
        repo="https://github.com/zhilin007/FFA-Net",
        license="No license published",
        license_note="The upstream repository has no LICENSE file, so all "
        "rights are reserved by the authors. Used for research/evaluation "
        "only; weights are downloaded on demand and never committed.",
        trained_on="RESIDE OTS (outdoor)",
        params_millions=4.46,
        default_max_side=384,
        pad_multiple=1,
        input_range="ImageNet-style mean/std (0.64,0.60,0.58 / 0.14,0.15,0.152)",
        reported_psnr=33.57,
        tags=("cnn", "attention"),
        weights=WeightsSource(
            gdrive_id="1EGIJADl24Om3Hv7_bJVMPiqU1Dd0kg3b",
            filename="ots_train_ffa_3_19.pk",
            sha256="1c80e4ad4f4e8ae82ca773b66cbe47fd85ea78375e0a7f503b2585ed54da7723",
            size_bytes=26622389,
            fmt="state_dict",
            state_key="model",
        ),
    ),
    "msbdn_dff": ModelSpec(
        id="msbdn_dff",
        display_name="MSBDN-DFF",
        architecture="Multi-scale boosted encoder-decoder (4 strided levels) "
        "with dense feature fusion and 18 bottleneck residual blocks",
        description="Multi-Scale Boosted Dehazing Network with Dense Feature "
        "Fusion (Dong et al., CVPR 2020). Official RESIDE checkpoint; fast "
        "U-Net-like model.",
        paper="Dong, Pan, Xiang, Hu, Zhang, Wang, Yang — Multi-Scale Boosted "
        "Dehazing Network with Dense Feature Fusion, CVPR 2020",
        year=2020,
        repo="https://github.com/BookerDeWitt/MSBDN-DFF",
        license="No license published",
        license_note="The upstream repository has no LICENSE file, so all "
        "rights are reserved by the authors. Used for research/evaluation "
        "only; weights are downloaded on demand and never committed.",
        trained_on="RESIDE (ITS + OTS)",
        params_millions=31.35,
        default_max_side=1024,
        pad_multiple=16,
        input_range="[0, 1]",
        reported_psnr=33.48,
        tags=("cnn", "multi-scale"),
        weights=WeightsSource(
            gdrive_id="1da13IOlJ3FQfH6Duj_u1exmZzgXPaYXe",
            filename="model.pkl",
            sha256="126bf8efd37e1683011077cb8e1079cd6f1b2a3a3343a05dd49c9d012382af23",
            size_bytes=125584260,
            fmt="pickled_module",
        ),
    ),
}
