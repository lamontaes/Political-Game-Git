/**
 * The effects lead's acceptance (pool item effects-end-to-end-proof): one
 * researched outcome-web link followed through a played year, from its cause
 * to a named person and what they think, by record id. Unemployment above 4%
 * raises property crime about 3% a point (Raphael and Winter-Ebmer 2001,
 * data/research/outcome-web/links.json):
 *
 * 1. the cause is the economy's month record the web read the town's
 *    unemployment from (the web month's engine source);
 * 2. the web month carries the link's effect on the crime outcome;
 * 3. the crime engine reads that factor when it decides how many of the
 *    town's households are victimized, and names the links behind it;
 * 4. its victimization record names a household of full people;
 * 5. each of them lives it and takes it as a reason for the side they
 *    already hold on police spending, the stance citing the record.
 *
 * The research's size is a share a point of unemployment above 4%, so the
 * link raises the rate only in a month the town's unemployment is above it;
 * the victims' own views are what move them, never a roll.
 *
 * Played in the bench world with every module, in a place drawn from all 56
 * on a seed nobody chose. A town's few hundred full households see a handful
 * of crimes a year, often none, so a year with no victimization that moved
 * someone while the link ran is drawn again, a bounded number of times, and
 * the draw says why.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CRIME_EVENT, CRIME_MODULE_ID, type CrimeMonth } from "./modules/crime";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import {
  registerStanceListener,
  viewOf,
  viewOn,
  VIEWS_MODULE_ID,
  type Stance,
} from "./modules/views";
import { WORLD_METRICS_MODULE_ID } from "./modules/world-metrics";
import { livedQuestion } from "./outcome-news";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed =
  process.env.EFFECTS_END_TO_END_SEED || randomBytes(8).toString("hex");
const DRAWS = 12;
const CAUSE = "labor.unemployment-pct";
const POLICE = livedQuestion(CRIME_EVENT)!;
/** The researched links from unemployment to a kind of crime the engine decides. */
const LINKS = new Set(
  WEB_LINKS.filter(
    (link) => link.from === CAUSE && link.to.startsWith("crime."),
  ).map((link) => link.key),
);

interface Move {
  readonly personId: string;
  readonly householdId: string | undefined;
  readonly cause: Stance["causes"][number];
  /** The side the person's view holds after the move; a lived crime only firms it up. */
  readonly side: "enact" | "repeal" | null;
  readonly viewNow: number;
  /** The stance as a signed amount (enact positive) before and after the write. */
  readonly signedBefore: number | undefined;
  readonly signedNow: number;
  readonly causesToday: number;
}
const MOVES = new WeakMap<object, Move[]>();
const SIGNED = new WeakMap<object, Map<string, number>>();
const signed = (stance: Stance) =>
  (stance.desiredChange === "enact" ? 1 : -1) * stance.strength;
registerStanceListener((api, personId, topic) => {
  if (topic !== POLICE) return;
  const stance = api
    .moduleState(VIEWS_MODULE_ID)
    .table("stances")
    .get(`${personId}:${topic}`) as unknown as Stance;
  const moves = MOVES.get(api.state) ?? [];
  MOVES.set(api.state, moves);
  const view = viewOf(api, personId);
  const viewNow = view ? viewOn(api, personId, topic, view.lean) : 0;
  const last = SIGNED.get(api.state) ?? new Map<string, number>();
  SIGNED.set(api.state, last);
  const signedBefore = last.get(personId);
  last.set(personId, signed(stance));
  const causesToday = stance.causes.filter(
    (cause) => cause.date === api.state.date,
  ).length;
  for (const cause of stance.causes)
    if (
      cause.date === api.state.date &&
      cause.eventId.startsWith(`${CRIME_EVENT}:`)
    )
      moves.push({
        personId,
        householdId: (api.state as CoreState).people.get(personId)?.householdId,
        cause,
        side: viewNow > 0 ? "enact" : viewNow < 0 ? "repeal" : null,
        viewNow,
        signedBefore,
        signedNow: signed(stance),
        causesToday,
      });
});

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "effects-end-to-end");
  const core = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const api = coreAPI(core);
  let day = makeIsoDate(core.date);
  const end = addDays(day, 365);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  const moves = MOVES.get(core) ?? [];
  const months = api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .rows() as unknown as CrimeMonth[];
  const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  // A victimization whose kind's factor an unemployment link raised that
  // month, and that moved someone it names.
  const found = months
    .flatMap((month) =>
      month.victims.map((victim) => {
        const row = month.webRecordId
          ? (web.get(month.webRecordId) as unknown as WebMonth | undefined)
          : undefined;
        return {
          victim,
          month,
          links: month.types[victim.type].links.filter(
            (key) => LINKS.has(key) && (row?.effects[key] ?? 0) > 0,
          ),
          moved: moves.filter((move) => move.cause.eventId === victim.eventId),
        };
      }),
    )
    .filter((row) => row.links.length && row.moved.length)
    .sort((a, b) => a.victim.eventId.localeCompare(b.victim.eventId))[0];
  return { place, core, api, months, found };
}

describe(`unemployment to a named victim's view on the police (seed ${seed})`, () => {
  it("follows the link from the economy's record through the web month and the crime engine to a person's stance, by record id", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      const tried: string[] = [];
      let drawSeed = seed;
      let run = play(drawSeed);
      for (let draw = 1; draw < DRAWS && !run.found; draw += 1) {
        const victims = run.months.reduce((n, m) => n + m.victims.length, 0);
        tried.push(
          `${run.place.name}, ${run.place.state} (${drawSeed}): ${victims} full-household victimizations, none that moved someone on a month an unemployment link raised its kind`,
        );
        drawSeed = `${seed}-${draw}`;
        run = play(drawSeed);
      }
      const where = `${run.place.name}, ${run.place.state}, seed ${drawSeed}`;
      if (!run.found)
        throw new Error(
          `no drawn place in ${DRAWS} draws had a victimization on a month an unemployment link raised its kind: ${tried.join("; ")}`,
        );
      const { api, found } = run;
      const { victim, month, links, moved } = found;

      // 2. The web month the crime engine's factor stands on carries the link.
      expect(month.webRecordId, where).toBeTruthy();
      const web = api
        .moduleState(OUTCOME_WEB_MODULE_ID)
        .table("months")
        .get(month.webRecordId!) as unknown as WebMonth | undefined;
      expect(web, `${where}: ${month.webRecordId}`).toBeDefined();
      for (const key of links)
        expect(
          web!.effects[key],
          `${where}: ${web!.id} ${key}`,
        ).toBeGreaterThan(0);

      // 1. The cause: the economy's month record the web read unemployment from.
      const causeId = web!.engineSources[CAUSE];
      expect(
        causeId,
        `${where}: ${web!.id} cites its unemployment record`,
      ).toBeTruthy();
      const cause = api
        .moduleState(WORLD_METRICS_MODULE_ID)
        .table("months")
        .get(causeId!) as unknown as
        { placeId: string; date: string } | undefined;
      expect(cause, `${where}: ${causeId}`).toBeDefined();
      expect(cause!.placeId, `${where}: ${causeId}`).toBe(web!.placeId);
      // The research's size is a share a point above 4% unemployment, so the
      // link raises the rate only above it.
      const unemployment = web!.values[CAUSE]!;
      expect(unemployment, `${where}: ${web!.id}`).toBeGreaterThan(4);
      // Each link's effect is its researched size for each point above 4%.
      for (const key of links) {
        const link = WEB_LINKS.find((row) => row.key === key)!;
        const sizes = [
          link.size!,
          ...Object.values(link.sizeByPlace ?? {}).map((row) => row.size),
        ];
        const perPoint = web!.effects[key]! / (unemployment - 4);
        expect(
          sizes.some((size) => Math.abs(size - perPoint) < 1e-9),
          `${where}: ${key} ${perPoint}`,
        ).toBe(true);
      }

      // 3. The crime engine read the factor, these links among those behind it.
      const kind = month.types[victim.type];
      expect(kind.links, `${where}: ${month.id} ${victim.type}`).toEqual(
        expect.arrayContaining(links),
      );
      const behind = kind.links
        .map(
          (key) =>
            `${key} ${web!.effects[key]! >= 0 ? "+" : ""}${web!.effects[key]!.toFixed(4)}`,
        )
        .join(", ");

      // 4 and 5. The record names the household; each person it moved is in
      // it, by their own experience, toward the side their view holds.
      for (const move of moved) {
        const at = `${where}: ${victim.eventId} ${move.personId}`;
        expect(move.householdId, at).toBe(victim.householdId);
        expect(move.cause.speakerId, at).toBeUndefined();
        expect(move.cause.change, at).toBeGreaterThan(0);
        // A reason against a stance weakens it and keeps its side while
        // strength is left, so the direction is read from the signed stance.
        expect(move.side, at).not.toBeNull();
        if (move.signedBefore !== undefined && move.causesToday === 1)
          expect(
            (move.signedNow - move.signedBefore) *
              (move.side === "enact" ? 1 : -1),
            at,
          ).toBeGreaterThanOrEqual(0);
      }
      const person = moved[0]!;
      console.log(
        `effects end to end: ${where}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}: ` +
          `cause ${causeId} (unemployment ${unemployment.toFixed(2)}%) -> ` +
          `web month ${web!.id} (${links.map((key) => `${key} +${web!.effects[key]!.toFixed(4)}`).join(", ")}) -> ` +
          `crime month ${month.id} (${victim.type} factor ${kind.factor.toFixed(4)} from ${behind}; expected ${kind.expected.toFixed(3)}) -> ` +
          `victimization ${victim.eventId} (household ${victim.householdId}) -> ` +
          `${person.personId}'s stance on ${POLICE} moved ${person.cause.change.toFixed(4)} toward ${person.side}, citing ${person.cause.eventId}` +
          (moved.length > 1
            ? `; ${moved.length - 1} more in the household moved`
            : ""),
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 5_400_000);
});
