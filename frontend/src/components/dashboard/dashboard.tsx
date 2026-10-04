"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RaceHero } from "./race-hero";
import { LiveTiming } from "./live-timing";
import { StrategyAlerts } from "./strategy-alerts";
import { TrackMap } from "./track-map";
import { LatestNews } from "./latest-news";
import { Championship } from "./championship";
import { UpcomingSessions } from "./upcoming-sessions";
import { RaceConditions } from "./race-conditions";

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [standingsMode, setStandingsMode] = useState<"Drivers" | "Teams">("Drivers");

  const closeNavigation = useCallback(() => setSidebarOpen(false), []);

  return <div className="dashboard-shell" id="dashboard"><a className="skip-link" href="#dashboard-content">Skip to dashboard</a><Sidebar open={sidebarOpen} onClose={closeNavigation} onNavigate={(_, label) => { if (label === "Drivers" || label === "Teams") setStandingsMode(label); }} /><Topbar navigationOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} /><main inert={sidebarOpen} id="dashboard-content" className="dashboard-content"><RaceHero /><div className="primary-grid"><LiveTiming /><StrategyAlerts /><TrackMap /></div><div className="secondary-grid"><LatestNews /><Championship mode={standingsMode} onModeChange={setStandingsMode} /><UpcomingSessions /></div></main><RaceConditions navigationOpen={sidebarOpen} /></div>;
}
