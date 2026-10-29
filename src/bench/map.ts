import { readFileSync, readdirSync } from "node:fs";
import { coreAPI } from "../core2/state";
import { townDistrict, townSeats } from "../core2/modules/offices";
import type { CoreState } from "../core2/types";

const GEOMETRY = new URL("../maps/geometry/states/", import.meta.url);

interface Feature {
  geoid: string;
  name: string;
  rings: number[][];
  bbox: [number, number, number, number];
  label: [number, number];
}
interface Pack {
  quantum: number;
  bbox: [number, number, number, number];
  arcs: number[][];
  layers: Record<string, Feature[]>;
}

const packs = new Map<string, Pack>();
function pack(stateFips: string): Pack | null {
  if (!packs.has(stateFips)) {
    const file = readdirSync(GEOMETRY).find((name) =>
      name.startsWith(`${stateFips}-`),
    );
    if (!file) return null;
    packs.set(
      stateFips,
      JSON.parse(readFileSync(new URL(file, GEOMETRY), "utf8")) as Pack,
    );
  }
  return packs.get(stateFips)!;
}

/** SVG path data for one feature (delta-encoded arcs, as the map pack stores them). */
function path(p: Pack, feature: Feature): string {
  const parts: string[] = [];
  for (const ring of feature.rings) {
    const commands: string[] = [];
    ring.forEach((ref, arcIndex) => {
      const encoded = p.arcs[ref < 0 ? ~ref : ref]!;
      const points: number[] = [];
      let x = 0,
        y = 0;
      for (let i = 0; i < encoded.length; i += 2) {
        x += encoded[i]!;
        y += encoded[i + 1]!;
        points.push(x * p.quantum, y * p.quantum);
      }
      const count = points.length / 2;
      for (let step = 0; step < count; step++) {
        const at = ref < 0 ? count - 1 - step : step;
        if (step === 0 && arcIndex > 0) continue;
        commands.push(
          `${commands.length ? "L" : "M"}${points[at * 2]!.toFixed(2)} ${points[at * 2 + 1]!.toFixed(2)}`,
        );
      }
    });
    if (commands.length >= 3) parts.push(`${commands.join("")}Z`);
  }
  return parts.join("");
}

/** The player's state: counties, their own districts and town, with who holds each seat. */
export function governmentMap(core: CoreState) {
  const api = coreAPI(core);
  const town = api
    .moduleState("core2-elections-v1")
    .table("town")
    .get("town") as { stateKey: string; geoid: string } | undefined;
  if (!town) return null;
  const usps = town.stateKey.slice(3);
  const fips = readdirSync(GEOMETRY)
    .find((name) => name.endsWith(`-${usps.toLowerCase()}.generated.json`))
    ?.slice(0, 2);
  const p = fips ? pack(fips) : null;
  if (!p) return null;
  const mine: Record<string, string | null> = {
    congressional:
      townDistrict(town.geoid, usps, "congressional", core.date)?.geoid ?? null,
    "state-upper":
      townDistrict(town.geoid, usps, "state-upper", core.date)?.geoid ?? null,
    "state-lower":
      townDistrict(town.geoid, usps, "state-lower", core.date)?.geoid ?? null,
    place: town.geoid,
  };
  const holders = (kind: string | RegExp) =>
    townSeats(api)
      .filter(
        (row) =>
          (typeof kind === "string"
            ? row.office.kind === kind
            : kind.test(row.office.kind)) && row.holder,
      )
      // Each holder with their party: the map colors a district by the party
      // that holds it (owner, Oct 28: Parties illustrated with the map).
      .map((row) => ({
        name: `${row.holder!.identity.givenName} ${row.holder!.identity.familyName}`,
        party: row.holder!.party ?? null,
      }));
  const shape = (layer: string, geoid?: string | null) => {
    const feature = p.layers[layer]?.find((row) => row.geoid === geoid);
    return feature
      ? {
          name: feature.name,
          d: path(p, feature),
          label: feature.label,
          bbox: feature.bbox,
        }
      : null;
  };
  return {
    bbox: p.bbox,
    state: shape("state", fips),
    counties: (p.layers.county ?? []).map((feature) => ({
      geoid: feature.geoid,
      name: feature.name,
      d: path(p, feature),
    })),
    yours: {
      congressional: {
        ...shape("congressional", mine.congressional),
        holders: holders("us-house"),
      },
      "state-upper": {
        ...shape("state-upper", mine["state-upper"]),
        holders: holders(/^legislature-(upper|unicameral)/),
      },
      "state-lower": {
        ...shape("state-lower", mine["state-lower"]),
        holders: holders("legislature-lower"),
      },
      place: {
        ...shape("place", mine.place),
        holders: [...holders("mayor"), ...holders("municipal-council")],
      },
    },
  };
}
