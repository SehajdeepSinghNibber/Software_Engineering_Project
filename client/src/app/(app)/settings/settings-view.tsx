"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { useModels } from "@/hooks/useModels";
import { API_BASE, ApiError, authApi } from "@/lib/api";

const MAX_PHOTO_MB = 2;

export default function SettingsView() {
  const { user, setUser, signOut, refresh } = useSession();
  const router = useRouter();
  const { health } = useModels();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const savePhoto = async (dataUrl: string) => {
    setSavingPhoto(true);
    setPhotoError(null);
    setPhotoSaved(false);
    try {
      const updated = await authApi.updateProfile(dataUrl);
      setUser(updated);
      setPhotoSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) void refresh();
      setPhotoError(
        err instanceof ApiError ? err.message : "Could not update the photo. Please try again.",
      );
    } finally {
      setSavingPhoto(false);
    }
  };

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (selected.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Photos are limited to ${MAX_PHOTO_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") void savePhoto(reader.result);
    };
    reader.onerror = () => setPhotoError("Could not read the selected file.");
    reader.readAsDataURL(selected);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader title="Settings" description="Your profile and platform connection." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="rounded-box border border-base-300/70 bg-base-100 p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-base-content/50">
            Profile
          </h2>

          <div className="mt-5 flex items-center gap-4">
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight">{user.fullName}</p>
              <p className="mt-0.5 truncate text-sm text-base-content/55">{user.email}</p>
              {user.createdAt && (
                <p className="mt-0.5 text-xs text-base-content/45">
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={savingPhoto}
              className="btn btn-sm"
            >
              {savingPhoto && <span className="loading loading-spinner loading-xs" />}
              {savingPhoto ? "Uploading…" : "Change photo"}
            </button>
            {photoSaved && <span className="text-xs text-success">Profile photo updated.</span>}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={onPhotoChange}
          />
          <p className="mt-2 text-xs text-base-content/45">
            JPEG or PNG, up to {MAX_PHOTO_MB}MB. Stored via the platform&apos;s
            media pipeline.
          </p>
          {photoError && <Notice variant="error" className="mt-3">{photoError}</Notice>}
        </section>

        {/* Connection + session */}
        <div className="space-y-6">
          <section className="rounded-box border border-base-300/70 bg-base-100 p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-base-content/50">
              Connection
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-base-content/55">Backend API</dt>
                <dd className="truncate font-mono text-xs">{API_BASE}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-base-content/55">Inference service</dt>
                <dd className="flex items-center gap-2 text-xs font-medium">
                  <span
                    className={`h-2 w-2 rounded-full ${health ? "bg-success" : "bg-error"}`}
                    aria-hidden="true"
                  />
                  {health ? "Online" : "Offline"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-box border border-base-300/70 bg-base-100 p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-base-content/50">
              Session
            </h2>
            <p className="mt-3 text-sm text-base-content/60">
              Signing out ends the session in this browser and clears the
              session cookie.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn btn-outline btn-error btn-sm mt-4"
            >
              {signingOut && <span className="loading loading-spinner loading-xs" />}
              Sign out
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}