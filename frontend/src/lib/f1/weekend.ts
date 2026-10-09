export type SessionStatus = "upcoming" | "live" | "completed";

export interface WeekendSession {
  sessionKey: number;
  meetingKey: number;
  name: string;
  type: string;
  /** ISO 8601 UTC timestamps; format in the shared display timezone. */
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

export function getSessionStatus(startTime: string, endTime: string, now = Date.now()): SessionStatus {
  if (now < Date.parse(startTime)) return "upcoming";
  return now < Date.parse(endTime) ? "live" : "completed";
}

export const sessionStatusLabel: Record<SessionStatus, string> = {
  upcoming: "Upcoming",
  live: "LIVE",
  completed: "Complete",
};

// Use identical settings during SSR and hydration, independent of host defaults.
export const SESSION_TIME_ZONE = "Asia/Kolkata";
export const SESSION_TIME_ZONE_LABEL = "IST";
const SESSION_LOCALE = "en-GB";

export function formatSessionDate(timestamp: string): string {
  return new Intl.DateTimeFormat(SESSION_LOCALE, { timeZone: SESSION_TIME_ZONE, weekday: "short", month: "short", day: "numeric" }).format(new Date(timestamp));
}

export function formatSessionTime(timestamp: string): string {
  return new Intl.DateTimeFormat(SESSION_LOCALE, { timeZone: SESSION_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(timestamp));
}

export function formatSessionTimestamp(timestamp: string): string {
  return `${formatSessionDate(timestamp)} ${new Intl.DateTimeFormat(SESSION_LOCALE, { timeZone: SESSION_TIME_ZONE, year: "numeric" }).format(new Date(timestamp))}, ${formatSessionTime(timestamp)} ${SESSION_TIME_ZONE_LABEL}`;
}

export function formatSessionTimeRange(session: WeekendSession): string {
  const dayFormatter = new Intl.DateTimeFormat(SESSION_LOCALE, { timeZone: SESSION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const endDate = dayFormatter.format(new Date(session.startTime)) === dayFormatter.format(new Date(session.endTime)) ? "" : formatSessionDate(session.endTime) + " ";
  return formatSessionTime(session.startTime) + " – " + endDate + formatSessionTime(session.endTime);
}
