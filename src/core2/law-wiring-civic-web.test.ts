/**
 * Outcome-web links that reach civic life, in a played world: a place drawn
 * from all 56 on a seed nobody chose (CIVIC_WEB_SEED overrides it), the bench
 * world with every module installed, built twice from the same seed. In one,
 * the town's local newspaper closes the second week; the other is the control.
 *
 * newspaper-closure-to-engagement: the press module's outlet is a business
 * whose finance book carries the closing date; the web counts the town's
 * closed papers as press.local-newspaper (the newspapers-closed reader), a
 * year later (the link's lag) moves voting.local-turnout in the town's web
 * month, and the voting engine multiplies each voter's own turnout propensity
 * by that effect where a local race is on the ballot (turnoutWeb): on an
 * ordinary day's local question and on the first local election day after,
 * in the propensity each named voter's ballot keeps.
 *
 * The other links this file covers stay unread, each for a reason the test
 * holds in place so that sizing one without its reader fails here.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import business from "./data/business/business.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  isLocalFamily,
  type ContestRow,
} from "./modules/elections";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { closedNewspapers, outletsHere } from "./modules/press";
import {
  turnoutOn,
  VOTING_MODULE_ID,
  type TurnoutReasonsRecord,
} from "./modules/voting";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { coreAPI } from "./state";
import { propensityOf, type TurnoutParts } from "./turnout";
import { ageOnElection } from "./turnout-web";
import type { CoreAPI, CoreState } from "./types";
import { setKeepEveryonesWhy } from "./why-kept";

const seed = process.env.CIVIC_WEB_SEED ?? randomBytes(8).toString("hex");
const link = (key: string) => WEB_LINKS.find((l) => l.key === key)!;

const LINK = "newspaper-closure-to-engagement";
const MEASURE = "voting.local-turnout";
/** The paper closes this many days in, after the web has opened and read its first month. */
const CLOSE_AFTER_DAYS = 12;
/** Past the link's 12-month lag (links.json) to the web's next monthly record. */
const DAYS = 430;
/** How far past the lag to look for a local election with candidates, in thirty-day steps. */
const LOOK_STEPS = 24;
const TRIES = 6;

const webRows = (core: CoreState, placeId: string): readonly WebMonth[] =>
  (
    coreAPI(core)
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [placeId]) as unknown as readonly WebMonth[]
  )
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));

const contestsOf = (api: CoreAPI) =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as readonly ContestRow[];

/** The first local race after a date that has candidates on its ballot. */
function nextLocalRace(api: CoreAPI, after: string): ContestRow | undefined {
  return contestsOf(api)
    .filter(
      (c) =>
        isLocalFamily(c.family) &&
        c.electionDate > after &&
        ballot(api, c.id).length > 0,
    )
    .slice()
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    )[0];
}

interface KeptBallot {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly turnoutReasons: TurnoutReasonsRecord;
}

const ballotsOn = (api: CoreAPI, contestId: string) =>
  (
    api
      .moduleState(VOTING_MODULE_ID)
      .table("ballots")
      .rows() as unknown as readonly KeptBallot[]
  )
    .filter((b) => b.contestId === contestId)
    .slice()
    .sort((a, b) => a.voterId.localeCompare(b.voterId));

describe("newspaper-closure-to-engagement reaches the town's voters", () => {
  it(
    `a closed local paper lowers its voters' turnout propensity by the link's size once the lag has run (seed ${seed})`,
    { timeout: 2_400_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `civic-web-newspaper:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          const closed = build();
          const api = coreAPI(closed);
          // Some towns have no paper of their own: nothing there to close.
          if (
            !outletsHere(api).some(
              (o) => o.kind === "newspaper" && o.tier !== "national",
            )
          ) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): no local newspaper`,
            );
            continue;
          }
          const control = build();
          const controlApi = coreAPI(control);
          const both = (through: string) => {
            advanceCore(closed, through);
            advanceCore(control, through);
          };

          // The unchanged twins match exactly until the paper closes (its
          // business book opens with the business engine, in the first days).
          both(addDays(makeIsoDate(closed.date), CLOSE_AFTER_DAYS));
          const paper = outletsHere(api).find(
            (o) =>
              o.kind === "newspaper" &&
              o.tier !== "national" &&
              o.ownerId &&
              closed.finance.businesses.get(o.organizationId) &&
              !closed.finance.businesses.get(o.organizationId)!.closedAt,
          );
          if (!paper) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): no local newspaper business`,
            );
            continue;
          }
          const placeId = paper.placeId;
          expect(JSON.stringify(webRows(closed, placeId))).toBe(
            JSON.stringify(webRows(control, placeId)),
          );
          expect(closedNewspapers(api, placeId)).toEqual({
            count: 0,
            recordId: null,
          });

          // The owner closes the paper through the finance engine's own
          // closure by choice (the primitive the business engine's owner
          // decision carries out); the control's paper publishes on.
          const closing = closed.date;
          api.closeBusinessByChoice({
            organizationId: paper.organizationId,
            ownerAccountId: api.accounts().main(paper.ownerId!),
            reasonKey: business.reasons.retiring,
            source: {
              tag: "ESTIMATED",
              asOf: closing,
              citation: "Civic web test: the paper's owner closes it",
              estimatedFrom: `${paper.ownerId} closed ${paper.organizationId}.`,
            },
          });
          expect(closedNewspapers(api, placeId)).toEqual({
            count: 1,
            recordId: paper.id,
          });
          expect(closedNewspapers(controlApi, placeId)).toEqual({
            count: 0,
            recordId: null,
          });

          both(addDays(makeIsoDate(closed.date), DAYS));
          // An ordinary day: no contest decides anyone's turnout today.
          const election = (core: CoreState) =>
            contestsOf(coreAPI(core)).some(
              (c) =>
                c.electionDate === core.date || c.primaryDate === core.date,
            );
          while (election(closed) || election(control))
            both(addDays(makeIsoDate(closed.date), 1));

          // The web read the closure from the press module's record, and its
          // month a year on carries the link's effect in the closed world only.
          const rows = webRows(closed, placeId);
          const row = rows.at(-1)!;
          const controlRow = webRows(control, placeId).at(-1)!;
          expect(row.month).toBe(controlRow.month);
          expect(row.engineSources["press.local-newspaper"]).toBe(paper.id);
          expect(row.values["press.local-newspaper"]).toBe(1);
          expect(controlRow.values["press.local-newspaper"]).toBe(0);
          const size = link(LINK).size!;
          expect(size).toBeLessThan(0);
          expect(row.effects[LINK], row.id).toBeCloseTo(size, 12);
          expect(controlRow.effects[LINK] ?? 0, controlRow.id).toBe(0);
          expect(
            row.values[MEASURE]! / controlRow.values[MEASURE]!,
          ).toBeCloseTo(1 + size, 12);

          // The voting engine reads it where it decides: each named adult's
          // turnout propensity on a local question, against the propensity
          // their own parts give.
          const asked = { a: { total: 1 }, b: { total: -1 } };
          const adults = [...closed.people.values()]
            .filter(
              (p) =>
                p.alive !== false &&
                p.placeId === placeId &&
                ageOnElection(p.birthDate, closed.date) >= 18 &&
                control.people.get(p.id)?.alive !== false &&
                control.people.has(p.id),
            )
            .sort((a, b) => a.id.localeCompare(b.id));
          expect(adults.length).toBeGreaterThan(5);
          const seen: string[] = [];
          for (const person of adults
            .filter((_, i) => i % 3 === 0)
            .slice(0, 12)) {
            const moved = turnoutOn(api, person, asked, true);
            expect(moved.web, person.id).toBeDefined();
            expect(moved.web!.recordId).toBe(row.id);
            expect(moved.web!.links).toEqual([LINK]);
            const parts = propensityOf(moved);
            // Equal to the size unless the propensity hit its ceiling of one.
            if (moved.propensity < 1)
              expect(moved.propensity / parts, person.id).toBeCloseTo(
                1 + size,
                9,
              );
            // The same person at the same question in the control world
            // carries no web link.
            const unmoved = turnoutOn(
              controlApi,
              control.people.get(person.id)!,
              asked,
              true,
            );
            expect(unmoved.web, person.id).toBeUndefined();
            expect(unmoved.propensity, person.id).toBeCloseTo(
              Math.min(1, propensityOf(unmoved)),
              12,
            );
            seen.push(
              `${person.id} ${moved.propensity.toFixed(4)} (own parts ${Math.min(1, parts).toFixed(4)}) against ${unmoved.propensity.toFixed(4)} in the control`,
            );
          }
          expect(seen.length).toBeGreaterThan(3);

          // And on a real local election day: the first local race with
          // candidates after the lag keeps each named voter's propensity with
          // the link in it, and the control world's ballots carry none.
          let race = nextLocalRace(api, closed.date);
          for (let step = 0; !race && step < LOOK_STEPS; step += 1) {
            both(addDays(makeIsoDate(closed.date), 30));
            race = nextLocalRace(api, closed.date);
          }
          expect(
            race,
            "a local race with candidates within two years of the link taking hold",
          ).toBeDefined();
          // A ballot keeps its turnout reasons only for the player's circle in
          // play; this debug switch keeps everyone's so the test can read them.
          const keptBefore = setKeepEveryonesWhy(true);
          try {
            both(addDays(makeIsoDate(race!.electionDate), 1));
          } finally {
            setKeepEveryonesWhy(keptBefore);
          }
          const kept = ballotsOn(api, race!.id).filter(
            (b) => b.turnoutReasons?.propensity !== undefined,
          );
          const theirs = new Map(
            ballotsOn(controlApi, race!.id).map((b) => [b.voterId, b]),
          );
          expect(kept.length, race!.id).toBeGreaterThan(5);
          let atCeiling = 0;
          for (const b of kept) {
            const r = b.turnoutReasons;
            expect(r.web?.links, b.id).toEqual([LINK]);
            expect(r.web!.recordId, b.id).toMatch(
              new RegExp(`^web:${placeId}:`),
            );
            const own = propensityOf(r as unknown as TurnoutParts);
            if (r.propensity! < 1)
              expect(r.propensity! / own, b.id).toBeCloseTo(1 + size, 9);
            else atCeiling += 1;
            const other = theirs.get(b.voterId);
            if (other?.turnoutReasons?.propensity !== undefined)
              expect(other.turnoutReasons.web, other.id).toBeUndefined();
          }
          expect(atCeiling).toBeLessThan(kept.length);
          const sample = kept[0]!;
          process.stdout.write(
            `CIVIC-WEB newspaper: ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): outlet ${paper.id} (business ${paper.organizationId}) closed ${closing}; web record ${row.id} read press.local-newspaper = 1 from ${paper.id}; ${MEASURE} ${row.values[MEASURE]!.toFixed(4)} against ${controlRow.values[MEASURE]!.toFixed(4)} in the control (${controlRow.id}), effect ${row.effects[LINK]}; ordinary day: ${seen.join("; ")}. Election day ${race!.electionDate}, ${race!.id}: ${kept.length} named voters' ballots keep the link, e.g. ${sample.id} propensity ${sample.turnoutReasons.propensity!.toFixed(4)} from its own parts ${Math.min(1, propensityOf(sample.turnoutReasons as unknown as TurnoutParts)).toFixed(4)} (${sample.turnoutReasons.web!.recordId}). Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had a local newspaper business: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});

describe("links the web cannot run without a reader stay unread", () => {
  it("newspaper-closure-to-borrowing-cost has no size, and the only borrowing reader prices the state", () => {
    const row = link("newspaper-closure-to-borrowing-cost");
    expect(row.size).toBeNull();
    expect(linkCoverage(row)).toMatchObject({ wired: false, needsSize: true });
    expect(
      (WIRED_INTO.get("gov.borrowing-cost") ?? []).map((l) => l.key),
    ).not.toContain(row.key);
  });

  it("press-attacks-to-media-trust has no size, no measure and no hostility record", () => {
    const row = link("press-attacks-to-media-trust");
    expect(row.size).toBeNull();
    expect(linkCoverage(row)).toMatchObject({ wired: false, needsSize: true });
    expect(linkCoverage(row)).toMatchObject({
      waitingOn: expect.arrayContaining([row.from, row.to]),
    });
  });
});
