"use client";

import { Trophy } from "lucide-react";
import type { DashboardResponse } from "@/lib/f1/dashboard";
import { handleTabKeyDown } from "@/components/ui/keyboard-tabs";
import { Panel } from "@/components/ui/panel";

export function Championship({ mode, onModeChange, data }: { mode: "Drivers" | "Teams"; onModeChange: (mode: "Drivers" | "Teams") => void; data: DashboardResponse | null }) {
  const standings = (mode === "Drivers" ? data?.drivers : data?.teams) ?? [];
  const maxPoints = Math.max(1, ...standings.map((entry) => entry.points));
  return <Panel id="championship" title="CHAMPIONSHIP SNAPSHOT" icon={Trophy} className="championship-panel">
    <p className="real-data-meta">{data?.standingsSeason ? `${data.standingsSeason} · After round ${data.standingsRound ?? "—"}` : "Championship standings"}</p>
    <div className="standings-tabs" role="tablist" aria-label="Championship standings">{(["Drivers", "Teams"] as const).map((tab, index) => <button key={tab} role="tab" tabIndex={mode === tab ? 0 : -1} onKeyDown={(event) => handleTabKeyDown(event, index, ["Drivers", "Teams"] as const, onModeChange)} aria-selected={mode === tab} className={mode === tab ? "selected" : ""} onClick={() => onModeChange(tab)}>{tab}</button>)}</div>
    {standings.length ? <ol className={`standings-list ${mode === "Teams" ? "team-standings" : ""}`}>{standings.map((entry) => <li key={entry.name}><span className="standing-position">{entry.position}</span><span className="standing-slash" style={{ background: entry.color }} /><span className="standing-name" title={entry.name}>{entry.name}</span><span className="standing-track"><span style={{ width: `${entry.points / maxPoints * 100}%`, background: entry.color }} /></span><span className="standing-points"><strong>{entry.points}</strong> PTS</span></li>)}</ol> : <p className="data-empty">{data ? `${mode} standings unavailable. Try refreshing.` : "Loading standings…"}</p>}
  </Panel>;
}
