export interface TimingEntry {
  position: number;
  driver: string;
  fullName: string;
  team: string;
  teamColor: string;
  gap: string;
  bestLap: string;
  laps: number | null;
  status: string;
}

export interface Standing {
  position: number;
  name: string;
  points: number;
  color: string;
}

export interface NewsStory {
  title: string;
  url: string;
  publishedAt: string;
}

export interface SessionSnapshot {
  name: string;
  circuit: string;
  date: string;
  sessionKey: number;
  timing: TimingEntry[];
  messages: { date: string; message: string; category: string }[];
  weather: { date: string; air: number | null; track: number | null; humidity: number | null; wind: number | null; rainfall: number | null } | null;
  errors: string[];
}

export interface DashboardResponse {
  fetchedAt: string;
  snapshot: SessionSnapshot | null;
  drivers: Standing[];
  teams: Standing[];
  standingsSeason: string | null;
  standingsRound: string | null;
  news: NewsStory[];
  errors: string[];
}
