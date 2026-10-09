import { createCache } from "./cache.js";
import { fetchOk, fetchOpenF1 } from "./http.js";

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

type Row = Record<string, unknown>;

function object(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid data record");
  return value as Row;
}
function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error("Invalid data list");
  return value.map(object);
}
function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function color(value: unknown): string {
  return typeof value === "string" && /^[a-f\d]{6}$/i.test(value) ? `#${value}` : "#aab0ba";
}
async function openF1(resource: string): Promise<Row[]> {
  return rows(await fetchOpenF1(resource));
}
function lap(value: unknown): string {
  const times = (Array.isArray(value) ? value : [value]).filter((item): item is number => typeof item === "number" && item > 0);
  if (!times.length) return "—";
  const milliseconds = Math.round(Math.min(...times) * 1000);
  return `${Math.floor(milliseconds / 60_000)}:${(milliseconds % 60_000 / 1000).toFixed(3).padStart(6, "0")}`;
}
function gap(value: unknown): string {
  const values = Array.isArray(value) ? value : [value];
  const last = values.filter((item) => item !== null && item !== undefined).at(-1);
  return typeof last === "number" ? last === 0 ? "—" : `+${last.toFixed(3)}` : typeof last === "string" ? last : "—";
}

function latestFinished(sessions: Row[]): Row | undefined {
  return sessions.filter((item) => item.is_cancelled !== true && Date.parse(String(item.date_end)) < Date.now())
    .sort((a, b) => Date.parse(String(b.date_end)) - Date.parse(String(a.date_end)))[0];
}

async function snapshot(requestedKey?: number): Promise<SessionSnapshot | null> {
  const year = new Date().getUTCFullYear();
  // Completed sessions only: historical data must never be labelled live.
  let session = latestFinished(await openF1(requestedKey ? `sessions?session_key=${requestedKey}` : `sessions?year=${year}`));
  if (!session && !requestedKey) session = latestFinished(await openF1(`sessions?year=${year - 1}`));
  if (!session) return null;
  const sessionKey = number(session.session_key);
  if (!sessionKey) throw new Error("Invalid session key");
  const query = `session_key=${sessionKey}`;
  const [results, driverRows, control, weatherRows] = await Promise.allSettled([
    openF1(`session_result?${query}`), openF1(`drivers?${query}`), openF1(`race_control?${query}`), openF1(`weather?${query}`),
  ]);
  const value = (result: PromiseSettledResult<Row[]>): Row[] => result.status === "fulfilled" ? result.value : [];
  const errors: string[] = [];
  if (results.status === "rejected" || driverRows.status === "rejected") errors.push("Session results unavailable.");
  if (control.status === "rejected") errors.push("Race-control messages unavailable.");
  if (weatherRows.status === "rejected") errors.push("Weather unavailable.");
  const drivers = value(driverRows);
  const weather = value(weatherRows).sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)))[0];
  const isRace = session.session_type === "Race";
  return {
    name: String(session.session_name), circuit: String(session.circuit_short_name), date: String(session.date_start), sessionKey,
    timing: value(results).map((result) => {
      const driver = drivers.find((item) => item.driver_number === result.driver_number);
      return {
        position: number(result.position) ?? 0,
        driver: String(driver?.name_acronym ?? result.driver_number),
        fullName: String(driver?.full_name ?? `Driver ${result.driver_number}`),
        team: String(driver?.team_name ?? "Unavailable"), teamColor: color(driver?.team_colour),
        gap: gap(result.gap_to_leader), bestLap: isRace ? "—" : lap(result.duration),
        laps: number(result.number_of_laps),
        status: result.dsq ? "DSQ" : result.dns ? "DNS" : result.dnf ? "DNF" : "Classified",
      };
    }).sort((a, b) => (a.position || 999) - (b.position || 999)),
    messages: value(control)
      .filter((item) => typeof item.message === "string" && Number.isFinite(Date.parse(String(item.date))))
      .sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date))).slice(0, 8)
      .map((item) => ({ date: String(item.date), message: String(item.message), category: String(item.category ?? "Race control") })),
    weather: weather ? { date: String(weather.date), air: number(weather.air_temperature), track: number(weather.track_temperature), humidity: number(weather.humidity), wind: number(weather.wind_speed), rainfall: number(weather.rainfall) } : null,
    errors,
  };
}

async function standings(kind: "driver" | "constructor") {
  const root = object(await (await fetchOk(`https://api.jolpi.ca/ergast/f1/current/${kind}Standings.json`)).json());
  const table = object(object(root.MRData).StandingsTable);
  const list = rows(table.StandingsLists)[0];
  if (!list) return { entries: [], season: String(table.season), round: null };
  const entries: Standing[] = rows(list[kind === "driver" ? "DriverStandings" : "ConstructorStandings"]).map((item) => {
    const person = object(item[kind === "driver" ? "Driver" : "Constructor"]);
    const points = Number(item.points);
    const position = Number(item.position);
    if (!Number.isFinite(points) || !Number.isFinite(position)) throw new Error("Invalid standings");
    return { name: kind === "driver" ? `${person.givenName} ${person.familyName}` : String(person.name), points, position, color: "#ff2938" };
  });
  return { entries: entries.sort((a, b) => a.position - b.position), season: String(list.season), round: String(list.round) };
}

function decode(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).trim();
}
async function news(): Promise<NewsStory[]> {
  const xml = await (await fetchOk("https://feeds.bbci.co.uk/sport/formula1/rss.xml")).text();
  if (!xml.includes("<rss")) throw new Error("Invalid news feed");
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).flatMap((match) => {
    const field = (name: string) => decode(match[1].match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
    const title = field("title"), url = field("link"), date = Date.parse(field("pubDate"));
    if (!title || !Number.isFinite(date)) return [];
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !["www.bbc.co.uk", "www.bbc.com", "bbc.co.uk", "bbc.com"].includes(parsed.hostname)) return [];
    return [{ title, url, publishedAt: new Date(date).toISOString() }];
  });
}

const SOURCES = ["Session data", "Driver standings", "Team standings", "News"];

async function build(sessionKey?: number): Promise<DashboardResponse> {
  const results = await Promise.allSettled([snapshot(sessionKey), standings("driver"), standings("constructor"), news()]);
  const [session, drivers, teams, stories] = results;
  return {
    fetchedAt: new Date().toISOString(), snapshot: session.status === "fulfilled" ? session.value : null,
    drivers: drivers.status === "fulfilled" ? drivers.value.entries : [], teams: teams.status === "fulfilled" ? teams.value.entries : [],
    standingsSeason: drivers.status === "fulfilled" ? drivers.value.season : teams.status === "fulfilled" ? teams.value.season : null,
    standingsRound: drivers.status === "fulfilled" ? drivers.value.round : teams.status === "fulfilled" ? teams.value.round : null,
    news: stories.status === "fulfilled" ? stories.value : [],
    errors: results.flatMap((result, index) => {
      if (result.status === "fulfilled") return [];
      console.error(`${SOURCES[index]} failed:`, result.reason);
      return [`${SOURCES[index]} unavailable. Try refreshing.`];
    }),
  };
}

const cache = createCache<DashboardResponse>(60_000);

// A partly failed response is returned but not cached, and never replaces a good one.
export function loadDashboard(sessionKey?: number): Promise<DashboardResponse> {
  return cache(String(sessionKey ?? "latest"), () => build(sessionKey), (data) => !data.errors.length && !data.snapshot?.errors.length);
}
