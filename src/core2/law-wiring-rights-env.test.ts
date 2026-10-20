/**
 * The rights, technology, environment, agriculture, parks and roads laws in
 * one played world: each reaches who it binds, an engine applies it and moves
 * money, the outcome web moves its measure after its lag, and a repeal ends
 * it. A place without a subject (no emitter in a nonattainment county, no
 * farm, no online employer) is redrawn; every place tried is named on failure.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyNonattainment } from "./business-operating-rules";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn } from "./law-reach/applied";
import { inForceHere } from "./law-reach/host";
import { enactLaw, lawChain } from "./modules/laws";
import { amendBudget, governments } from "./modules/budgets";
import { corePlaceByKey } from "./place-lookup";
import { realLocalities } from "./places";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const P = "us-policy-positions:";
const KEYS = {
  discrimination: `${P}civil-family-community.ban-discrimination-in-housing-and-work`,
  abortion: `${P}civil-family-community.restrict-abortion`,
  ageVerification: `${P}technology-privacy.age-verification-for-social-media`,
  facial: `${P}technology-privacy.restrict-government-facial-recognition`,
  privacy: `${P}technology-privacy.consumer-data-privacy-law`,
  cleanAir: `${P}environment-energy.clean-air-plan-for-polluted-counties`,
  groundwater: `${P}agriculture-natural-resources.limit-groundwater-withdrawal`,
  parksFunding: `${P}civil-family-community.dedicated-parks-funding`,
  shift: `${P}transportation-infrastructure.shift-highway-funds-to-transit`,
};
const LINES = ["parks", "naturalResources", "highways"] as const;

function countyOf(key: string): string | undefined {
  const geoid = corePlaceByKey(key)?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  return county && county.length === "SSCCC".length ? county : undefined;
}

/** Places in the seeded order, those whose county misses an air standard first. */
function candidates(): string[] {
  const year = Number(gameStartDate().slice(0, 4));
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|rights-env|${key}`).digest("hex");
  const all = [...realLocalities()]
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)))
    .map((p) => p.key);
  const dirty = all.filter((key) => {
    const county = countyOf(key);
    return (
      county !== undefined &&
      countyNonattainment(county, year).some((row) => !row.revoked)
    );
  });
  return dirty;
}

function setLaw(core: CoreState, api: CoreAPI, series: string, value: number) {
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series,
      value,
      effectiveDate: core.date,
      measureId: `fixture:rights-env:${series}:${value}:${core.date}`,
      citation: "Controlled law case after the native generated start.",
    });
}

const step = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

it("wires the rights, technology, environment, agriculture, parks and roads laws", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const posts: { kind: string; id: string; gross: number }[] = [];
  try {
    for (const placeKey of candidates().slice(0, 6)) {
      const { core } = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey,
      });
      const api = coreAPI(core);
      const where = `seed ${seed}, ${core.placeMetadata.placeName} [${placeKey}]`;
      tried.push(placeKey);
      const town = lawChain(api).townPlaceId;
      const orgs = [...core.organizations.values()].filter(
        (o) => o.placeId === town,
      );
      const has = (c: string) => orgs.some((o) => o.classification === c);
      step(core, 5);
      const emitters = orgs.filter((o) =>
        ["enterprise:manufacturing", "enterprise:mining"].includes(
          o.classification ?? "",
        ),
      );
      if (!emitters.length || !has("enterprise:agriculture")) continue;
      if (!has("enterprise:telecommunications")) continue;
      const gov = governments(api).find((g) => g.level === "city");
      if (!gov) continue;

      // Enact every law (repealing starting yeses first by setting 1 over them).
      const lawKeys = Object.values(KEYS);
      const startedYes = new Map(
        lawKeys.map((key) => [key, inForceHere(api, key)]),
      );
      for (const key of lawKeys) setLaw(core, api, key, 0);
      step(core, 3);
      setJournalTrace((input) => {
        let gross = 0;
        for (const p of input.postings)
          if (p.deltaMinor > 0) gross += p.deltaMinor;
        posts.push({ kind: input.sourceRef.kind, id: input.id, gross });
      });
      for (const key of lawKeys) setLaw(core, api, key, 1);
      for (const line of LINES)
        amendBudget(api, {
          governmentId: gov.id,
          line,
          deltaMinor: 10_000_00,
          measureId: `fixture:rights-env:${line}`,
        });
      step(core, 40);
      setJournalTrace(null);

      const open = (key: string) => appliedOn(api, key);
      const named = (rows: readonly { id: string }[]) =>
        rows.slice(0, 3).map((r) => r.id);
      // Clean air: emitters bound, paying on the journal.
      const air = open(KEYS.cleanAir);
      expect(
        air.length,
        `${where}: clean air applied ${named(air)}`,
      ).toBeGreaterThan(0);
      expect(
        air.some((r) => r.amountMinor < 0),
        where,
      ).toBe(true);
      // Groundwater: farms bound.
      const water = open(KEYS.groundwater);
      expect(water.length, `${where}: groundwater`).toBeGreaterThan(0);
      for (const r of water) expect(r.target, where).toBe("organization");
      // Online employers pay for age verification; every employer pays the privacy duty.
      const age = open(KEYS.ageVerification);
      expect(age.length, `${where}: age verification`).toBeGreaterThan(0);
      expect(
        age.some((r) => r.amountMinor < 0),
        where,
      ).toBe(true);
      expect(
        open(KEYS.privacy).some((r) => r.amountMinor < 0),
        where,
      ).toBe(true);
      // The police line and the parks line rise by the law, recorded on the government and its residents.
      for (const key of [KEYS.facial, KEYS.parksFunding, KEYS.shift]) {
        const rows = open(key);
        expect(
          rows.some((r) => r.target === "government"),
          `${where}: ${key} government; rows ${JSON.stringify(rows.map((r) => r.id))}`,
        ).toBe(true);
        const group = rows.find((r) => r.target === "group");
        expect(group?.count ?? 0, `${where}: ${key} residents`).toBeGreaterThan(
          0,
        );
      }
      expect(
        open(KEYS.facial).find((r) => r.target === "government")!.amountMinor,
        where,
      ).toBeGreaterThan(0);
      // Counted women of childbearing age under the restriction.
      const women = open(KEYS.abortion).filter((r) => r.target === "group");
      expect(women.length, `${where}: births ${named(women)}`).toBeGreaterThan(
        0,
      );
      // Discrimination: small employers bound by the ban.
      const hiring = open(KEYS.discrimination);
      expect(hiring.length, `${where}: hiring`).toBeGreaterThan(0);
      // Money moved on the journal for the compliance duties.
      const paidCauses = new Set(
        (
          api.moduleState("business").table("compliance").rows() as unknown as {
            cause: string;
            paidMinor: number;
          }[]
        )
          .filter((r) => r.paidMinor > 0)
          .map((r) => r.cause),
      );
      for (const cause of [
        "clean-air",
        `law:${KEYS.privacy}`,
        `law:${KEYS.ageVerification}`,
      ])
        expect(paidCauses.has(cause), `${where}: paid ${cause}`).toBe(true);
      expect(posts.length, `${where}: journal posts`).toBeGreaterThan(0);
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );

      // The outcome web moves each measure after its lag.
      step(core, 365);
      const months = api
        .moduleState("core2-outcome-web-v1")
        .table("months")
        .query("byPlace", [town]) as unknown as {
        id: string;
        effects: Record<string, number>;
      }[];
      const moved = (link: string) =>
        months.find((m) => (m.effects[link] ?? 0) !== 0);
      // The web reads each law as a cause every month; a link moves its
      // measure when the law differs from the one the place really had (the
      // research's base levels already include that law).
      const lastRow = months
        .slice()
        .sort((x, y) => x.id.localeCompare(y.id))
        .at(-1)! as unknown as {
        values: Record<string, number>;
        effects: Record<string, number>;
      };
      for (const [link, key] of [
        ["abortion-ban-to-births", KEYS.abortion],
        ["emission-rules-to-particulates", KEYS.cleanAir],
        ["groundwater-limits-to-irrigation-pumping", KEYS.groundwater],
        ["facial-recognition-limit-to-crime", KEYS.facial],
      ] as const) {
        expect(lastRow.values[`law:${key}`], `${where}: web reads ${key}`).toBe(
          1,
        );
        if (!startedYes.get(key))
          expect(
            moved(link),
            `${where}: web link ${link} (law began as no)`,
          ).toBeDefined();
      }

      // Repeal: every row ends.
      for (const key of lawKeys) setLaw(core, api, key, 0);
      step(core, 40);
      for (const key of lawKeys)
        expect(
          open(key).filter((r) => r.target !== "person"),
          `${where}: ${key} after repeal`,
        ).toHaveLength(0);
      return;
    }
    throw new Error(
      `no place with every subject; tried ${tried.join(", ")} (seed ${seed})`,
    );
  } finally {
    setJournalTrace(null);
    setBookkeeping(true);
  }
  // A played world run 13 months so the 12-month web links can move: well over five minutes under load.
}, 1_200_000);
