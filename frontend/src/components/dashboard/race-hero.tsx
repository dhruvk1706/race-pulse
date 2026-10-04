"use client";

import { useState } from "react";
import { raceWeekend, upcomingSessions } from "@/data/dashboard";
import { handleTabKeyDown } from "@/components/ui/keyboard-tabs";
import { Badge } from "@/components/ui/badge";

export function RaceHero() {
  const [session, setSession] = useState<string>("Race");
  const selected = upcomingSessions.find((item) => item.name === session)!;
  const isRace = session === "Race";

  return (
    <section className="race-hero" id="race-weekend" aria-label="Japanese Grand Prix race weekend">
      <div className="hero-image" aria-hidden="true" />
      <div className="hero-main">
        <div className="race-intro"><span className="race-round">ROUND {raceWeekend.round}</span><h1>{raceWeekend.name}</h1><div className="race-location"><span className="japan-flag" aria-label="Japan flag" /><span>{raceWeekend.circuit}</span><span className="location-separator">|</span><span>{raceWeekend.location}</span></div></div>
        <div className="race-progress">
          <div className="lap-summary"><Badge variant={isRace ? "live" : "complete"} className="hero-badge">{isRace ? "LIVE" : "COMPLETE"}</Badge><span className="race-state">{selected.result}</span><span className="hero-stat-label">{isRace ? "LAP" : "SESSION"}</span><strong className={`lap-count ${isRace ? "" : "completed-session"}`}>{isRace ? `${raceWeekend.lap} / ${raceWeekend.totalLaps}` : session.toUpperCase()}</strong></div>
          <svg className="telemetry-graphic" viewBox="0 0 94 92" aria-hidden="true"><path d="M2 82H92M23 2V88M2 47H84M30 2V48H70M8 76l16 8 8-5 7 8 12-7 4 6 19-2" /><path d="M17 84V65m5 19V68m5 17V72m5 13V71m5 15V73m5 14V76m5 9V70m5 14V74m5 10V77" /></svg>
          <div className="session-summary"><span className="hero-stat-label">CURRENT SESSION</span><span className={`session-indicator ${isRace ? "" : "finished"}`} /><span className="hero-stat-label remaining-label">{isRace ? "TIME REMAINING" : "START TIME"}</span><strong>{isRace ? raceWeekend.timeRemaining : selected.time.split(" – ")[0]}</strong></div>
        </div>
      </div>
      <div className="session-tabs" role="tablist" aria-label="Race weekend sessions">{raceWeekend.sessions.map((item, index) => <button key={item} role="tab" tabIndex={session === item ? 0 : -1} onKeyDown={(event) => handleTabKeyDown(event, index, raceWeekend.sessions, setSession)} aria-selected={session === item} className={session === item ? "selected" : ""} onClick={() => setSession(item)}>{item.toUpperCase()}</button>)}</div>
    </section>
  );
}
