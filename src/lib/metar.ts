export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN";

export type DecodedMetar = {
  station: string;
  name: string;
  observedAt: string | null; // ISO time
  category: FlightCategory;
  windDir: number | "VRB" | null;
  windSpeed: number | null; // knots
  windGust: number | null;
  visibilitySM: number | null; // statute miles
  ceilingFt: number | null; // lowest BKN/OVC, null = no ceiling
  tempC: number | null;
  dewpointC: number | null;
  altimeterInHg: number | null;
  clouds: string;
  raw: string;
};

// AWC gives visibility as a number or text like "10+" or "1 1/2"
export function parseVisibility(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  let total = 0;
  for (const part of v.replace("+", "").trim().split(" ")) {
    if (part.includes("/")) {
      const [n, d] = part.split("/").map(Number);
      if (!d) return null;
      total += n / d;
    } else {
      const x = Number(part);
      if (isNaN(x)) return null;
      total += x;
    }
  }
  return total;
}

export function ceilingOf(
  clouds: { cover: string; base?: number | null }[],
): number | null {
  const bases = clouds
    .filter(
      (c) =>
        ["BKN", "OVC", "OVX"].includes(c.cover) && typeof c.base === "number",
    )
    .map((c) => c.base as number);
  return bases.length ? Math.min(...bases) : null;
}

export function flightCategory(
  ceiling: number | null,
  vis: number | null,
): FlightCategory {
  if (vis === null) return "UNKNOWN";
  const c = ceiling ?? Infinity;
  if (c < 500 || vis < 1) return "LIFR";
  if (c < 1000 || vis < 3) return "IFR";
  if (c <= 3000 || vis <= 5) return "MVFR";
  return "VFR";
}

export function decodeMetar(r: any): DecodedMetar {
  const clouds: { cover: string; base?: number | null }[] = r.clouds ?? [];
  const ceiling = ceilingOf(clouds);
  const vis = parseVisibility(r.visib);
  const computed = flightCategory(ceiling, vis);

  return {
    station: r.icaoId ?? "",
    name: r.name ?? "",
    observedAt:
      typeof r.obsTime === "number"
        ? new Date(r.obsTime * 1000).toISOString()
        : null,
    category: computed !== "UNKNOWN" ? computed : (r.fltCat ?? "UNKNOWN"),
    windDir:
      r.wdir === "VRB" ? "VRB" : typeof r.wdir === "number" ? r.wdir : null,
    windSpeed: typeof r.wspd === "number" ? r.wspd : null,
    windGust: typeof r.wgst === "number" ? r.wgst : null,
    visibilitySM: vis,
    ceilingFt: ceiling,
    tempC: typeof r.temp === "number" ? r.temp : null,
    dewpointC: typeof r.dewp === "number" ? r.dewp : null,
    // The API reports altimeter in hectopascals
    altimeterInHg: typeof r.altim === "number" ? r.altim * 0.02953 : null,
    clouds: clouds.length
      ? clouds
          .map((c) => (c.base ? `${c.cover} ${c.base} ft` : c.cover))
          .join(", ")
      : "Clear",
    raw: r.rawOb ?? "",
  };
}

export function describeWind(m: DecodedMetar): string {
  if (m.windSpeed === null) return "Not reported";
  if (m.windSpeed === 0) return "Calm";
  const dir =
    m.windDir === "VRB"
      ? "Variable"
      : m.windDir === null
        ? "---"
        : `${m.windDir}°`;
  const gust = m.windGust ? ` gusting ${m.windGust}` : "";
  return `${dir} at ${m.windSpeed} kt${gust}`;
}
