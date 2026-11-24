/**
 * Pool item world-census-scale-closures-rise, regression found in Opelika,
 * Alabama: the town opened at its Census size closed firms (a wholesaler and
 * a retailer short of cash on a payday while holding savings at the bank)
 * that the same town at the sample size kept open, and counted owners drawn
 * at a fractional weight were booked a draw the journal did not pay. Each
 * case draws its town from all 56 states and territories on a seed the test
 * did not choose; CENSUS_CLOSURES_SEED=op1 plays Opelika itself again.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";
import { corePlaceByKey } from "./place-lookup";
import { SAMPLE, compareClosures } from "./census-scale-closures-support";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { setJournalTrace } from "./journal-state";
import { coreAPI } from "./state";
import { BUSINESS_MODULE_ID } from "./modules/business";
import { countedHeadsOf } from "./residents-economy";
import type { CoreState } from "./types";

/** Named regressions: a seed that plays the town it was found in. */
const REGRESSIONS: Record<string, { key: string; name: string }> = {
  op1: { key: "0157048", name: "Opelika, Alabama" },
};
const base = process.env.CENSUS_CLOSURES_SEED ?? randomBytes(8).toString("hex");
const pinned = REGRESSIONS[base];
/** Places drawn by population before giving up; each is checked from records, not built. */
const REDRAWS = 200;
/** Towns built before giving up, where a drawn town lacks what the case reads. */
const BUILDS = 4;
/** A year of a larger city at its Census size does not fit one test process's memory. */
const LARGEST = 40_000;
// Opelika's wholesaler closed on 2025-07-02, short of cash on a payday with
// its savings in the bank. A year of a town near 40,000 at the sample size
// outgrows one test process's memory from August on, so the case plays to
// late August.
const DAYS = 220;

interface Town {
  key: string;
  seed: string;
  reference: number;
  where: string;
}

/**
 * Towns from 10,000 to 40,000 people, drawn from all 56 for this case (or
 * the named regression's town alone), with every place passed over named.
 */
function* towns(purpose: string, tried: string[]): Generator<Town> {
  if (pinned) {
    const reference = publishedPlaceReferencePopulation(pinned.key)!.value;
    yield {
      key: pinned.key,
      seed: base,
      reference,
      where: `${pinned.name} (${pinned.key}), census ${reference}, seed ${base}`,
    };
    return;
  }
  for (let i = 0; i < REDRAWS; i += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${purpose}:${i}`).digest("hex"),
      purpose,
    );
    const geoid = corePlaceByKey(draw.key)?.sourceGeoid;
    const reference = geoid
      ? publishedPlaceReferencePopulation(geoid)?.value
      : null;
    if (reference && reference > SAMPLE && reference <= LARGEST)
      yield {
        key: draw.key,
        seed: draw.seed,
        reference,
        where: `${draw.name} (${draw.key}), census ${reference}, seed ${draw.seed}`,
      };
    else
      tried.push(
        `${draw.name} (${draw.key}) seed ${draw.seed}: ${reference ?? "no population"}`,
      );
  }
}

function build(town: Town, countScale?: number): CoreState {
  setBookkeeping(false);
  return buildBenchWorld(town.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: town.key,
    ...(countScale ? { countScale } : {}),
  }).core as CoreState;
}

it("a drawn town at its Census size closes no more closure rows than at the sample size, through a wholesaler's or retailer's summer paydays", () => {
  const tried: string[] = [];
  let town: Town | null = null;
  let built = 0;
  for (const candidate of towns("census-scale-closures-opelika", tried)) {
    if (built++ >= BUILDS) break;
    // The regression closed a wholesaler and a retailer: a town with neither
    // has none of the firms it found closing, so another is drawn.
    const sellers = [...build(candidate).organizations.values()].filter(
      (org) =>
        org.classification === "enterprise:wholesale" ||
        org.classification === "enterprise:retail",
    ).length;
    if (sellers > 0) {
      town = candidate;
      break;
    }
    tried.push(`${candidate.where}: no wholesaler or retailer`);
  }
  expect(
    town,
    `no drawn town with a wholesaler or retailer (base ${base}): ${tried.join("; ")}`,
  ).not.toBeNull();
  process.stdout.write(`DRAWN closures: ${town!.where}, base ${base}\n`);
  compareClosures(town!.where, town!.seed, town!.key, town!.reference, DAYS);
  // Opelika's 220 days both ways took 548 seconds at one worker on a 4-core
  // container, plus one opening build to check its sellers; a town near
  // 40,000 carries a little more weight, so about twice that.
}, 1_200_000);

// The merger's original 40-day case in Opelika produced 26 book/journal
// mismatches at its fractional Census weight. Keep the actual payment as the
// independent expectation, including partial payments, rather than rounding
// the book.
it("a drawn town's fractional counted-owner draws equal their actual journal payments", () => {
  const tried: string[] = [];
  let built = 0;
  for (const town of towns("census-scale-closures-owner-draws", tried)) {
    if (built++ >= BUILDS) break;
    const countScale = town.reference / SAMPLE;
    const core = build(town, countScale);
    const journal = new Map<string, { source: string; paidMinor: number }>();
    setJournalTrace((entry) => {
      if (
        entry.id.includes("owner-draw:") ||
        entry.sourceRef.id.includes("owner-draw:")
      )
        journal.set(entry.id, {
          source: entry.sourceRef.id,
          paidMinor: entry.postings.reduce(
            (sum, posting) => sum + Math.max(0, -posting.deltaMinor),
            0,
          ),
        });
    });
    try {
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
    } finally {
      setJournalTrace(null);
    }
    const draws = coreAPI(core)
      .moduleState(BUSINESS_MODULE_ID)
      .table("draws")
      .rows() as unknown as {
      id: string;
      organizationId: string;
      ownerId: string;
      date: string;
      drawnMinor: number;
    }[];
    const paid = draws.filter((row) => row.drawnMinor > 0);
    const fractionalOwners = paid.filter(
      (row) => !Number.isInteger(countedHeadsOf(core, row.ownerId)),
    );
    // A town whose owners were all paid at whole weights in 40 days has no
    // fractional draw to check, so another is drawn.
    if (!fractionalOwners.length) {
      tried.push(`${town.where}: no paid counted owner at fractional weight`);
      continue;
    }
    for (const row of paid) {
      const key = `owner-draw:${row.organizationId}:${row.date}`;
      const postings = [...journal].filter(
        ([id, entry]) => id.includes(key) || entry.source.includes(key),
      );
      expect(
        postings.length,
        `${town.where}: ${row.id}: actual payment journals`,
      ).toBeGreaterThan(0);
      const actual = postings.reduce(
        (sum, [, entry]) => sum + entry.paidMinor,
        0,
      );
      expect(
        row.drawnMinor,
        `${town.where}: ${row.id}: ${postings.map(([id]) => id).join(", ")}`,
      ).toBe(actual);
    }
    process.stdout.write(
      `OWNER_DRAW_LEDGER ${JSON.stringify({
        where: town.where,
        base,
        countScale,
        date: core.date,
        drawRows: draws.length,
        paidRows: paid.length,
        fractionalOwners: fractionalOwners.length,
        example: fractionalOwners[0],
      })}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn town with a paid counted owner at fractional weight (base ${base}): ${tried.join("; ")}`,
  );
}, 600_000);
