"use client";

import { useEffect, useState } from "react";
import type { TrackResponse } from "@/lib/f1/track";

// Historical positions never change, so fetch once per (session, lap); no polling.
export function useTrack(sessionKey?: number, lap?: number) {
  const [state, setState] = useState<{ key?: number; data: TrackResponse | null; failed: boolean }>({ data: null, failed: false });
  useEffect(() => {
    if (!sessionKey) return;
    const controller = new AbortController();
    fetch(`/api/f1/track?sessionKey=${sessionKey}${lap ? `&lap=${lap}` : ""}`, { cache: "no-store", signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Track request failed"); return response.json() as Promise<TrackResponse>; })
      .then((data) => setState({ key: sessionKey, data, failed: false }))
      .catch(() => { if (!controller.signal.aborted) setState({ key: sessionKey, data: null, failed: true }); });
    return () => controller.abort();
  }, [sessionKey, lap]);
  const current = state.key === sessionKey;
  return { data: current ? state.data : null, failed: current && state.failed };
}
