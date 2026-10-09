"use client";

import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { formatSessionDate, formatSessionTimeRange, formatSessionTimestamp, SESSION_TIME_ZONE, SESSION_TIME_ZONE_LABEL, sessionStatusLabel } from "@/lib/f1/weekend";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import type { WeekendState } from "./use-weekend";
import { WeekendMessage } from "./weekend-message";

function SessionList({ weekend }: { weekend: WeekendState }) {
  if (weekend.loading || weekend.error || !weekend.data?.sessions.length) return <WeekendMessage weekend={weekend} />;
  return <div className="upcoming-list">{weekend.data.sessions.map((session) => <div className={`upcoming-session ${session.status === "live" ? "is-live" : ""}`} key={session.sessionKey}><strong>{session.name}</strong><time className="session-date" dateTime={session.startTime} title={formatSessionTimestamp(session.startTime)}>{formatSessionDate(session.startTime)}</time><span className="session-time">{formatSessionTimeRange(session)}</span><Badge variant={session.status === "completed" ? "complete" : session.status}>{session.status === "completed" && <Check size={12} strokeWidth={2} />}{sessionStatusLabel[session.status]}</Badge></div>)}</div>;
}

export function UpcomingSessions({ weekend }: { weekend: WeekendState }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const meeting = weekend.data?.meeting;
  return <><Panel id="upcoming-sessions" title="WEEKEND SESSIONS" icon={CalendarDays} className="upcoming-panel" action={<button className="text-action" onClick={() => setShowSchedule(true)}>Full Schedule <ArrowRight size={16} /></button>}><SessionList weekend={weekend} /></Panel><Modal title={`${meeting?.name ?? "Race Weekend"} · Weekend Schedule`} open={showSchedule} onClose={() => setShowSchedule(false)}><p className="detail-meta">{meeting ? meeting.circuit + " · " : ""}ALL TIMES {SESSION_TIME_ZONE_LABEL} · {SESSION_TIME_ZONE}</p><SessionList weekend={weekend} /></Modal></>;
}
