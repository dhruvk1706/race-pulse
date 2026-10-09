import { CloudRain, Droplet, ThermometerSun, Wind } from "lucide-react";
import type { SessionSnapshot } from "@/lib/f1/dashboard";
import { formatSessionTimestamp } from "@/lib/f1/weekend";

export function RaceConditions({ navigationOpen, snapshot }: { navigationOpen: boolean; snapshot: SessionSnapshot | null }) {
  const weather = snapshot?.weather;
  const value = (input: number | null | undefined, unit: string) => input == null ? "—" : `${input}${unit}`;
  return <footer inert={navigationOpen} id="race-conditions" className="conditions-bar" aria-label="Recorded session conditions"><div><span className="condition-label">RECORDED SESSION CONDITIONS</span><p>{weather ? formatSessionTimestamp(weather.date) : "Weather data unavailable"} · OpenF1</p></div><div className="condition-stat"><ThermometerSun size={21} /><div><span className="condition-label">Air / Track</span><span>{value(weather?.air, "°C")} / {value(weather?.track, "°C")}</span></div></div><div className="condition-stat"><Droplet size={21} /><div><span className="condition-label">Humidity</span><span>{value(weather?.humidity, "%")}</span></div></div><div className="condition-stat"><Wind size={21} /><div><span className="condition-label">Wind</span><span>{value(weather?.wind, " m/s")}</span></div></div><div className="condition-stat"><CloudRain size={21} /><div><span className="condition-label">Rainfall</span><span>{weather?.rainfall == null ? "—" : weather.rainfall ? "Rain" : "Dry"}</span></div></div></footer>;
}
