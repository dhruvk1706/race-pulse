"use client";

import { useState } from "react";
import { ChartLine } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compoundColor, formatLapTime, type DriverStrategy, type StrategyResponse } from "@/lib/f1/strategy";
import { Panel } from "@/components/ui/panel";

const MAX_DRIVERS = 3;
const AXIS = { stroke: "#3a4753", tick: { fill: "#96a1ae", fontSize: 12 } };
const TOOLTIP = { contentStyle: { background: "#11171c", border: "1px solid #202930", borderRadius: 6, color: "#f0f1f3", fontSize: 13 }, labelStyle: { color: "#96a1ae" } };

export function StrategyReplay({ data, failed, lap, onLapChange }: { data: StrategyResponse | null; failed: boolean; lap?: number; onLapChange: (lap: number) => void }) {
  const [picked, setPicked] = useState<{ key: number; drivers: string[] } | null>(null);
  if (!data) return <Panel id="strategy-replay" title="STRATEGY REPLAY" icon={ChartLine} className="strategy-replay-panel">
    <p className="data-empty">{failed ? "Strategy data unavailable." : "Loading strategy replay…"}</p>
  </Panel>;

  const value = lap ?? data.totalLaps;
  // Default: the top three at the selected lap; an explicit pick sticks for the session.
  const chosen = picked?.key === data.sessionKey ? picked.drivers : data.drivers.filter((driver) => driver.position).slice(0, MAX_DRIVERS).map((driver) => driver.driver);
  const series = data.drivers.filter((driver) => chosen.includes(driver.driver));
  const toggle = (name: string) => setPicked({ key: data.sessionKey, drivers: chosen.includes(name) ? chosen.filter((item) => item !== name) : [...chosen, name] });

  return <Panel id="strategy-replay" title="STRATEGY REPLAY" icon={ChartLine} className="strategy-replay-panel">
    <div className="lap-scrubber">
      <label htmlFor="lap-scrubber">Lap</label>
      <input id="lap-scrubber" type="range" min={1} max={data.totalLaps} step={1} value={value} aria-valuetext={`Lap ${value} of ${data.totalLaps}`} onChange={(event) => onLapChange(Number(event.target.value))} />
      <output htmlFor="lap-scrubber">{value} / {data.totalLaps}</output>
    </div>
    <div className="driver-picker" role="group" aria-label={`Drivers to compare, up to ${MAX_DRIVERS}`}>{data.drivers.map((driver) => {
      const on = chosen.includes(driver.driver);
      return <button key={driver.driver} type="button" aria-pressed={on} disabled={!on && chosen.length >= MAX_DRIVERS} onClick={() => toggle(driver.driver)}><span className="team-swatch" style={{ background: driver.teamColor }} aria-hidden="true" />{driver.driver}</button>;
    })}</div>
    <div className="strategy-charts">
      <LapTimeChart data={data} series={series} />
      <DegChart series={series} />
    </div>
  </Panel>;
}

function LapTimeChart({ data, series }: { data: StrategyResponse; series: DriverStrategy[] }) {
  const byLap = new Map<number, Record<string, number>>();
  for (const driver of series) for (const stint of driver.stints) for (const [lap, seconds] of stint.laps) byLap.set(lap, { ...byLap.get(lap), lap, [driver.driver]: seconds });
  const rows = [...byLap.values()].sort((a, b) => a.lap - b.lap);
  // One-lap stints can leak a very slow lap (e.g. 234 s); cap the axis so it doesn't flatten the rest.
  const fastest = Math.min(...series.flatMap((driver) => driver.stints.flatMap((stint) => stint.laps.map(([, seconds]) => seconds))));
  const ceiling = fastest * 1.1;
  const summary = `Fuel-corrected clean lap times up to lap ${data.lap}; laps slower than ${formatLapTime(ceiling)} are off the chart. ` + (series.length ? series.map((driver) => {
    const times = driver.stints.flatMap((stint) => stint.laps);
    return times.length ? `${driver.driver}: ${times.length} clean laps, best ${formatLapTime(Math.min(...times.map(([, t]) => t)))}, latest ${formatLapTime(times[times.length - 1][1])}.` : `${driver.driver}: no clean laps yet.`;
  }).join(" ") : "No drivers selected.");
  // Teammates share a colour, so the second one is dashed.
  const dashed = new Set(series.filter((driver, index) => series.findIndex((other) => other.teamColor === driver.teamColor) < index).map((driver) => driver.driver));
  return <figure className="strategy-chart">
    <figcaption>Lap time <span>fuel-corrected, clean laps</span></figcaption>
    <div role="img" aria-label={summary} className="chart-frame">{rows.length ? <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid stroke="#1c242a" vertical={false} />
        <XAxis dataKey="lap" type="number" domain={[1, Math.max(data.lap, 2)]} allowDecimals={false} {...AXIS} />
        <YAxis domain={["dataMin - 0.5", (max: number) => Math.min(max + 0.5, ceiling)]} allowDataOverflow tickFormatter={formatLapTime} width={52} {...AXIS} />
        <Tooltip {...TOOLTIP} labelFormatter={(lap) => `Lap ${lap}`} formatter={(seconds) => formatLapTime(Number(seconds))} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(name) => <span style={{ color: "#96a1ae" }}>{name}</span>} />
        {series.map((driver) => <Line key={driver.driver} dataKey={driver.driver} stroke={driver.teamColor} strokeWidth={2} strokeDasharray={dashed.has(driver.driver) ? "5 3" : undefined} dot={false} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer> : <p className="data-empty">{series.length ? `No clean laps by lap ${data.lap}.` : "Pick a driver to compare."}</p>}</div>
  </figure>;
}

function DegChart({ series }: { series: DriverStrategy[] }) {
  const stints = series.flatMap((driver) => driver.stints.map((stint, index) => ({ name: `${driver.driver} S${index + 1}`, compound: stint.compound, slope: stint.degSlope })));
  const rows = stints.filter((stint) => stint.slope !== null);
  const compounds = [...new Set(rows.map((row) => row.compound ?? "Unknown"))];
  const summary = "Tyre degradation per stint, seconds per lap of tyre age. " + (stints.length ? stints.map((stint) => `${stint.name} ${stint.compound?.toLowerCase() ?? "unknown compound"}: ${stint.slope === null ? "not enough clean laps" : `${stint.slope > 0 ? "+" : ""}${stint.slope.toFixed(3)} s/lap`}.`).join(" ") : "No drivers selected.");
  return <figure className="strategy-chart">
    <figcaption>Deg slope <span>s/lap by stint</span></figcaption>
    <div role="img" aria-label={summary} className="chart-frame">{rows.length ? <>
      <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 26 + 40)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#1c242a" horizontal={false} />
          <XAxis type="number" tickFormatter={(slope: number) => slope.toFixed(2)} {...AXIS} />
          <YAxis type="category" dataKey="name" width={64} {...AXIS} />
          <ReferenceLine x={0} stroke="#3a4753" />
          <Tooltip {...TOOLTIP} cursor={{ fill: "#ffffff08" }} formatter={(slope, _name, item) => [`${Number(slope).toFixed(3)} s/lap`, item.payload.compound ?? "Unknown compound"]} />
          <Bar dataKey="slope" barSize={14} radius={2} isAnimationActive={false}>{rows.map((row) => <Cell key={row.name} fill={compoundColor[row.compound ?? ""] ?? "#96a1ae"} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
      <ul className="compound-legend" aria-hidden="true">{compounds.map((compound) => <li key={compound}><span className="team-swatch" style={{ background: compoundColor[compound] ?? "#96a1ae" }} />{compound.toLowerCase()}</li>)}</ul>
    </> : <p className="data-empty">{series.length ? "Not enough clean laps to fit a slope yet." : "Pick a driver to compare."}</p>}</div>
  </figure>;
}
