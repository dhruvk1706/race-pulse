"use client";

import { useCallback, useState } from "react";
import { LiveTiming } from "./live-timing";
import { StrategyAlerts } from "./strategy-alerts";
import { TrackMap } from "./track-map";
import { LatestNews } from "./latest-news";
import { Championship } from "./championship";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RaceHero } from "./race-hero";
import { UpcomingSessions } from "./upcoming-sessions";
import { RaceConditions } from "./race-conditions";
import { useRaceData } from "./use-race-data";
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
      <main inert={sidebarOpen} id="dashboard-content" className="dashboard-content">
        <RaceHero weekend={weekend} selected={selected} onSelectSession={setSessionKey} />
        <div className="race-data-summary"><div className="real-data-status" role="status"><span>{race.error ?? (race.data ? `Real data · Updated ${new Date(race.data.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST` : "Fetching real race data…")}</span><button className="text-action" onClick={race.retry}>Refresh data</button></div>
        {race.data && [...race.data.errors, ...(snapshot?.errors ?? [])].length > 0 && <p className="real-data-meta">{[...race.data.errors, ...(snapshot?.errors ?? [])].join(" ")}</p>}
        </div>
        <div className="primary-grid">
          <LiveTiming snapshot={snapshot} loading={loading} upcoming={selected?.status === "upcoming"} />
          <StrategyAlerts snapshot={snapshot} loading={loading} />
          <TrackMap />
        </div>
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
