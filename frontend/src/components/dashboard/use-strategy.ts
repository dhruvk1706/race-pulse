"use client";

import { useEffect, useState } from "react";
import type { StrategyResponse } from "@/lib/f1/strategy";

// Completed races never change, so fetch once per (session, lap); no polling.
// The previous lap's data stays visible while the next lap loads.
export function useStrategy(sessionKey?: number, lap?: number) {
  const [state, setState] = useState<{ key?: number; data: StrategyResponse | null; failed: boolean }>({ data: null, failed: false });
  useEffect(() => {
    if (!sessionKey) return;
    const controller = new AbortController();
    fetch(`/api/f1/strategy?sessionKey=${sessionKey}${lap ? `&lap=${lap}` : ""}`, { cache: "no-store", signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Strategy request failed"); return response.json() as Promise<StrategyResponse>; })
      .then((data) => setState({ key: sessionKey, data, failed: false }))
      .catch(() => { if (!controller.signal.aborted) setState({ key: sessionKey, data: null, failed: true }); });
    return () => controller.abort();
  }, [sessionKey, lap]);
  const current = state.key === sessionKey;
  const data = current ? state.data : null;
  return { data, failed: current && state.failed, updating: !!data && data.lap !== (lap ?? data.totalLaps) };
}
