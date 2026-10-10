"use client";

import { useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import type { SessionSnapshot } from "@/lib/f1/dashboard";
import type { StrategyAlert, StrategyResponse } from "@/lib/f1/strategy";
import { formatSessionTimestamp } from "@/lib/f1/weekend";
import { Panel } from "@/components/ui/panel";
import { handleTabKeyDown } from "@/components/ui/keyboard-tabs";

const TABS = ["Strategy", "Race control"] as const;
type Tab = (typeof TABS)[number];

const KIND: Record<StrategyAlert["kind"], { label: string; tone: string }> = {
  pit_window: { label: "Pit window", tone: "" },
  undercut: { label: "Undercut", tone: "red" },
  cheap_stop: { label: "Cheap stop", tone: "amber" },
  overcut: { label: "Overcut", tone: "neutral" },
};

interface StrategyState { data: StrategyResponse | null; failed: boolean; updating: boolean }

export function StrategyAlerts({ snapshot, loading, strategy, note, action }: { snapshot: SessionSnapshot | null; loading: boolean; strategy: StrategyState; note: string | null; action?: ReactNode }) {
  const [tab, setTab] = useState<Tab>("Strategy");
  const data = strategy.data;
  const meta = note || !data ? (snapshot ? `${snapshot.circuit} · ${snapshot.name}` : "")
    : `Lap ${data.lap}/${data.totalLaps} · ${data.safetyCar ? `${data.safetyCar} deployed` : "Green flag"} · Pit loss ${data.pitLoss === null ? "unavailable" : `~${data.pitLoss}s${data.safetyCar ? " (reduced under " + data.safetyCar + ")" : ""}`}${strategy.updating ? " · Updating…" : ""}`;

  return <Panel id="strategy-alerts" title="STRATEGY ALERTS" icon={TriangleAlert} className="strategy-panel" action={action}>
    <div className="standings-tabs panel-tabs" role="tablist" aria-label="Strategy alerts and race control">{TABS.map((item, index) => <button key={item} id={`strategy-tab-${index}`} role="tab" aria-controls="strategy-tabpanel" tabIndex={tab === item ? 0 : -1} onKeyDown={(event) => handleTabKeyDown(event, index, TABS, setTab)} aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    <div id="strategy-tabpanel" role="tabpanel" aria-labelledby={`strategy-tab-${TABS.indexOf(tab)}`} className="strategy-tabpanel">
      {tab === "Strategy" ? <>
        <p className="real-data-meta" aria-live="polite">{meta}</p>
        <div className="alerts-list real-alerts">{note ? <p className="data-empty">{note}</p>
          : data?.alerts.length ? data.alerts.map((alert, index) => <article className={`strategy-alert ${KIND[alert.kind].tone}`} key={`${alert.kind}-${alert.driver}-${index}`}><div className="alert-content"><div className="alert-meta"><span className="strategy-action">{KIND[alert.kind].label}</span></div><h3>{alert.message}</h3></div></article>)
          : <p className="data-empty">{strategy.failed ? "Strategy data unavailable." : data ? `No strategy calls at lap ${data.lap}.` : "Loading strategy…"}</p>}</div>
      </> : <>
        <p className="real-data-meta">{snapshot ? `${snapshot.circuit} · ${snapshot.name} · Completed session` : ""}</p>
        <div className="alerts-list real-alerts">{snapshot?.messages.length ? snapshot.messages.map((message, index) => <article className="strategy-alert neutral" key={`${message.date}-${index}`}><div className="alert-content"><div className="alert-meta"><span className="strategy-action">{message.category}</span></div><h3>{message.message}</h3><p>{formatSessionTimestamp(message.date)}</p></div></article>) : <p className="data-empty">{loading ? "Loading race-control messages…" : snapshot?.errors.some((error) => error.startsWith("Race-control")) || !snapshot ? "Race-control data unavailable." : "No race-control messages for this session."}</p>}</div>
      </>}
    </div>
  </Panel>;
}
