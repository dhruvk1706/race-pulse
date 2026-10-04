"use client";

import { ArrowRight, Timer } from "lucide-react";
import { useId, useState } from "react";
import { timing, raceWeekend, type TimingEntry } from "@/data/dashboard";
import { Panel } from "@/components/ui/panel";
import { Modal } from "@/components/ui/modal";

function Sparkline({ entry }: { entry: TimingEntry }) {
  const gradientId = useId();
  const points = entry.pace.map((value, index) => `${index * 7},${value}`).join(" ");
  return <svg className="pace-sparkline" viewBox="0 0 80 20" role="img" aria-label={`${entry.driver} recent lap pace`}><defs><linearGradient id={gradientId}><stop stopColor={entry.paceColor} /><stop offset="1" stopColor={entry.paceColor} stopOpacity="0.3" /></linearGradient></defs><polyline points={points} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.1" />{entry.pace.map((value, index) => <circle key={index} cx={index * 7} cy={value} r="1.35" fill={entry.paceColor} opacity={index === entry.pace.length - 1 ? 0.4 : 1} />)}</svg>;
}

export function TimingTable({ entries }: { entries: TimingEntry[] }) {
  return <div className="timing-table-scroll"><table className="timing-table"><thead><tr><th scope="col">POS</th><th scope="col">DRIVER</th><th scope="col">TEAM</th><th scope="col">TYRE</th><th scope="col">GAP</th><th scope="col">LAST LAP</th><th scope="col">PACE</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.position}><td className="position-cell">{entry.position}</td><th scope="row" className="driver-cell">{entry.driver}</th><td><span className="team-mark" style={{ "--team-color": entry.teamColor } as React.CSSProperties} role="img" aria-label={entry.team}><i /><i /></span></td><td><span className={`tyre tyre-${entry.tyre.toLowerCase()}`} aria-label={`${entry.tyre === "S" ? "Soft" : entry.tyre === "M" ? "Medium" : "Hard"} tyres`}>{entry.tyre}</span></td><td className="numeric">{entry.gap}</td><td className="numeric">{entry.lastLap}</td><td><Sparkline entry={entry} /></td></tr>)}</tbody></table></div>;
}

export function LiveTiming() {
  const [fullTiming, setFullTiming] = useState(false);
  return <><Panel id="live-timing" title="LIVE TIMING" icon={Timer} className="live-timing-panel" subtitle={<span className="timing-subtitle"><i /> RACE <span>|</span> LAP {raceWeekend.lap} / {raceWeekend.totalLaps}</span>} action={<button className="text-action" onClick={() => setFullTiming(true)}>View Full Timing <ArrowRight size={16} /></button>}><TimingTable entries={timing.slice(0, 10)} /></Panel><Modal title="Live Timing · Japanese Grand Prix" open={fullTiming} onClose={() => setFullTiming(false)}><p className="detail-meta">RACE · LAP 18 / 53</p><TimingTable entries={timing} /></Modal></>;
}
