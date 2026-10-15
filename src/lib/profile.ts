import { DEFAULT_MINIMUMS, Minimums } from "./gonogo";

export function minimumsFromRow(r: any): Minimums {
  if (!r) return DEFAULT_MINIMUMS;
  return {
    ceilingFt: r.min_ceiling_ft ?? DEFAULT_MINIMUMS.ceilingFt,
    visibilitySM: Number(r.min_visibility_sm ?? DEFAULT_MINIMUMS.visibilitySM),
    windKt: r.max_wind_kt ?? DEFAULT_MINIMUMS.windKt,
    crosswindKt: r.max_crosswind_kt ?? DEFAULT_MINIMUMS.crosswindKt,
  };
}
