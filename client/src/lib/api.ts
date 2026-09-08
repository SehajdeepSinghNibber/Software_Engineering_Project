/**
 * Typed HTTP client for the Fastify backend.
 *
 * Every call sends credentials (the session lives in a JWT cookie) and every
 * failure is normalised into ApiError, so pages can render the backend's own
 * messages instead of guessing.
 */
import type {
  DehazeResult,
  ModelsResponse,
  ServiceHealth,
  User,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

type RequestOptions = RequestInit & { timeoutMs?: number };

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body?.message ?? `Request failed (HTTP ${res.status}).`;
  } catch {
    return `Request failed (HTTP ${res.status}).`;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      signal: controller.signal,
      ...init,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "The request timed out. Please try again.");
    }
    throw new ApiError(0, `Cannot reach the server at ${API_BASE}.`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const authApi = {
  signup: (payload: { fullName: string; email: string; password: string }) =>
    request<User>("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<User>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  signout: () =>
    request<{ message: string }>("/api/v1/auth/signout", { method: "POST" }),

  check: () => request<User>("/api/v1/auth/check"),

  updateProfile: (profilePic: string) =>
    request<User>("/api/v1/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profilePic }),
    }),
};

/* ------------------------------------------------------------------ */
/* ML                                                                  */
/* ------------------------------------------------------------------ */

export const mlApi = {
  health: () =>
    request<{ success: true; data: ServiceHealth }>("/api/v1/ml/health", {
      timeoutMs: 15_000,
    }),

  models: () =>
    request<{ success: true; data: ModelsResponse }>("/api/v1/ml/models", {
      timeoutMs: 15_000,
    }),

  /** De-haze an image. `size` is optional — omit it to use the model default. */
  dehaze: (payload: { file: File; model: string; size?: number }) => {
    const form = new FormData();
    form.append("image", payload.file, payload.file.name);
    form.append("model", payload.model);
    if (payload.size) form.append("size", String(payload.size));

    // Inference on CPU can take a while for large inputs; allow 3 minutes.
    return request<{ success: true; data: DehazeResult }>(
      "/api/v1/ml/dehaze",
      { method: "POST", body: form, timeoutMs: 180_000 },
    );
  },
};