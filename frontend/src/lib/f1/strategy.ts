export interface StintFit {
  startLap: number;
  endLap: number | null;
  compound: string | null;
  tyreAgeAtStart: number;
  degSlope: number | null;
  baseLap: number | null;
  laps: [number, number][];
}

export interface DriverStrategy {
  driver: string;
  teamColor: string;
  position: number | null;
  gapAhead: number | null;
  tyreAge: number;
  windowLap: number | null;
  windowOpen: boolean;
  stints: StintFit[];
}

export interface StrategyAlert {
  kind: "pit_window" | "cheap_stop" | "undercut" | "overcut";
  driver: string;
  rival: string | null;
  message: string;
}

export interface StrategyResponse {
  sessionKey: number;
  session: string;
  lap: number;
  totalLaps: number;
  safetyCar: "SC" | "VSC" | null;
  pitLoss: number | null;
  drivers: DriverStrategy[];
  alerts: StrategyAlert[];
}

// Pirelli's conventional sidewall colours; unknown compounds stay neutral.
export const compoundColor: Record<string, string> = {
  SOFT: "#ff2635",
  MEDIUM: "#ffd12e",
  HARD: "#f0f1f3",
  INTERMEDIATE: "#43b047",
  WET: "#2f7de1",
};

export function formatLapTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, "0")}`;
}
