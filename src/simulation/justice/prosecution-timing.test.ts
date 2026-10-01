import { describe, expect, it } from "vitest";
import table from "../../../data/research/justice/time-to-disposition-2026.json" with { type: "json" };
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import { searchLifePlaces } from "../life-places";
import { composeWorldTimeHandlers } from "../campaigns";
import { SeededRng, pickDistinct } from "../rng";
import type { World } from "../types";
import {
  PROSECUTION_CHARGED_EVENT,
  UNRESEARCHED_PROSECUTION,
  referForProsecution,
  courtCasesOf,
} from "./prosecution";
import {
  NATIONAL_RESOLVE_AFTER_DAYS,
  prosecutionTimingFor,
} from "./prosecution-timing";
import { PROSECUTION_STAGE_TRANSITION_KEY } from "./prosecution-transitions";

interface SiteRow {
  readonly site: string;
  readonly felonyCasesDisposed: number;
  readonly medianDays: number;
  readonly url: string;
  readonly table: string;
  readonly quote: string;
}
interface PlaceRow {
  readonly status: string;
  readonly resolveAfterDays?: number;
  readonly method?: string;
  readonly sites?: readonly SiteRow[];
}

/** A lookup that must exist: fails the test, and narrows the type, when it does not. */
function defined<T>(value: T | undefined, label: string): T {
  expect(value, label).toBeDefined();
  if (value === undefined) throw new Error(`${label} is missing`);
  return value;
}

const PLACE_CODES =
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR GU VI AS MP".split(
    " ",
  );
const places = table.places as unknown as Readonly<Record<string, PlaceRow>>;
const sourcedKeys = Object.keys(places).filter(
  (key) => defined(places[key], key).status === "sourced",
);

describe("per-state criminal time to disposition research file", () => {
  it("covers all 56 places and marks every unread one as an estimate", () => {
    expect(PLACE_CODES).toHaveLength(56);
    for (const code of PLACE_CODES) {
      const row = defined(places[`US-${code}`], code);
      expect(["sourced", "estimated-from-average"], code).toContain(row.status);
    }
    expect(Object.keys(places)).toHaveLength(56);
    expect(sourcedKeys.length).toBeGreaterThan(0);
  });

  it("gives every sourced place sites with an https url, a table name and a short quote", () => {
    for (const key of sourcedKeys) {
      const row = defined(places[key], key);
      const sites = defined(row.sites, `${key} sites`);
      expect(sites.length, key).toBeGreaterThan(0);
      for (const site of sites) {
        const label = `${key} ${site.site}`;
        expect(site.url.startsWith("https://"), label).toBe(true);
        expect(site.table.length, label).toBeGreaterThan(0);
        expect(site.quote.length, label).toBeGreaterThan(0);
        expect(site.quote.length, label).toBeLessThan(1200);
        expect(Number.isInteger(site.medianDays), label).toBe(true);
        expect(site.medianDays, label).toBeGreaterThan(0);
        expect(site.quote, label).toContain(String(site.medianDays));
        expect(site.felonyCasesDisposed, label).toBeGreaterThan(0);
      }
    }
  });

  it("computes each place's days from its sites, and the national estimate from the sourced places", () => {
    for (const key of sourcedKeys) {
      const row = defined(places[key], key);
      const sites = defined(row.sites, key);
      const cases = sites.reduce((n, s) => n + s.felonyCasesDisposed, 0);
      const weighted = Math.round(
        sites.reduce((n, s) => n + s.medianDays * s.felonyCasesDisposed, 0) /
          cases,
      );
      expect(row.resolveAfterDays, key).toBe(weighted);
    }
    const values = sourcedKeys
      .map((key) => defined(places[key], key).resolveAfterDays as number)
      .sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const expected = Math.round(
      values.length % 2 === 0
        ? ((values[mid - 1] as number) + (values[mid] as number)) / 2
        : (values[mid] as number),
    );
    expect(NATIONAL_RESOLVE_AFTER_DAYS).toBe(expected);
    expect(table.nationalResolveAfterDays.days).toBe(expected);
    expect(UNRESEARCHED_PROSECUTION.resolveAfterDays).toBe(expected);
  });

  it("reads a sourced state's days, and the labeled estimate for an unread state or no state", () => {
    const [first] = sourcedKeys;
    const sourced = prosecutionTimingFor(defined(first, "first"));
    expect(sourced.resolveBasis).toBe("SOURCED");
    expect(sourced.resolveAfterDays).toBe(
      defined(places[defined(first, "first")], "row").resolveAfterDays,
    );
    for (const key of [null, "US-ZZ", "US-WY"]) {
      const estimate = prosecutionTimingFor(key);
      expect(estimate.resolveBasis).toBe("ESTIMATED FROM AVERAGE");
      expect(estimate.resolveAfterDays).toBe(NATIONAL_RESOLVE_AFTER_DAYS);
    }
  });
});

/**
 * One seeded minimum world per place: the opening life, with unrelated saved
 * commitments cancelled through the canonical writer so only the case clock runs.
 */
function trialDaysAfterCharge(placeCode: string, seed: string): number {
  const place =
    searchLifePlaces("", 5000, {
      stateJurisdictionKey: `US-${placeCode}`,
      scope: "locality",
    })[0] ??
    defined(
      searchLifePlaces("", 5, {
        stateJurisdictionKey: `US-${placeCode}`,
        scope: "state",
      })[0],
      `place ${placeCode}`,
    );
  const game = defined(
    generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game,
    `game ${placeCode}`,
  );
  let world: World = game.world;
  for (const item of world.history.futureDueItems) {
    if (
      futureDueItemStateAt(world, item.id, currentLifeCutoff(world))?.status !==
      "scheduled"
    )
      continue;
    world = cancelFutureDueItem(world, {
      stableKey: `a107-fixture-cancel:${item.id}`,
      dueItemId: item.id,
      effectiveAt: world.currentDate,
      reasonKey: "fixture:isolated-court-clock",
      context: "Controlled fixture isolates the court clock.",
    });
  }
  const subjectId = game.playerPersonId;
  const referral = referForProsecution(world, {
    stableKey: `a107-case:${placeCode}`,
    subjectPersonId: subjectId,
    jurisdictionId: defined(world.people[subjectId], "subject")
      .homeJurisdictionId,
    offenseKey: "crime:robbery",
    evidence: "documentary",
    standingFindings: 6,
    basisEventIds: [],
    referredBy: { kind: "police", label: "police", personId: null },
  });
  const chargeItem = defined(
    referral.world.history.futureDueItems.find(
      (item) => item.transitionKey === PROSECUTION_STAGE_TRANSITION_KEY,
    ),
    "charge item",
  );
  const registry = composeWorldTimeHandlers();
  const charged = resolveFutureDueItemsThrough(
    referral.world,
    chargeItem.dueAt,
    registry,
  );
  const chargeEvent = defined(
    charged.history.events.find(
      (event) =>
        event.type === PROSECUTION_CHARGED_EVENT &&
        event.involvedEntityIds.includes(subjectId),
    ),
    "charge event",
  );
  const trial = defined(
    charged.history.futureDueItems.find(
      (item) =>
        item.stableKey === `justice:prosecution-stage:${chargeEvent.id}`,
    ),
    "trial item",
  );
  // The defendant's own record names the same hearing day the clock holds.
  const record = defined(courtCasesOf(charged, subjectId)[0], "case record");
  expect(record.hearingOn).toBe(trial.dueAt);
  for (let days = 1; days < 1000; days += 1)
    if (addDays(chargeEvent.occurredAt, days) === trial.dueAt) return days;
  throw new Error(`no whole-day gap for ${placeCode}`);
}

describe("two states schedule the same case's plea hearing on different days", () => {
  // Seed named in the failure message; two sourced places that disagree, plus
  // one place with no read figure that takes the labeled national estimate.
  const seed = "a107-timing-20261001";
  const rng = new SeededRng(seed);
  const distinct = pickDistinct(
    rng,
    sourcedKeys.filter((key) => key !== "US-ND"),
    12,
  );
  const first = defined(distinct[0], "first state");
  const second = defined(
    distinct.find(
      (key) =>
        defined(places[key], key).resolveAfterDays !==
        defined(places[first], first).resolveAfterDays,
    ),
    "second state",
  );
  const unread = defined(
    Object.keys(places).find(
      (key) => defined(places[key], key).status !== "sourced",
    ),
    "unread state",
  );

  it(`${first} and ${second} hold the hearing on their own days (seed ${seed})`, () => {
    const firstDays = trialDaysAfterCharge(first.slice(3), `${seed}:${first}`);
    const secondDays = trialDaysAfterCharge(
      second.slice(3),
      `${seed}:${second}`,
    );
    expect(firstDays).toBe(prosecutionTimingFor(first).resolveAfterDays);
    expect(secondDays).toBe(prosecutionTimingFor(second).resolveAfterDays);
    expect(firstDays).not.toBe(secondDays);
  });

  it(`${unread} has no read figure and takes the labeled national estimate`, () => {
    expect(trialDaysAfterCharge(unread.slice(3), `${seed}:${unread}`)).toBe(
      NATIONAL_RESOLVE_AFTER_DAYS,
    );
  });
});
