/**
 * A business keeps cash for the bills it pays at its town's weight, so a town
 * opened at its Census size puts about as much of its flows in the bank as
 * the same town at the sample size. Opelika, Alabama (where a wholesaler
 * once banked 14 times its sample share and had no cash on payday) and a
 * place drawn from all 56 above 10,000 people, each played 120 days both
 * ways.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { depositsHeld } from "./accounts";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { corePlaceByKey } from "./place-lookup";
import { staffedScale } from "./residents-economy";
import type { CoreState } from "./types";

const SAMPLE = 10_000;
const LARGEST = 40_000;
const DAYS = 120;
/** How far the Census run's share of flows in the bank may stand from the sample's, either way. */
const SPREAD = 2;

function banked(seed: string, key: string, countScale: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  });
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  const c = core as CoreState;
  const rows = [...c.finance.businesses]
    .filter(([, book]) => !book.closedAt)
    .map(([id, book]) => ({
      id,
      deposits: depositsHeld(c, id),
      flows:
        book.annualDemandMinor *
        staffedScale(c, id, book.annualPayrollMinor, 365),
    }));
  const total = (k: "deposits" | "flows") =>
    rows.reduce((sum, row) => sum + row[k], 0);
  return { ratio: total("deposits") / Math.max(1, total("flows")), rows };
}

function compare(where: string, seed: string, key: string, scale: number) {
  const sample = banked(seed, key, 1);
  const census = banked(seed, key, scale);
  const top = census.rows
    .sort((a, b) => b.deposits - a.deposits)
    .slice(0, 3)
    .map((row) => {
      const at = sample.rows.find((r) => r.id === row.id);
      return `${row.id} ${(row.deposits / Math.max(1, row.flows)).toFixed(4)} against ${at ? (at.deposits / Math.max(1, at.flows)).toFixed(4) : "none"}`;
    });
  process.stdout.write(
    `deposits per flow: ${where}: sample ${sample.ratio.toFixed(4)}, census ${census.ratio.toFixed(4)}; ${top.join("; ")}\n`,
  );
  expect(census.ratio, `${where}: ${top.join("; ")}`).toBeLessThanOrEqual(
    sample.ratio * SPREAD,
  );
  expect(census.ratio, `${where}: ${top.join("; ")}`).toBeGreaterThanOrEqual(
    sample.ratio / SPREAD,
  );
}

it("Opelika, Alabama at its Census size banks about the sample's share of its flows", () => {
  const reference = placeReferencePopulation("0157048")!.value;
  compare(
    `Opelika, Alabama (0157048), census ${reference}, seed op1`,
    "op1",
    "0157048",
    reference / SAMPLE,
  );
  // This case and the drawn one below took 513 seconds together at one
  // worker on a 4-core container; about twice that each.
}, 1_200_000);

it("a drawn Census-size town banks about the sample's share of its flows", () => {
  const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const tried: string[] = [];
  for (let i = 0; i < 200; i += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "deposit-reserve-weighted",
    );
    const geoid = corePlaceByKey(draw.key)?.sourceGeoid;
    const reference = geoid ? placeReferencePopulation(geoid)?.value : null;
    if (reference && reference > SAMPLE && reference <= LARGEST) {
      compare(
        `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}`,
        draw.seed,
        draw.key,
        reference / SAMPLE,
      );
      return;
    }
    tried.push(`${draw.name} (${draw.key}): ${reference ?? "no population"}`);
  }
  throw new Error(
    `no drawn place from ${SAMPLE} to ${LARGEST} (base ${base}): ${tried.join("; ")}`,
  );
  // A town of up to 40,000 people carries up to four times Viera East's
  // weight (12,570 people), so more than the case above.
}, 1_800_000);
