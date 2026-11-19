/**
 * A housemate's stand on the President's point from the rest of their own
 * life (CTO, Nov 18 08:47Z, Story thread: "widen `has-reason` to a lease, a
 * relative in the house and a story read"; item
 * director-address-point-reasons-lease-relative-story). In places drawn from
 * all 56, each of the three reasons is found in a household by its records,
 * never by a hand-made point:
 *
 * - `lease`: the household rents and a month's rent is above HUD's burden
 *   share of its month of income on its books; the pick cites the lease;
 * - `relative`: someone else in the house the point's question touches (a
 *   child in school, someone on Medicare, a retiree, a college student),
 *   never the listener; the pick cites that person's record;
 * - `story`: a printed story the speaker heard on the point (the paper's
 *   story of the address itself, which is printed about a week after it is
 *   given); the pick cites the story.
 *
 * Only the player's household has heard the address on the opening evening;
 * the town hears of it over the next days. So each drawn world is read on the
 * opening evening and then a day at a time through the days the address is
 * still the day's news at home (directorTalkAddressDays), for each reason its
 * address can give, and the pass line says which day and house each was found in.
 *
 * For each, the point raised between the two (`subjectsBetween`) carries the
 * reason's mark with that record id, and its slot facts. Every place passed
 * over is named with what its housemates' points stood on.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storiesHeard } from "../core2/modules/news";
import { familyFactsOf } from "../core2/modules/people";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  addressPointFor,
  subjectsBetween,
  takesStands,
  type PointPick,
} from "./conversation";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { questionAbout, questionTo } from "../english/question-names";
import {
  ADDRESS_FACT,
  addressPoints,
  type AddressPoint,
} from "./opening-facts";
import rules from "./data/conversation-rules.json" with { type: "json" };

const RULES = rules.addressPoint;
const HARDSHIP = rules.stands.reasonFits.questions;

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 16;
/** Draws made for a reason on the address's own point before a hand-made one settles it. */
const REAL_DRAWS = 8;
const POINT = "address-point";
/** HUD's cost-burden share of income (director parameter). */
const BURDEN = DEFAULT_DIRECTOR_DATA.parameters.directorRentBurdenShare!.value;
/** The days the address is still the day's news at home (director parameter). */
const TALK_DAYS =
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkAddressDays!.value;
type Wanted = "lease" | "relative" | "story";
const WANTED: readonly Wanted[] = ["lease", "relative", "story"];

/** Every pair of living people who share a household, the speaker first, by id. */
function housePairs(core: CoreState): [PersonId, PersonId][] {
  const out: [PersonId, PersonId][] = [];
  for (const household of [...core.households.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const alive = [...household.memberIds]
      .filter((id) => core.people.get(id)?.alive)
      .sort();
    for (const speaker of alive)
      for (const listener of alive)
        if (speaker !== listener) out.push([speaker, listener]);
  }
  return out;
}

/** The catalog's questions a reason's rows list, in order: its own rows, then (a lease) the hardship fits. */
function catalogQuestions(reason: "lease" | "relative"): string[] {
  const own = Object.keys(RULES[reason].questions);
  const fits =
    reason === "lease"
      ? Object.entries(HARDSHIP as Record<string, Record<string, string>>)
          .filter(([, sides]) => Object.values(sides).includes("hardship"))
          .map(([question]) => question)
      : [];
  return [...new Set([...own, ...fits])].filter((question) =>
    questionAbout(question),
  );
}

/** A point of the bill catalog on a question, for an address that has none the rows list. */
function catalogPoint(question: string): AddressPoint {
  return {
    kind: "policy",
    question,
    about: questionAbout(question)!,
    to: questionTo(question)!,
    stance: "for",
    sourceRecordIds: [`question:${question}`],
  };
}

/** The record a reason must cite: the lease, the relative's person record, the story. */
function citedRecord(pick: PointPick): string {
  const life = pick.life!;
  return life.reason === "lease"
    ? life.leaseId
    : life.reason === "relative"
      ? life.relativeId
      : life.storyId;
}

it(`a housemate's stand on the address's point can come from their lease, a relative in the house or a story they read (seed ${seed})`, () => {
  const found = new Map<Wanted, string>();
  /** A lease or relative found only on a hand-made point of the catalog. */
  const hand = new Map<Wanted, string>();
  const settled = (reason: Wanted) => found.has(reason) || hand.has(reason);
  const passed: string[] = [];
  for (
    let draw = 0;
    draw < ATTEMPTS &&
    !(
      found.size === WANTED.length ||
      (draw >= REAL_DRAWS && WANTED.every(settled))
    );
    draw += 1
  ) {
    const place = drawPlace(`${seed}:${draw}`, "address-reasons");
    setBookkeeping(false);
    let built: ReturnType<typeof buildBenchWorld>;
    try {
      built = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      passed.push(
        `${place.name} (${place.key}): no world (${String(error).slice(0, 80)})`,
      );
      continue;
    }
    const { core, director } = built;
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const points = addressPoints(director.ledger.opening!);
    const opened = core.date;
    const seen: Record<string, number> = {};
    // Look at every household pair on a day for the reasons still missing;
    // what the points stood on is counted on the opening evening.
    const look = (only: readonly Wanted[]) => {
      const count = core.date === opened;
      for (const [speaker, listener] of housePairs(core)) {
        if (
          !takesStands(core, speaker) ||
          !core.knowledgeByPerson.get(speaker)?.get(ADDRESS_FACT.event)
        )
          continue;
        const pick = addressPointFor(core, speaker, points, listener, director);
        if (!pick) continue;
        if (count) seen[pick.reason] = (seen[pick.reason] ?? 0) + 1;
        else if (pick.reason === "story")
          seen["story later"] = (seen["story later"] ?? 0) + 1;
        const reason = pick.reason as Wanted;
        if (!only.includes(reason) || found.has(reason)) continue;
        const here = `${where}, ${core.date}${
          core.date === opened ? " (the opening evening)" : ""
        }${
          core.people.get(speaker)!.householdId ===
          core.people.get(built.playerId as PersonId)!.householdId
            ? " in the player's house"
            : ""
        }: ${speaker} to ${listener}`;
        // The pick cites its record, and the record is real.
        const record = citedRecord(pick);
        expect(pick.reasonIds, here).toContain(record);
        if (reason === "lease") {
          const lease = core.finance.contracts.get(record);
          expect(lease?.householdId, here).toBe(
            core.people.get(speaker)!.householdId,
          );
          expect(lease?.endedAt, here).toBeUndefined();
          // A month's rent above HUD's burden share of a month's income on
          // the household's books, and some income to weigh it against.
          const life = pick.life as Extract<
            NonNullable<PointPick["life"]>,
            { reason: "lease" }
          >;
          expect(life.incomeMinor, here).toBeGreaterThan(0);
          expect(life.rentMinor, here).toBeGreaterThan(
            life.incomeMinor * BURDEN,
          );
        }
        if (reason === "relative") {
          const relative = core.people.get(record as PersonId);
          expect(relative?.householdId, here).toBe(
            core.people.get(speaker)!.householdId,
          );
          expect(record, here).not.toBe(listener);
          expect(record, here).not.toBe(speaker);
        }
        if (reason === "story")
          expect(
            storiesHeard(coreAPI(core), speaker).some(
              (row) => row.id === record,
            ),
            here,
          ).toBe(true);
        // The point raised between the two carries the mark with that
        // record, and the slot facts the words need.
        const subject = subjectsBetween(core, speaker, listener, director).find(
          (row) => row.kind === POINT,
        );
        expect(subject?.point?.reason, `${here}: the point raised`).toBe(
          reason,
        );
        expect(
          subject!.facts[`why-${reason}`]?.sourceRecordIds,
          `${here}: why-${reason}`,
        ).toContain(record);
        if (reason === "relative") {
          const life = pick.life as Extract<
            NonNullable<PointPick["life"]>,
            { reason: "relative" }
          >;
          expect(subject!.facts.relative?.text, here).toBeTruthy();
          expect(
            subject!.facts[`relative-${life.touches}`]?.sourceRecordIds,
            here,
          ).toContain(record);
        }
        if (reason === "story")
          expect(subject!.facts["story-ran"]?.text, here).toBeTruthy();
        found.set(
          reason,
          `${here} on ${pick.point.about}: ${reason} cites ${pick.reasonIds.join(", ")}${
            reason === "lease"
              ? ` (rent ${(pick.life as { rentMinor: number }).rentMinor} a month on ${(pick.life as { incomeMinor: number }).incomeMinor} of income, cents)`
              : reason === "relative"
                ? ` (${subject!.facts.relative!.text}; the speaker's tie ${
                    familyFactsOf(core.people.get(speaker)!).get(
                      record as PersonId,
                    )?.relation ?? "none"
                  }, the listener's ${
                    familyFactsOf(core.people.get(listener)!).get(
                      record as PersonId,
                    )?.relation ?? "none"
                  }; ${
                    Object.keys(subject!.facts).find(
                      (key) =>
                        key.startsWith("relative-") &&
                        !key.endsWith("-he") &&
                        !key.endsWith("-she") &&
                        !key.endsWith("-they") &&
                        key !== "relative-kin",
                    ) ?? ""
                  })`
                : ""
          }`,
        );
      }
    };
    // The opening evening first. Only the player's household has heard the
    // address that evening; the rest of the town hears of it in the days
    // after, and a story is printed about a week on. So the world runs a day
    // at a time through the days the address is still talked about at home,
    // for each reason this world's address can give: a lease or a relative
    // only for a question their rows list, a story for any.
    // (A lease fits a question its rows list or one a household's hardship
    // fits, `stands.reasonFits`.)
    const listed = (reason: Wanted, question: string) =>
      !!(RULES as Record<string, { questions?: Record<string, unknown> }>)[
        reason
      ]?.questions?.[question] ||
      (reason === "lease" &&
        Object.values(
          (HARDSHIP as Record<string, Record<string, string>>)[question] ?? {},
        ).includes("hardship"));
    const can = (reason: Wanted) =>
      reason === "story" || points.some((row) => listed(reason, row.question));
    const open = () =>
      WANTED.filter((reason) => !found.has(reason) && can(reason));
    look(open());
    // A lease or a relative the address's own question gives no row for is
    // still looked for, on a point of the bill catalog the rows list, as the
    // work point beside this one is (conversation-address-talk.test.ts): a
    // hand-made point, checked through the picker only (the talk raises the
    // address's own points), over every household of the drawn world on the
    // opening evening, and said as such in the pass line.
    for (const reason of ["lease", "relative"] as const) {
      if (settled(reason)) continue;
      for (const question of catalogQuestions(reason)) {
        if (hand.has(reason)) break;
        const point = catalogPoint(question);
        for (const [speaker, listener] of housePairs(core)) {
          if (!takesStands(core, speaker)) continue;
          const pick = addressPointFor(
            core,
            speaker,
            [point],
            listener,
            director,
          );
          if (pick?.reason !== reason) continue;
          const here = `${where}, ${core.date}, hand-made point: ${speaker} to ${listener}`;
          const record = citedRecord(pick);
          expect(pick.reasonIds, here).toContain(record);
          if (reason === "lease") {
            const life = pick.life as Extract<
              NonNullable<PointPick["life"]>,
              { reason: "lease" }
            >;
            expect(core.finance.contracts.get(record)?.householdId, here).toBe(
              core.people.get(speaker)!.householdId,
            );
            expect(life.incomeMinor, here).toBeGreaterThan(0);
            expect(life.rentMinor, here).toBeGreaterThan(
              life.incomeMinor * BURDEN,
            );
          } else {
            expect(core.people.get(record as PersonId)?.householdId, here).toBe(
              core.people.get(speaker)!.householdId,
            );
            expect(record, here).not.toBe(listener);
          }
          hand.set(
            reason,
            `${here} on ${point.about}: ${reason} cites ${pick.reasonIds.join(", ")}`,
          );
          break;
        }
      }
    }
    for (let day = 1; day <= TALK_DAYS && open().length; day += 1) {
      advanceCore(core, addDays(makeIsoDate(opened), day));
      look(open());
    }
    passed.push(
      `${where} (${points.map((row) => row.question).join(", ")}), ${opened} to ${core.date}: ${
        Object.entries(seen)
          .map(([key, count]) => `${key} ${count}`)
          .join(", ") || "no point raised"
      }`,
    );
  }
  process.stdout.write(
    `ADDRESS REASONS ${seed}: found ${[...found.values()].join("; ")}; on a hand-made point ${[...hand.values()].join("; ") || "none"}; drew ${passed.join("; ")}\n`,
  );
  // A story is found on the address's own point; a lease or a relative on
  // it, else on the catalog's.
  expect(
    WANTED.filter((reason) =>
      reason === "story" ? !found.has(reason) : !settled(reason),
    ),
    `none found; drew ${passed.join("; ")}`,
  ).toEqual([]);
}, 3_600_000);
