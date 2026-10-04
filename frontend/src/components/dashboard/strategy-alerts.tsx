import { CircleDot, Crosshair, Timer, TriangleAlert, Wrench } from "lucide-react";
import { strategyAlerts } from "@/data/dashboard";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

function UndercutIcon() {
  return <div className="undercut-icon" aria-hidden="true"><Wrench size={32} /><Wrench size={32} /></div>;
}

export function StrategyAlerts() {
  return <Panel id="strategy-alerts" title="STRATEGY ALERTS" icon={Timer} className="strategy-panel" action={<Badge>3 NEW</Badge>}><div className="alerts-list">{strategyAlerts.map((alert) => <article className={`strategy-alert ${alert.color}`} key={alert.id}><div className="alert-icon">{alert.kind === "undercut" ? <UndercutIcon /> : alert.kind === "pit-stop" ? <div className="pit-icon"><CircleDot size={35} strokeWidth={2.8} /><Crosshair size={21} /></div> : <TriangleAlert size={36} strokeWidth={2.1} />}</div><div className="alert-content"><div className="alert-title"><h3>{alert.title}</h3><span>{alert.age}</span></div><p>{alert.description}</p></div></article>)}</div></Panel>;
}
