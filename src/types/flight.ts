export type Flight = {
  id: string;
  date: string; // YYYY-MM-DD
  aircraft: string; // tail number or type
  from: string;
  to: string;
  totalHours: number;
  nightHours: number;
  landings: number;
  nightLandings: number; // full-stop night landings
};
