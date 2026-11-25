# Model Inventory and Replacement Scope

This inventory was recorded before changing the active model selection.

## Existing project model

The project-local model currently exposed as `aod` is implemented and trained in this repository:

- `ML/baselines/AOD_Net.py` defines `AODnet`.
- `ML/training/train_aod.py` trains that architecture and writes `ML/checkpoints/aod_best.pt` by default.
- `ML/checkpoints/aod_best.pt` is the existing checkpoint in this checkout. It is 11,141 bytes.
- `ML/inference_service/model_loader.py` builds and loads the `aod` entry.
- `ML/inference_service/inference.py` calls the selected model.
- `ML/inference_service/preprocess.py` and `postprocess.py` provide the shared RGB, tensor, crop, and PNG pipeline.
- `server/src/controllers/ml.controller.js` validates model identifiers and upload requests; `server/src/lib/ml.service.js` forwards images to the inference service.
- `client/src/components/studio/ModelPicker.tsx` and `client/src/app/(app)/studio/studio-workspace.tsx` expose selection and the upload, compare, and download flow.

The AOD architecture, training script, and checkpoint are kept intact. The current request replaces the active catalog/default with one pretrained open-source option; it does not require deleting or rewriting these source artifacts.

## Open-source model work already present in the checkout

These files were already modified or untracked before this request and are retained as-is unless a later implementation change explicitly uses them:

- `ML/baselines/DehazeFormer/dehazeformer.py` and its `LICENSE`.
- `ML/inference_service/dehazers/specs.py` and `weights.py`, which contain metadata and checkpoint verification/conversion helpers for DehazeFormer, FFA-Net, and MSBDN-DFF.
- `ML/third_party/FFA_Net/ffa.py` and `ML/third_party/MSBDN_DFF/` model definitions.
- The current modified registry in `ML/inference_service/model_loader.py` also contains DehazeFormer aliases, but those aliases do not yet load the separate verified checkpoint helper.

No converted open-source checkpoint exists in `ML/checkpoints/pretrained/` in the current checkout. The one checkpoint present is `aod_best.pt` above.

## Active dehazing model

The active model is the user-selected `AVC2-UESTC/DRNet-AiO` 3-task DRNet dehazing model. Its official implementation is present under `ML/third_party/DRNet-AiO/`, and its dehazing checkpoint is installed locally at `ML/checkpoints/DRNet_3tasks.pth` (ignored by Git due to its size). The inference service applies the upstream `dehaze` prompt and requires the pretrained weights; it never falls back to random weights. Only this dehazing option is exposed in the API and frontend.

The AOD source, training implementation, and checkpoint listed above remain intact on disk. Other experimental model files that were already in the working tree are retained but not registered or selectable.

The upstream README displays an MIT license badge, but the fetched repository revision does not contain the referenced `LICENSE` file. The code is integrated at the user's explicit direction, but the repository's license terms could not be independently verified from a license text; confirm with the authors before redistributing commercially.

## Dehamer (CVPR 2022)

Official implementation: https://github.com/Li-Chongyi/Dehamer (MIT; `ML/baselines/DeHamer/LICENSE`).
`ML/baselines/DeHamer/` mirrors upstream `src/` (`MIRNet.py` was restored to the upstream file so the
official checkpoints load strictly). The official RESIDE-OTS checkpoint is registered as `dehamer` (file `ML/checkpoints/pretrained/dehamer_outdoor.pt`);
install it with `npm run weights:dehamer`
(`ML/inference_service/download_dehamer_weights.py`).
