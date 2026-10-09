import { TriangleAlert } from "lucide-react";
import type { SessionSnapshot } from "@/lib/f1/dashboard";
import { formatSessionTimestamp } from "@/lib/f1/weekend";
import { Panel } from "@/components/ui/panel";

export function StrategyAlerts({ snapshot, loading }: { snapshot: SessionSnapshot | null; loading: boolean }) {
  return <Panel id="strategy-alerts" title="RACE CONTROL" icon={TriangleAlert} className="strategy-panel">
    <p className="real-data-meta">{snapshot ? `${snapshot.circuit} · ${snapshot.name} · Completed session` : "OpenF1"}</p>
    <div className="alerts-list real-alerts">{snapshot?.messages.length ? snapshot.messages.map((message, index) => <article className="strategy-alert neutral" key={`${message.date}-${index}`}><div className="alert-content"><div className="alert-meta"><span className="strategy-action">{message.category}</span></div><h3>{message.message}</h3><p>{formatSessionTimestamp(message.date)}</p></div></article>) : <p className="data-empty">{loading ? "Loading race-control messages…" : snapshot?.errors.some((error) => error.startsWith("Race-control")) || !snapshot ? "Race-control data unavailable." : "No race-control messages for this session."}</p>}</div>
  </Panel>;
}
