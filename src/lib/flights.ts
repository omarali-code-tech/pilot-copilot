import { Flight } from "../types/flight";

export function fromRow(r: any): Flight {
  return {
    id: r.id,
    date: r.date,
    aircraft: r.aircraft,
    from: r.from_airport,
    to: r.to_airport,
    totalHours: Number(r.total_hours),
    nightHours: Number(r.night_hours),
    landings: r.landings,
    nightLandings: r.night_landings ?? 0,
  };
}
