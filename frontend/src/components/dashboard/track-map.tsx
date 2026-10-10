import { Route } from "lucide-react";
import type { SessionSnapshot } from "@/lib/f1/dashboard";
import type { TrackResponse } from "@/lib/f1/track";
import { formatSessionTimestamp } from "@/lib/f1/weekend";
import { Panel } from "@/components/ui/panel";

export function TrackMap({ snapshot, track, failed, loading }: { snapshot: SessionSnapshot | null; track: TrackResponse | null; failed: boolean; loading: boolean }) {
  const points = track ? [...track.outline, ...track.cars.map((car): [number, number] => [car.x, car.y])] : [];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const pad = 600;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) + pad - minX;
  const height = Math.max(...ys) + pad - minY;
  // Screen y grows downward, track y grows upward.
  const flip = (y: number) => minY + height - (y - minY);
  return <Panel id="track-map" title="TRACK POSITIONS" icon={Route} className="track-map-panel">
    <p className="real-data-meta">{snapshot ? `${snapshot.circuit} · ${snapshot.name} · Historical` : ""}</p>
    {track ? <div className="track-map-content">
      <svg viewBox={`${minX} ${minY} ${width} ${height}`} role="img" aria-label={`Car positions at ${snapshot?.circuit ?? "the circuit"}, historical`} style={{ width: "100%", maxHeight: 260 }}>
        <polyline points={track.outline.map(([x, y]) => `${x},${flip(y)}`).join(" ")} fill="none" stroke="#3a3f47" strokeWidth={260} strokeLinejoin="round" strokeLinecap="round" />
        {track.cars.map((car) => {
          const entry = snapshot?.timing.find((t) => t.driver === car.driver);
          const podium = !!entry && entry.position <= 3;
          return <g key={car.driver}>
            <title>{entry?.fullName ?? car.driver}</title>
            <circle cx={car.x} cy={flip(car.y)} r={230} fill={car.teamColor} stroke="#0b0d10" strokeWidth={40} />
            {podium && <text x={car.x} y={flip(car.y) - width / 22} fill="#e5e7e9" fontSize={width / 22} textAnchor="middle">{car.driver}</text>}
          </g>;
        })}
      </svg>
      <p className="real-data-meta">Historical · leader completes lap {track.lap} · {formatSessionTimestamp(track.date)}</p>
    </div> : <p className="data-empty">{failed ? "Historical track positions unavailable." : loading || snapshot ? "Loading track positions…" : "Track positions appear once a session is completed."}</p>}
  </Panel>;
}
