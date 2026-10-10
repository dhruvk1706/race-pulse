"use client";

import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { formatSessionDate, formatSessionTimeRange, formatSessionTimestamp, SESSION_TIME_ZONE, SESSION_TIME_ZONE_LABEL, sessionStatusLabel } from "@/lib/f1/weekend";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import type { WeekendSession } from "@/lib/f1/weekend";
import { TimingTable } from "./live-timing";
import { useRaceData } from "./use-race-data";
import type { WeekendState } from "./use-weekend";
import { WeekendMessage } from "./weekend-message";

function SessionList({ weekend, onSelect }: { weekend: WeekendState; onSelect?: (session: WeekendSession) => void }) {
  if (weekend.loading || weekend.error || !weekend.data?.sessions.length) return <WeekendMessage weekend={weekend} />;
  return <div className="upcoming-list">{weekend.data.sessions.map((session) => { const Row = onSelect ? "button" : "div"; return <Row className={`upcoming-session ${session.status === "live" ? "is-live" : ""}${onSelect ? " is-clickable" : ""}`} key={session.sessionKey} {...(onSelect ? { type: "button" as const, onClick: () => onSelect(session) } : {})}><strong>{session.name}</strong><time className="session-date" dateTime={session.startTime} title={formatSessionTimestamp(session.startTime)}>{formatSessionDate(session.startTime)}</time><span className="session-time">{formatSessionTimeRange(session)}</span><Badge variant={session.status === "completed" ? "complete" : session.status}>{session.status === "completed" && <Check size={12} strokeWidth={2} />}{sessionStatusLabel[session.status]}</Badge></Row>; })}</div>;
}

function SessionResults({ session }: { session: WeekendSession }) {
  const { data, error } = useRaceData(session.sessionKey);
  const timing = data?.snapshot?.timing ?? [];
  if (session.status === "upcoming") return <p className="data-empty">This session has not started yet. Results appear once it is completed.</p>;
  if (error) return <p className="data-empty">{error}</p>;
  if (!data) return <p className="data-empty">Loading results…</p>;
  return timing.length ? <TimingTable entries={timing} /> : <p className="data-empty">Results have not been published or could not be loaded.</p>;
}

export function UpcomingSessions({ weekend }: { weekend: WeekendState }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [picked, setPicked] = useState<WeekendSession | null>(null);
  const meeting = weekend.data?.meeting;
  return <><Panel id="upcoming-sessions" title="WEEKEND SESSIONS" icon={CalendarDays} className="upcoming-panel" action={<button className="text-action" onClick={() => setShowSchedule(true)}>Full Schedule <ArrowRight size={16} /></button>}><SessionList weekend={weekend} onSelect={setPicked} /></Panel><Modal title={picked ? `${picked.name} · Results` : "Results"} open={!!picked} onClose={() => setPicked(null)}>{picked && <><p className="detail-meta">{meeting ? meeting.circuit + " · " : ""}{formatSessionTimestamp(picked.startTime)}</p><SessionResults session={picked} /></>}</Modal><Modal title={`${meeting?.name ?? "Race Weekend"} · Weekend Schedule`} open={showSchedule} onClose={() => setShowSchedule(false)}><p className="detail-meta">{meeting ? meeting.circuit + " · " : ""}ALL TIMES {SESSION_TIME_ZONE_LABEL} · {SESSION_TIME_ZONE}</p><SessionList weekend={weekend} /></Modal></>;
}
