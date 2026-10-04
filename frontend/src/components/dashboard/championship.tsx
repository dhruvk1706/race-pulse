"use client";

import { Trophy } from "lucide-react";
import { driverStandings, teamStandings } from "@/data/dashboard";
import { handleTabKeyDown } from "@/components/ui/keyboard-tabs";
import { Panel } from "@/components/ui/panel";

export function Championship({ mode, onModeChange }: { mode: "Drivers" | "Teams"; onModeChange: (mode: "Drivers" | "Teams") => void }) {
  const standings = mode === "Drivers" ? driverStandings : teamStandings;
  const maxPoints = mode === "Drivers" ? 100 : 145;
  return <Panel id="championship" title="CHAMPIONSHIP SNAPSHOT" icon={Trophy} className="championship-panel"><div className="standings-tabs" role="tablist" aria-label="Championship standings">{(["Drivers", "Teams"] as const).map((tab, index) => <button key={tab} role="tab" tabIndex={mode === tab ? 0 : -1} onKeyDown={(event) => handleTabKeyDown(event, index, ["Drivers", "Teams"] as const, onModeChange)} aria-selected={mode === tab} className={mode === tab ? "selected" : ""} onClick={() => onModeChange(tab)}>{tab}</button>)}</div><ol className={`standings-list ${mode === "Teams" ? "team-standings" : ""}`}>{standings.map((entry, index) => <li key={entry.name}><span className="standing-position">{index + 1}</span><span className="standing-slash" style={{ background: ["#ff2938", "#1986cf", "#f5ab39", "#f25636", "#ff2938"][index] }} /><span className="standing-name">{entry.name}</span><span className="standing-track"><span style={{ width: `${entry.points / maxPoints * 100}%`, background: entry.color }} /></span><span className="standing-points"><strong>{entry.points}</strong> PTS</span></li>)}</ol></Panel>;
}
