"use client";

import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { upcomingSessions } from "@/data/dashboard";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

function SessionList() {
  return <div className="upcoming-list">{upcomingSessions.map((session) => <div className={`upcoming-session ${session.status === "Live" ? "is-live" : ""}`} key={session.name}><strong>{session.name}</strong><span className="session-date">{session.date}</span><span className="session-time">{session.time}</span><Badge variant={session.status === "Live" ? "live" : "complete"}>{session.status === "Complete" ? <><Check size={12} strokeWidth={2} />Complete</> : "LIVE"}</Badge></div>)}</div>;
}

export function UpcomingSessions() {
  const [showSchedule, setShowSchedule] = useState(false);
  return <><Panel id="upcoming-sessions" title="UPCOMING SESSIONS" icon={CalendarDays} className="upcoming-panel" action={<button className="text-action" onClick={() => setShowSchedule(true)}>Full Schedule <ArrowRight size={16} /></button>}><SessionList /></Panel><Modal title="Japanese Grand Prix · Weekend Schedule" open={showSchedule} onClose={() => setShowSchedule(false)}><p className="detail-meta">SUZUKA · APRIL 4 – 6 · ALL TIMES UTC</p><SessionList /></Modal></>;
}
