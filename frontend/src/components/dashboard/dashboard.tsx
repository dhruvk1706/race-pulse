"use client";

import { useCallback, useEffect, useState } from "react";
import { AskStrategist } from "./ask-strategist";
import { LiveTiming } from "./live-timing";
import { StrategyAlerts } from "./strategy-alerts";
import { StrategyReplay } from "./strategy-replay";
import { TrackMap } from "./track-map";
import { LatestNews } from "./latest-news";
import { Championship } from "./championship";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RaceHero } from "./race-hero";
import { UpcomingSessions } from "./upcoming-sessions";
import { RaceConditions } from "./race-conditions";
import { useRaceData } from "./use-race-data";
import { useStrategy } from "./use-strategy";
import { useTrack } from "./use-track";
import { useWeekend } from "./use-weekend";
import type { WeekendResponse } from "@/lib/f1/weekend";

export function Dashboard({ initialWeekend }: { initialWeekend: WeekendResponse | null }) {
  const weekend = useWeekend(initialWeekend);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const sessions = weekend.data?.sessions ?? [];
  const selected = sessions.find((item) => item.sessionKey === sessionKey)
    ?? sessions.find((item) => item.status === "live")
    ?? sessions.find((item) => item.status === "upcoming")
    ?? sessions[sessions.length - 1];
  const race = useRaceData(selected?.sessionKey);
  const snapshot = race.data?.snapshot ?? null;
  // Strategy replay: completed races and sprints only (sprints are type "Race" too).
  const isRace = selected?.type === "Race";
  const replayKey = isRace && selected.status === "completed" ? selected.sessionKey : undefined;
  const strategyNote = !selected ? null : !isRace ? "Strategy is available for races and sprints." : replayKey ? null : "Strategy appears once the race is completed.";
  const [scrub, setScrub] = useState<{ key: number; lap: number } | null>(null);
  const [lapQuery, setLapQuery] = useState<{ key: number; lap: number } | null>(null);
  // Debounce the scrubber so dragging doesn't fire one OpenF1-backed request per lap.
  useEffect(() => { const timer = window.setTimeout(() => setLapQuery(scrub), 250); return () => window.clearTimeout(timer); }, [scrub]);
  const scrubLap = scrub && scrub.key === replayKey ? scrub.lap : undefined;
  const queryLap = lapQuery && lapQuery.key === replayKey ? lapQuery.lap : undefined;
  const strategy = useStrategy(replayKey, queryLap);
  // The strategist answers for the lap the scrubber shows (the final lap until it is moved).
  const askTarget = replayKey && strategy.data ? { sessionKey: replayKey, lap: scrubLap ?? strategy.data.totalLaps } : null;
  const track = useTrack(snapshot?.sessionKey, snapshot?.sessionKey === replayKey ? queryLap : undefined);
  const loading = !race.data && !race.error;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [standingsMode, setStandingsMode] = useState<"Drivers" | "Teams">("Drivers");
  const closeNavigation = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="dashboard-shell" id="dashboard">
      <a className="skip-link" href="#dashboard-content">Skip to dashboard</a>
      <Sidebar open={sidebarOpen} onClose={closeNavigation} onNavigate={(_, label) => {
        if (label === "Drivers" || label === "Teams") setStandingsMode(label);
      }} />
      <Topbar navigationOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} meeting={weekend.data?.meeting ?? null} data={race.data} />
      <main inert={sidebarOpen} id="dashboard-content" className={`dashboard-content${replayKey ? " has-replay" : ""}`}>
        <RaceHero weekend={weekend} selected={selected} onSelectSession={setSessionKey} />
        <div className="race-data-summary"><div className="real-data-status" role="status"><span>{race.error ?? (race.data ? `Real data · Updated ${new Date(race.data.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST` : "Fetching real race data…")}</span><button className="text-action" onClick={race.retry}>Refresh data</button></div>
        {race.data && [...race.data.errors, ...(snapshot?.errors ?? [])].length > 0 && <p className="real-data-meta">{[...race.data.errors, ...(snapshot?.errors ?? [])].join(" ")}</p>}
        </div>
        <div className="primary-grid">
          <LiveTiming snapshot={snapshot} loading={loading} upcoming={selected?.status === "upcoming"} />
          <StrategyAlerts snapshot={snapshot} loading={loading} strategy={strategy} note={strategyNote} action={<AskStrategist target={askTarget} session={selected && snapshot ? `${snapshot.circuit} · ${selected.name}` : selected?.name} />} />
          <TrackMap snapshot={snapshot} track={track.data} failed={track.failed} loading={loading} />
        </div>
        {replayKey && <StrategyReplay data={strategy.data} failed={strategy.failed} lap={scrubLap} onLapChange={(lap) => setScrub({ key: replayKey, lap })} />}
        <div className="secondary-grid">
          <LatestNews news={race.data?.news ?? []} loading={loading} />
          <Championship mode={standingsMode} onModeChange={setStandingsMode} data={race.data} />
          <UpcomingSessions weekend={weekend} />
        </div>
      </main>
      <RaceConditions navigationOpen={sidebarOpen} snapshot={snapshot} />
    </div>
  );
}
