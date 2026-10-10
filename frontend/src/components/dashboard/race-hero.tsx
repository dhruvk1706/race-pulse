"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WeekendSession } from "@/lib/f1/weekend";
import { formatSessionDate, formatSessionTime, formatSessionTimestamp, SESSION_TIME_ZONE_LABEL, sessionStatusLabel } from "@/lib/f1/weekend";
import { Badge } from "@/components/ui/badge";
import { handleTabKeyDown } from "@/components/ui/keyboard-tabs";
import type { WeekendState } from "./use-weekend";
import { WeekendMessage } from "./weekend-message";

export function RaceHero({ weekend, selected, onSelectSession }: { weekend: WeekendState; selected?: WeekendSession; onSelectSession: (key: number) => void }) {
  const meeting = weekend.data?.meeting;
  const sessions = weekend.data?.sessions ?? [];
  const meetings = weekend.data?.meetings ?? [];
  const meetingIndex = meetings.findIndex((item) => item.meetingKey === meeting?.meetingKey);
  const previous = meetings[meetingIndex - 1];
  const next = meetings[meetingIndex + 1];
  const ready = !weekend.loading && !weekend.error && selected;

  return (
    <section className={`race-hero ${meeting?.country === "Japan" ? "japan" : ""}`} id="race-weekend" aria-label={`${meeting?.name ?? "F1"} race weekend`}>
      <div className="hero-image" aria-hidden="true" />
      <button className="race-edge-arrow race-edge-previous" aria-label="Previous race" title={previous?.name ?? "No earlier race available"} disabled={!previous || weekend.loading} onClick={() => weekend.selectMeeting(previous.meetingKey)}><ChevronLeft aria-hidden="true" preserveAspectRatio="none" /></button>
      <button className="race-edge-arrow race-edge-next" aria-label="Next race" title={next?.name ?? "No later race available"} disabled={!next || weekend.loading} onClick={() => weekend.selectMeeting(next.meetingKey)}><ChevronRight aria-hidden="true" preserveAspectRatio="none" /></button>
      <div className="hero-main">
        <div className="race-intro"><span className="race-round">{meeting ? meeting.year + " SEASON" : "RACE WEEKEND"}</span><h1>{meeting?.name ?? "Race Weekend"}</h1><div className="race-location">{meeting?.country === "Japan" && <span className="japan-flag" aria-label="Japan flag" />}<span>{meeting?.circuit ?? ""}</span>{meeting && <><span className="location-separator">|</span><span>{meeting.location}, {meeting.country}</span></>}</div></div>
        {ready ? <div className="race-progress">
          <div className="lap-summary"><Badge variant={selected.status === "completed" ? "complete" : selected.status} className="hero-badge">{sessionStatusLabel[selected.status]}</Badge><span className="race-state">{formatSessionDate(selected.startTime)}</span><span className="hero-stat-label">SESSION</span><strong className="lap-count weekend-session-name">{selected.name.toUpperCase()}</strong></div>
          <svg className="telemetry-graphic" viewBox="0 0 94 92" aria-hidden="true"><path d="M2 82H92M23 2V88M2 47H84M30 2V48H70M8 76l16 8 8-5 7 8 12-7 4 6 19-2" /><path d="M17 84V65m5 19V68m5 17V72m5 13V71m5 15V73m5 14V76m5 9V70m5 14V74m5 10V77" /></svg>
          <div className="session-summary"><span className="hero-stat-label">SELECTED SESSION</span><span className={`session-indicator ${selected.status === "live" ? "" : selected.status === "completed" ? "finished" : "upcoming"}`} /><span className="hero-stat-label remaining-label">START TIME · {SESSION_TIME_ZONE_LABEL}</span><strong><time dateTime={selected.startTime} title={formatSessionTimestamp(selected.startTime)}>{formatSessionTime(selected.startTime)}</time></strong></div>
        </div> : <WeekendMessage weekend={weekend} />}
      </div>
      <div className="session-tabs" role="tablist" aria-label="Race weekend sessions">{ready && sessions.map((item, index) => <button key={item.sessionKey} role="tab" tabIndex={selected.sessionKey === item.sessionKey ? 0 : -1} onKeyDown={(event) => handleTabKeyDown(event, index, sessions.map((session) => session.sessionKey), onSelectSession)} aria-selected={selected.sessionKey === item.sessionKey} className={selected.sessionKey === item.sessionKey ? "selected" : ""} onClick={() => onSelectSession(item.sessionKey)}>{item.name.toUpperCase()}</button>)}</div>
    </section>
  );
}
