import { createCache } from "./cache.js";
import { fetchOpenF1 } from "./http.js";

export type SessionStatus = "upcoming" | "live" | "completed";

export interface WeekendSession {
  sessionKey: number;
  meetingKey: number;
  name: string;
  type: string;
  /** ISO 8601 UTC timestamps. */
  startTime: string;
  endTime: string;
  status: SessionStatus;
}

export interface WeekendMeeting {
  meetingKey: number;
  name: string;
  circuit: string;
  location: string;
  country: string;
  year: number;
}

export interface WeekendResponse {
  meeting: WeekendMeeting | null;
  sessions: WeekendSession[];
  meetings?: WeekendMeeting[];
}

type Row = Record<string, unknown>;

export function getSessionStatus(startTime: string, endTime: string, now = Date.now()): SessionStatus {
  if (now < Date.parse(startTime)) return "upcoming";
  return now < Date.parse(endTime) ? "live" : "completed";
}

function record(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid OpenF1 record");
  return value as Row;
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid OpenF1 ${what}`);
  return value;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid OpenF1 text");
  return value;
}

function key(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error("Invalid OpenF1 key");
  return value;
}

function utc(value: unknown): string {
  const timestamp = text(value);
  // Reject timezone-less dates rather than interpreting them in the server's timezone.
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) throw new Error("Invalid OpenF1 timestamp");
  return new Date(timestamp).toISOString();
}

function isRace(meeting: Row): boolean {
  return meeting.is_cancelled !== true && typeof meeting.meeting_name === "string" && /Grand Prix/i.test(meeting.meeting_name);
}

function normalizeMeeting(value: unknown): WeekendMeeting {
  const meeting = record(value);
  return {
    meetingKey: key(meeting.meeting_key),
    name: text(meeting.meeting_name),
    circuit: text(meeting.circuit_short_name),
    location: text(meeting.location),
    country: text(meeting.country_name),
    year: key(meeting.year),
  };
}

export function selectRaceMeeting(values: unknown, now = Date.now()): WeekendMeeting | null {
  const races = list(values, "meetings").map(record).map((meeting) => ({
    meeting,
    start: Date.parse(utc(meeting.date_start)),
    end: Date.parse(utc(meeting.date_end)),
  })).filter(({ meeting, start, end }) => isRace(meeting) && end >= start);

  // Keep an event on screen through its final session, then move to the next race.
  const active = races.filter(({ start, end }) => start <= now && end >= now).sort((a, b) => a.start - b.start)[0];
  const next = races.filter(({ start }) => start > now).sort((a, b) => a.start - b.start)[0];
  const previous = races.filter(({ end }) => end < now).sort((a, b) => b.end - a.end)[0];
  const chosen = active ?? next ?? previous;
  return chosen ? normalizeMeeting(chosen.meeting) : null;
}

export function normalizeSessions(value: unknown, meetingKey: number, now = Date.now()): WeekendSession[] {
  return list(value, "sessions").map((item): WeekendSession => {
    const session = record(item);
    const startTime = utc(session.date_start);
    const endTime = utc(session.date_end);
    if (key(session.meeting_key) !== meetingKey || Date.parse(endTime) < Date.parse(startTime)) throw new Error("Inconsistent OpenF1 session");
    return {
      sessionKey: key(session.session_key),
      meetingKey,
      name: text(session.session_name),
      type: text(session.session_type),
      startTime,
      endTime,
      status: getSessionStatus(startTime, endTime, now),
    };
  }).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}

async function loadBase(): Promise<WeekendResponse> {
  const year = new Date().getUTCFullYear();
  const [meetings, previousSeason] = await Promise.all([
    fetchOpenF1(`meetings?year=${year}`),
    fetchOpenF1(`meetings?year=${year - 1}`).catch(() => []),
  ]);
  const current = list(meetings, "meetings").map(record);
  const calendar = [...(Array.isArray(previousSeason) ? previousSeason.map(record) : []), ...current]
    .filter(isRace)
    .sort((a, b) => Date.parse(String(a.date_start)) - Date.parse(String(b.date_start)))
    .map(normalizeMeeting);

  let meeting = selectRaceMeeting(current);
  // During the winter break, prefer the next season if its calendar is available.
  const upcoming = current.some((item) => isRace(item) && typeof item.date_end === "string" && Date.parse(item.date_end) >= Date.now());
  if (meeting && !upcoming) {
    try {
      meeting = selectRaceMeeting(await fetchOpenF1(`meetings?year=${year + 1}`)) ?? meeting;
    } catch (error) {
      console.warn("Next season schedule unavailable", error);
    }
  }
  if (!meeting) return { meeting: null, sessions: [] };
  // Pin the numeric key so a meeting rollover cannot mix metadata and sessions.
  const chosen = meeting;
  const sessions = normalizeSessions(await fetchOpenF1(`sessions?meeting_key=${chosen.meetingKey}`), chosen.meetingKey);
  return { meeting: chosen, sessions, meetings: calendar.some((item) => item.meetingKey === chosen.meetingKey) ? calendar : [...calendar, chosen] };
}

const baseCache = createCache<WeekendResponse>(5 * 60_000);
const sessionsCache = createCache<WeekendSession[]>(5 * 60_000);

/** Returns null when meetingKey is not on the calendar. */
export async function loadWeekend(meetingKey?: number): Promise<WeekendResponse | null> {
  const base = await baseCache("base", loadBase);
  let result = base;
  if (meetingKey !== undefined && meetingKey !== base.meeting?.meetingKey) {
    const meeting = base.meetings?.find((item) => item.meetingKey === meetingKey);
    if (!meeting) return null;
    const sessions = await sessionsCache(String(meetingKey), async () =>
      normalizeSessions(await fetchOpenF1(`sessions?meeting_key=${meetingKey}`), meetingKey));
    result = { ...base, meeting, sessions };
  }
  // Cached sessions keep their fetch-time status; recompute against the clock.
  return { ...result, sessions: result.sessions.map((session) => ({ ...session, status: getSessionStatus(session.startTime, session.endTime) })) };
}
