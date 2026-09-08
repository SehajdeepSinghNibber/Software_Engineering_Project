"use client";

import { useCallback, useEffect, useState } from "react";

import { mlApi } from "@/lib/api";
import type { ModelInfo, ServiceHealth } from "@/lib/types";

type UseModelsResult = {
  /** null while loading, [] when the call succeeded but returned nothing. */
  models: ModelInfo[] | null;
  health: ServiceHealth | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type CatalogSnapshot = {
  models: ModelInfo[] | null;
  health: ServiceHealth | null;
  error: string | null;
};

/** Fetches catalog + health in parallel; the two calls are independent. */
async function fetchCatalog(): Promise<CatalogSnapshot> {
  const [modelsResult, healthResult] = await Promise.allSettled([
    mlApi.models(),
    mlApi.health(),
  ]);
  return {
    models:
      modelsResult.status === "fulfilled" ? modelsResult.value.data.models : null,
    health:
      healthResult.status === "fulfilled" ? healthResult.value.data : null,
    error:
      modelsResult.status === "rejected"
        ? modelsResult.reason instanceof Error
          ? modelsResult.reason.message
          : "The model catalog is unavailable."
        : null,
  };
}

/**
 * Loads the live model catalog and service health. A health failure does not
 * hide the catalog and vice versa.
 */
export function useModels(): UseModelsResult {
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((next: CatalogSnapshot) => {
    setModels(next.models);
    setHealth(next.health);
    setError(next.error);
    setLoading(false);
  }, []);

  // Initial load. The async boundary keeps the first client render identical
  // to the server's (both show the loading state).
  useEffect(() => {
    let ignore = false;
    void (async () => {
      const next = await fetchCatalog();
      if (!ignore) apply(next);
    })();
    return () => {
      ignore = true;
    };
  }, [apply]);

  /** Manual re-fetch (retry buttons). Shows the loading state again. */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    apply(await fetchCatalog());
  }, [apply]);

  return { models, health, loading, error, reload };
}