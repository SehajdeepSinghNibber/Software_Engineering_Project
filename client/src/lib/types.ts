/** Shared domain types mirroring the Fastify backend contracts. */

export type User = {
  _id: string;
  email: string;
  fullName: string;
  profilePic: string;
  createdAt?: string;
  updatedAt?: string;
};

/** One entry of GET /api/v1/ml/models -> data.models[]. */
export type ModelInfo = {
  name: string;
  description: string;
  defaultSize: number;
  /** Input dimension must be divisible by this factor. */
  divisible: number;
  /** Input normalisation applied by the inference service. */
  norm: "01" | "11" | "auto";
  weightsState: "trained" | "partial" | "untrained";
  device: "cpu" | "cuda";
};

/** GET /api/v1/ml/models -> data. */
export type ModelsResponse = {
  models: ModelInfo[];
};

/** GET /api/v1/ml/health -> data. */
export type ServiceHealth = {
  status: string;
  uptimeSeconds: number;
  model: string;
  defaultSize: number;
  models: string[];
};

/** POST /api/v1/ml/dehaze -> data. */
export type DehazeResult = {
  contentType: string;
  /** PNG as a data URL (data:image/png;base64,...). */
  outputImage: string;
  model: string;
  inputSize: number;
  outputWidth: number;
  outputHeight: number;
  inferenceMs: number;
  weightsState: string;
  processedAt: string;
};

/** Client-side run record (kept in localStorage — the backend is stateless). */
export type HistoryEntry = {
  id: string;
  createdAt: string;
  inputName: string;
  model: string;
  inputSize: number;
  outputWidth: number;
  outputHeight: number;
  inferenceMs: number;
  weightsState: string;
  inputThumb: string;
  outputThumb: string;
};