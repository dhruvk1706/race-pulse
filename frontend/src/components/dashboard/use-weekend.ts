"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionStatus, type WeekendResponse } from "@/lib/f1/weekend";

export interface WeekendState {
  data: WeekendResponse | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  selectMeeting: (key: number | null) => void;
}

export function useWeekend(initialData: WeekendResponse | null): WeekendState {
  const [data, setData] = useState<WeekendResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [meetingKey, selectMeeting] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    setLoading(true);
    setError(null);

    async function load() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/f1/weekend${meetingKey === null ? "" : `?meetingKey=${meetingKey}`}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Weekend request failed");
        const next: WeekendResponse = await response.json();
        if (!controller.signal.aborted) {
          setData(next);
          setError(null);
        }
      } catch {
        if (!controller.signal.aborted) setError("Unable to load the race weekend. Please try again.");
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    const refresh = window.setInterval(() => void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(refresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [attempt, meetingKey]);

  useEffect(() => {
    if (!data) return;
    // Update at the next scheduled boundary without requesting telemetry.
    const now = Date.now();
    const nextBoundary = Math.min(...data.sessions.flatMap((session) => [Date.parse(session.startTime), Date.parse(session.endTime)]).filter((time) => time > now));
    if (!Number.isFinite(nextBoundary)) return;
    const timer = window.setTimeout(() => setData((current) => current && ({
      ...current,
      sessions: current.sessions.map((session) => ({ ...session, status: getSessionStatus(session.startTime, session.endTime) })),
    })), Math.min(nextBoundary - now + 1, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [data]);

  return { data, loading, error, retry, selectMeeting };
}
