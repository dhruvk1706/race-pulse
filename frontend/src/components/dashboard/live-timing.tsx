"use client";
import { ArrowRight, Timer } from "lucide-react";
import { useState } from "react";
import type { SessionSnapshot, TimingEntry } from "@/lib/f1/dashboard";
import { formatSessionTimestamp } from "@/lib/f1/weekend";
import { Panel } from "@/components/ui/panel";
import { Modal } from "@/components/ui/modal";

export function TimingTable({ entries }: { entries: TimingEntry[] }) {
  return <div className="timing-table-scroll"><table className="timing-table"><thead><tr><th scope="col">POS</th><th scope="col">DRIVER</th><th scope="col">TEAM</th><th scope="col">GAP</th><th scope="col">BEST LAP</th><th scope="col">LAPS</th><th scope="col">STATUS</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.fullName}><td className="position-cell">{entry.position || "—"}</td><th scope="row" className="driver-cell" title={entry.fullName}>{entry.driver}</th><td><span className="team-mark" style={{ "--team-color": entry.teamColor } as React.CSSProperties} role="img" aria-label={entry.team}><i /><i /></span></td><td className="numeric">{entry.gap}</td><td className="numeric">{entry.bestLap}</td><td>{entry.laps ?? "—"}</td><td>{entry.status}</td></tr>)}</tbody></table></div>;
}
export function LiveTiming({ snapshot, loading, upcoming = false }: { snapshot: SessionSnapshot | null; loading: boolean; upcoming?: boolean }) {
  const [fullTiming, setFullTiming] = useState(false);
  const label = snapshot ? `${snapshot.circuit} · ${snapshot.name}` : "Session results";
  return <><Panel id="live-timing" title="SESSION RESULTS" icon={Timer} className="live-timing-panel" action={<button className="text-action" disabled={!snapshot?.timing.length} onClick={() => setFullTiming(true)}>View Full Timing <ArrowRight size={16} /></button>}>
    <p className="real-data-meta">{snapshot ? `${label} · Completed session · ${formatSessionTimestamp(snapshot.date)} · OpenF1` : loading ? "Loading session results…" : upcoming ? "This session has not started yet. Results appear once it is completed." : "Session data unavailable. Try refreshing."}</p>
    {snapshot?.timing.length ? <TimingTable entries={snapshot.timing.slice(0, 10)} /> : snapshot && <p className="data-empty">Results have not been published or could not be loaded.</p>}
  </Panel><Modal title={label} open={fullTiming} onClose={() => setFullTiming(false)}><p className="detail-meta">Completed session · OpenF1{snapshot && ` · ${formatSessionTimestamp(snapshot.date)}`}</p><TimingTable entries={snapshot?.timing ?? []} /></Modal></>;
}
