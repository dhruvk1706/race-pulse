"use client";

import { useEffect, useState } from "react";
import type { DashboardResponse } from "@/lib/f1/dashboard";

export function useRaceData(sessionKey?: number) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    setData(null);
    setError(null);
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/f1/dashboard${sessionKey ? `?sessionKey=${sessionKey}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Data request failed");
        const next: DashboardResponse = await response.json();
        if (!controller.signal.aborted) { setData(next); setError(null); }
      } catch {
        if (!controller.signal.aborted) setError("Unable to refresh race data. Please retry.");
      } finally { pending = false; }
    }
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [attempt, sessionKey]);
  return { data, error, retry: () => setAttempt((value) => value + 1) };
}
