import { Route } from "lucide-react";
import { Panel } from "@/components/ui/panel";

export function TrackMap() {
  return <Panel id="track-map" title="TRACK POSITIONS" icon={Route} className="track-map-panel"><div className="data-empty"><p>Live car positions unavailable.</p><p>Live telemetry requires a connected OpenF1 subscription. Completed-session results are shown in Session Results.</p></div></Panel>;
}
