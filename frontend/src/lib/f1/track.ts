export interface TrackCar {
  driver: string;
  teamColor: string;
  x: number;
  y: number;
}

export interface TrackResponse {
  sessionKey: number;
  lap: number;
  date: string;
  outline: [number, number][];
  cars: TrackCar[];
}
