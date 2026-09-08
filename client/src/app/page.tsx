"use client";

import { useState } from "react";

/**
 * Minimal demo page wiring the browser to the Fastify backend:
 *   1. login via  /api/v1/auth/login      (sets the JWT cookie)
 *   2. upload a hazy image to /api/v1/ml/dehaze (multipart)
 *   3. render the returned PNG data-URL.
 *
 * The backend URL can be overridden with NEXT_PUBLIC_API_URL.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MODELS = [
  { id: "dehamer", label: "Dehamer (Swin-Transformer U-Net)" },
  { id: "aod", label: "AOD-Net" },
  { id: "light_dehaze", label: "Light-DehazeNet" },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState("dehamer");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    setAuthMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAuthMessage(body.message ?? "Login failed.");
        return;
      }
      setLoggedIn(true);
      setAuthMessage(`Signed in as ${body.fullName}`);
    } catch (err) {
      setAuthMessage(`Cannot reach the backend at ${API_BASE}: ${String(err)}`);
    }
  };

  const onFileChange = (file: File | null) => {
    setSelectedFile(file);
    setResultUrl(null);
    setResultMeta(null);
    setError("");
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const dehaze = async () => {
    if (!selectedFile) return;
    setBusy(true);
    setError("");
    setResultUrl(null);
    setResultMeta(null);
    try {
      const form = new FormData();
      form.append("model", selectedModel);
      form.append("image", selectedFile, selectedFile.name);

      const res = await fetch(`${API_BASE}/api/v1/ml/dehaze`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? `Request failed (HTTP ${res.status}).`);
        if (res.status === 401) setLoggedIn(false);
        return;
      }
      setResultUrl(body.data.outputImage);
      setResultMeta(
        `model=${body.data.model} · input=${body.data.inputSize}px · ` +
          `output=${body.data.outputWidth}×${body.data.outputHeight} · ` +
          `inference=${body.data.inferenceMs}ms · ` +
          `weights=${body.data.weightsState}`
      );
    } catch (err) {
      setError(`Request failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-8 flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Image De-hazing</h1>
      <p className="text-sm opacity-70">
        Backend: <code>{API_BASE}</code> · Flow: upload → Fastify →
        preprocessing → PyTorch model → response
      </p>

      <section className="card bg-base-200 p-6">
        <h2 className="text-xl font-semibold mb-2">1 · Sign in</h2>
        {!loggedIn ? (
          <div className="flex gap-2 items-end">
            <label className="flex flex-col text-sm">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered"
              />
            </label>
            <label className="flex flex-col text-sm">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered"
              />
            </label>
            <button className="btn btn-primary" onClick={login}>
              Sign in
            </button>
          </div>
        ) : (
          <p className="text-success font-medium">{authMessage}</p>
        )}
        {!loggedIn && authMessage && (
          <p className="text-sm text-error">{authMessage}</p>
        )}
      </section>

      <section className="card bg-base-200 p-6">
        <h2 className="text-xl font-semibold mb-2">2 · De-haze an image</h2>
        <div className="flex gap-3 items-end">
          <label className="flex flex-col text-sm">
            Hazy image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="file-input file-input-bordered"
            />
          </label>
          <label className="flex flex-col text-sm">
            Model
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="select select-bordered"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-primary"
            disabled={!selectedFile || busy || !loggedIn}
            onClick={dehaze}
          >
            {busy ? "De-hazing…" : "De-haze"}
          </button>
        </div>
        {!loggedIn && (
          <p className="text-sm text-error mt-2">Please sign in first.</p>
        )}
        {error && <p className="text-sm text-error mt-2">{error}</p>}
        {resultMeta && <p className="mt-2 text-sm opacity-80">{resultMeta}</p>}

        <div className="grid grid-cols-2 gap-4 mt-4">
          {previewUrl && (
            <figure>
              <figcaption className="text-sm">Input (hazy)</figcaption>
              <img
                src={previewUrl}
                alt="hazy input"
                className="rounded-md border"
              />
            </figure>
          )}
          {resultUrl && (
            <figure>
              <figcaption className="text-sm">Output (de-hazed)</figcaption>
              <img
                src={resultUrl}
                alt="dehazed output"
                className="rounded-md border"
              />
            </figure>
          )}
        </div>
      </section>
    </main>
  );
}