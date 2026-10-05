export type TyreCompound = "S" | "M" | "H";

export interface TimingEntry {
  position: number;
  driver: string;
  fullName: string;
  team: string;
  teamColor: string;
  tyre: TyreCompound;
  gap: string;
  lastLap: string;
  paceColor: string;
  pace: number[];
}

export const raceWeekend = {
  round: 4,
  name: "Japanese Grand Prix",
  circuit: "Suzuka International Racing Course",
  location: "Suzuka, Japan",
  lap: 18,
  totalLaps: 53,
  timeRemaining: "1:12:34",
  sessions: ["FP1", "FP2", "FP3", "Qualifying", "Race"],
} as const;

export const timing: TimingEntry[] = [
  { position: 1, driver: "L. Moreau", fullName: "Lucas Moreau", team: "Scuderia Rosso", teamColor: "#c5c9cd", tyre: "S", gap: "–", lastLap: "1:32.416", paceColor: "#ff2938", pace: [13, 5, 7, 6, 10, 11, 7, 11, 9, 4, 8, 10] },
  { position: 2, driver: "C. Navarro", fullName: "Carlos Navarro", team: "Azure Racing", teamColor: "#1986cf", tyre: "M", gap: "+2.341", lastLap: "1:32.801", paceColor: "#f5ac30", pace: [12, 4, 6, 8, 4, 7, 6, 3, 8, 10, 11, 12] },
  { position: 3, driver: "E. Tanaka", fullName: "Ethan Tanaka", team: "Apex Motorsport", teamColor: "#2478c9", tyre: "M", gap: "+5.820", lastLap: "1:33.017", paceColor: "#f5ac30", pace: [12, 5, 4, 6, 7, 8, 9, 12, 10, 11, 7, 6] },
  { position: 4, driver: "O. Rossi", fullName: "Oliver Rossi", team: "Corsa Performance", teamColor: "#f25636", tyre: "S", gap: "+7.126", lastLap: "1:32.998", paceColor: "#f5ac30", pace: [11, 6, 8, 9, 10, 12, 11, 8, 7, 9, 6, 5] },
  { position: 5, driver: "M. Silva", fullName: "Mateo Silva", team: "Verdant Racing", teamColor: "#b4c4c2", tyre: "H", gap: "+11.432", lastLap: "1:33.421", paceColor: "#57cf86", pace: [5, 9, 6, 10, 12, 9, 11, 8, 4, 8, 10, 10] },
  { position: 6, driver: "N. Patel", fullName: "Noah Patel", team: "Corsa Performance", teamColor: "#f25636", tyre: "M", gap: "+13.091", lastLap: "1:33.217", paceColor: "#bdcb54", pace: [4, 12, 11, 9, 7, 5, 7, 9, 11, 9, 10, 11] },
  { position: 7, driver: "D. Laurent", fullName: "Daniel Laurent", team: "Verdant Racing", teamColor: "#bcc7c5", tyre: "H", gap: "+14.563", lastLap: "1:33.602", paceColor: "#b5cd67", pace: [12, 10, 8, 5, 6, 9, 11, 12, 12, 10, 7, 4] },
  { position: 8, driver: "T. Weber", fullName: "Theo Weber", team: "Papaya Motorsport", teamColor: "#ff8c26", tyre: "S", gap: "+16.201", lastLap: "1:33.498", paceColor: "#ff2938", pace: [11, 5, 9, 11, 13, 10, 7, 9, 7, 10, 11, 12] },
  { position: 9, driver: "A. Kim", fullName: "Alex Kim", team: "Azure Racing", teamColor: "#1986cf", tyre: "M", gap: "+18.775", lastLap: "1:33.926", paceColor: "#57cf86", pace: [4, 12, 5, 8, 7, 9, 4, 8, 12, 11, 9, 10] },
  { position: 10, driver: "S. Ibrahim", fullName: "Sam Ibrahim", team: "Violet GP", teamColor: "#b62ccf", tyre: "H", gap: "+20.114", lastLap: "1:34.017", paceColor: "#ff8b2a", pace: [12, 5, 7, 5, 8, 9, 13, 14, 12, 9, 7, 6] },
  { position: 11, driver: "J. Andersson", fullName: "Jack Andersson", team: "Papaya Motorsport", teamColor: "#ff8c26", tyre: "M", gap: "+22.703", lastLap: "1:34.205", paceColor: "#f5ac30", pace: [8, 6, 9, 4, 7, 6, 8, 11, 9, 7, 10, 8] },
  { position: 12, driver: "R. Costa", fullName: "Rafael Costa", team: "Apex Motorsport", teamColor: "#2478c9", tyre: "H", gap: "+24.812", lastLap: "1:34.392", paceColor: "#57cf86", pace: [9, 6, 8, 5, 8, 11, 9, 7, 8, 5, 6, 7] },
  { position: 13, driver: "F. Meyer", fullName: "Felix Meyer", team: "Violet GP", teamColor: "#b62ccf", tyre: "M", gap: "+28.406", lastLap: "1:34.577", paceColor: "#f5ac30", pace: [4, 6, 9, 7, 10, 8, 5, 7, 9, 10, 8, 12] },
  { position: 14, driver: "H. Sato", fullName: "Haru Sato", team: "Silverline", teamColor: "#91a6b8", tyre: "H", gap: "+30.142", lastLap: "1:34.810", paceColor: "#57cf86", pace: [12, 9, 7, 8, 5, 8, 6, 9, 12, 11, 8, 6] },
  { position: 15, driver: "B. Clarke", fullName: "Ben Clarke", team: "Scuderia Rosso", teamColor: "#c5c9cd", tyre: "S", gap: "+32.753", lastLap: "1:34.916", paceColor: "#ff2938", pace: [7, 9, 8, 6, 9, 12, 10, 8, 6, 8, 9, 11] },
  { position: 16, driver: "I. Novak", fullName: "Ivan Novak", team: "Silverline", teamColor: "#91a6b8", tyre: "M", gap: "+35.017", lastLap: "1:35.001", paceColor: "#f5ac30", pace: [9, 6, 4, 8, 9, 7, 9, 11, 10, 8, 9, 12] },
  { position: 17, driver: "L. Dubois", fullName: "Leo Dubois", team: "Horizon Racing", teamColor: "#e9d685", tyre: "H", gap: "+38.422", lastLap: "1:35.104", paceColor: "#57cf86", pace: [6, 8, 10, 9, 5, 7, 10, 8, 9, 7, 5, 8] },
  { position: 18, driver: "A. Brooks", fullName: "Adam Brooks", team: "Horizon Racing", teamColor: "#e9d685", tyre: "M", gap: "+41.790", lastLap: "1:35.362", paceColor: "#f5ac30", pace: [8, 6, 9, 12, 10, 8, 6, 9, 7, 8, 11, 9] },
  { position: 19, driver: "M. Chen", fullName: "Max Chen", team: "Vertex GP", teamColor: "#73cace", tyre: "H", gap: "+46.123", lastLap: "1:35.509", paceColor: "#57cf86", pace: [11, 8, 6, 9, 12, 10, 8, 6, 8, 9, 7, 5] },
  { position: 20, driver: "P. Eriksen", fullName: "Paul Eriksen", team: "Vertex GP", teamColor: "#73cace", tyre: "S", gap: "+49.804", lastLap: "1:35.801", paceColor: "#ff2938", pace: [6, 8, 5, 9, 11, 8, 6, 7, 10, 8, 11, 12] },
];

export const strategyAlerts = [
  { id: "undercut", kind: "undercut", action: "Pit Now", title: "Undercut window open", description: "Box this lap on mediums to protect the undercut.", age: "2 min ago", color: "red" },
  { id: "pit-stop", kind: "pit-stop", action: "Stay Out", title: "One-stop window ahead", description: "Hold position. Target a stop on laps 20–26.", age: "6 min ago", color: "neutral" },
  { id: "safety-car", kind: "safety-car", action: "Watch", title: "Safety car probability", description: "Monitor Turn 11 debris. Safety car chance: 28%.", age: "9 min ago", color: "amber" },
] as const;

export interface NewsStory {
  id: string;
  title: string;
  age: string;
  image: string;
  imagePosition?: string;
  live?: boolean;
  body: string;
}

export const news: NewsStory[] = [
  { id: "battle-at-suzuka", title: "Tanaka keeps pressure on Moreau as battle heats up in Suzuka", age: "12 minutes ago", image: "/images/racing-car.png", imagePosition: "center 60%", live: true, body: "Ethan Tanaka is keeping the leading pair within reach as the Japanese Grand Prix enters its first pit-stop window. Moreau leads on soft tyres, with Navarro 2.341 seconds behind on mediums. With track temperatures holding at 21°C, tyre management could decide the next phase of the race." },
  { id: "tyre-strategy", title: "Teams split on tyre strategy as track evolution increases", age: "28 minutes ago", image: "/images/racing-tyres.png", body: "The field is divided between medium and hard compounds as grip levels improve around Suzuka. The projected one-stop window runs from lap 20 to lap 26, while an early undercut remains an option for drivers in traffic." },
  { id: "turn-11", title: "Debris at Turn 11 under investigation after contact between Silva and Kim", age: "41 minutes ago", image: "/images/racing-car.png", imagePosition: "center 78%", body: "Race control is monitoring debris on the approach to Turn 11 after contact between Mateo Silva and Alex Kim. Both drivers continue in the race. The strategy model currently places the chance of a safety car at 28%." },
];

export const driverStandings = [
  { name: "L. Moreau", points: 86, color: "#ff2735" },
  { name: "C. Navarro", points: 72, color: "#aab0ba" },
  { name: "E. Tanaka", points: 61, color: "#137bc4" },
  { name: "O. Rossi", points: 58, color: "#43c68a" },
  { name: "M. Silva", points: 49, color: "#9529b7" },
];

export const teamStandings = [
  { name: "Scuderia Rosso", points: 128, color: "#ff2735" },
  { name: "Azure Racing", points: 108, color: "#137bc4" },
  { name: "Apex Motorsport", points: 94, color: "#aab0ba" },
  { name: "Corsa Performance", points: 82, color: "#43c68a" },
  { name: "Verdant Racing", points: 73, color: "#9529b7" },
];

export const upcomingSessions = [
  { name: "FP1", date: "Fri, Apr 4", time: "03:30 – 04:30", status: "Complete", result: "Best lap 1:30.842" },
  { name: "FP2", date: "Fri, Apr 4", time: "07:00 – 08:00", status: "Complete", result: "Best lap 1:29.613" },
  { name: "FP3", date: "Sat, Apr 5", time: "03:30 – 04:30", status: "Complete", result: "Best lap 1:29.287" },
  { name: "Qualifying", date: "Sat, Apr 5", time: "07:00 – 08:00", status: "Complete", result: "Pole 1:27.946" },
  { name: "Race", date: "Sun, Apr 6", time: "06:00 – 08:00", status: "Live", result: "Race in progress" },
] as const;

export const raceConditions = {
  temperature: "18°C",
  summary: "Cloudy",
  track: "21°C",
  humidity: "62%",
  wind: "12 km/h NE",
  rainChance: "20%",
};

export const trackMarkers = [
  { x: 175, y: 68, color: "#ff2938", driver: "L. Moreau", position: 1 },
  { x: 216, y: 92, color: "#ff2938", driver: "C. Navarro", position: 2 },
  { x: 56, y: 161, color: "#ff2938", driver: "E. Tanaka", position: 3 },
  { x: 40, y: 157, color: "#ff2938", driver: "O. Rossi", position: 4 },
  { x: 82, y: 171, color: "#ffa82f", driver: "M. Silva", position: 5 },
  { x: 31, y: 151, color: "#46c898", driver: "N. Patel", position: 6 },
  { x: 295, y: 91, color: "#ffa82f", driver: "D. Laurent", position: 7 },
  { x: 52, y: 129, color: "#46c898", driver: "T. Weber", position: 8 },
] as const;
