/**
 * The opening's sequence (owner, Oct 14, 2026, late): the President giving
 * the address with the Vice President and key people behind; then Congress,
 * its leaders and the player's state's members; then the governor with a few
 * leaders of the state legislature; then the player's family, if they have
 * one; then home. This file picks who stands in each stage and is pointed
 * out by name and office, from the offices and leadership records, in the
 * rank order `data/opening-story.json` lists. Who the key people are is the
 * owner's call; until he rules the pick is a registered owner-decision
 * stopgap (SG-PEOPLE-opening-key-people).
 */
import leadershipData from "../../data/research/legislature/chamber-leadership.json" with { type: "json" };
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID, townSeats } from "../core2/modules/offices";
import { leaderOf } from "../core2/modules/leadership";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { officialOf } from "../core2/modules/officials";
import { coreStateName } from "../core2/place-lookup";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreAPI, CoreState, PersonId } from "../core2/types";
import openingData from "./data/opening-story.json" with { type: "json" };
import { markWordsStopgap } from "./stopgaps";

/** One person a stage points out: their name and office, from the records. */
export interface OpeningFigure {
  readonly id: string;
  readonly name: string;
  /** Their post in a chamber (a Speaker, a majority leader), by its title. */
  readonly post: string | null;
  /** Their office, by its title. */
  readonly office: string | null;
  /** Their state's name, when it isn't the player's. */
  readonly state: string | null;
  readonly sourceRecordIds: readonly string[];
}

export interface OpeningStage {
  readonly stage: string;
  /** The parts of the address that play over this stage. */
  readonly levels: readonly string[];
  readonly people: readonly OpeningFigure[];
}

interface PersonRule {
  readonly office?: string;
  readonly chamber?: string;
  readonly post?: string;
  readonly household?: boolean;
}
interface StageRule {
  readonly stage: string;
  readonly levels: readonly string[];
  readonly people: readonly PersonRule[];
  readonly most?: number;
  readonly else?: string;
}
const DATA = (
  openingData as unknown as {
    sequence: { stopgapId: string; stages: readonly StageRule[] };
  }
).sequence;

const POSTS = leadershipData as unknown as {
  tables: Record<string, { id: string; value: unknown }[]>;
};
/** A chamber kind's leadership template, as chamber-leadership.json names it. */
const TEMPLATE: Readonly<Record<string, string>> = {
  "federal-house": "federal-house",
  "federal-senate": "federal-senate",
  "legislature-lower": "state-house",
  "legislature-upper": "state-senate",
  "legislature-unicameral": "unicameral",
};
function postTitle(chamberKind: string, post: string): string | null {
  const template = TEMPLATE[chamberKind];
  const row = POSTS.tables.posts?.find((r) => r.id === `${template}:posts`);
  return (
    (row?.value as { key: string; title: string }[] | undefined)?.find(
      (p) => p.key === post,
    )?.title ?? null
  );
}

/** The offices of a jurisdiction (a state's chambers and executive offices). */
function officesOf(
  api: CoreAPI,
  jurisdiction: string | null,
): readonly { id: string; kind: string; title: string }[] {
  if (!jurisdiction) return [];
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .query("byJurisdiction", [jurisdiction]) as unknown as {
    id: string;
    kind: string;
    title: string;
  }[];
}

/** The player's state, by its jurisdiction key. */
function stateOf(core: CoreState, playerId: PersonId): string | null {
  const player = core.people.get(playerId);
  return player
    ? (corePlaceByJurisdictionId(player.placeId as never)
        ?.stateJurisdictionKey ?? null)
    : null;
}

/** The chamber a rule names: Congress's two, or the player's state's own by kind. */
function chamberOf(
  api: CoreAPI,
  chamberKind: string,
  state: string | null,
): string | null {
  if (chamberKind === "federal-house") return FEDERAL_HOUSE;
  if (chamberKind === "federal-senate") return FEDERAL_SENATE;
  return (
    officesOf(api, state).find((row) => row.kind === chamberKind)?.id ?? null
  );
}

/** The chambers the sequence reads leaders of, organized as their rules say. */
export function openingChambers(
  core: CoreState,
  playerId: PersonId,
): readonly string[] {
  const api = coreAPI(core);
  const state = stateOf(core, playerId);
  return [
    ...new Set(
      DATA.stages.flatMap((stage) =>
        stage.people.flatMap((rule) => {
          const chamber = rule.chamber
            ? chamberOf(api, rule.chamber, state)
            : null;
          return chamber ? [chamber] : [];
        }),
      ),
    ),
  ];
}

/**
 * The opening's stages and who each points out. Reads only: the chambers'
 * leaders are read where their engine organized them (the opening organizes
 * them at loading, `recordOpeningStory`).
 */
export function openingSequence(
  core: CoreState,
  playerId: PersonId,
  presidentId: PersonId,
): readonly OpeningStage[] {
  markWordsStopgap(DATA.stopgapId);
  const api = coreAPI(core);
  const player = core.people.get(playerId);
  if (!player) return [];
  const seats = townSeats(api);
  const ownState = stateOf(core, playerId);
  // An office's title by its kind: the town's own seat of that kind, else
  // the state's or the nation's office of that kind.
  const titleOfKind = (kind: string | undefined) =>
    seats.find((row) => row.office.kind === kind)?.office.title ??
    [...officesOf(api, ownState), ...officesOf(api, "US")].find(
      (row) => row.kind === kind,
    )?.title ??
    null;
  const taken = new Set<string>([playerId, presidentId]);
  const figuresOf = (rule: PersonRule): OpeningFigure[] => {
    if (rule.household)
      return (core.households.get(player.householdId)?.memberIds ?? [])
        .map((id) => core.people.get(id))
        .filter((row) => row?.alive)
        .map((row) => ({
          id: row!.id,
          name: `${row!.givenName} ${row!.familyName}`,
          post: null,
          office: null,
          state: null,
          sourceRecordIds: [player.householdId, row!.id],
        }));
    if (rule.office)
      return seats
        .filter((row) => row.office.kind === rule.office && row.holder)
        .map(({ office, seat, holder }) => ({
          id: holder!.personId ?? holder!.id,
          name: `${holder!.identity.givenName} ${holder!.identity.familyName}`,
          post: null,
          office: office.title,
          state: null,
          sourceRecordIds: [seat.id, holder!.id],
        }));
    const chamber =
      rule.chamber && rule.post ? chamberOf(api, rule.chamber, ownState) : null;
    const id = chamber ? leaderOf(api, chamber, rule.post!) : null;
    // The holder as the chamber's roll has them: a member not yet filled in
    // as a person is still named by their term.
    const term = id
      ? members(api, chamber!).find((row) => memberKey(row) === id)
      : undefined;
    const person = id ? core.people.get(id) : undefined;
    const name = person
      ? `${person.givenName} ${person.familyName}`
      : term
        ? `${term.identity.givenName} ${term.identity.familyName}`
        : null;
    if (!chamber || !id || !name) return [];
    const official = officialOf(api, id);
    const state = official?.stateKey;
    const office = term
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(term.officeId) as { title?: string } | undefined)
      : undefined;
    return [
      {
        id,
        name,
        post: postTitle(rule.chamber!, rule.post!),
        office: office?.title ?? titleOfKind(official?.officeKind),
        state:
          state && state !== ownState
            ? (coreStateName(state.replace(/^US-/, "")) ?? null)
            : null,
        sourceRecordIds: [
          `${chamber}:${rule.post}`,
          ...(term ? [term.seatId] : official ? [official.seatId] : []),
        ],
      },
    ];
  };
  return DATA.stages.map((stage) => {
    const people: OpeningFigure[] = [];
    for (const rule of stage.people)
      for (const figure of figuresOf(rule)) {
        if (taken.has(figure.id)) continue;
        if (stage.most !== undefined && people.length >= stage.most) break;
        taken.add(figure.id);
        people.push(figure);
      }
    return { stage: stage.stage, levels: stage.levels, people };
  });
}

/** The stage each part of the address plays over, a stage with no one handing its parts on. */
export function stageOfLevel(
  stages: readonly OpeningStage[],
): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const stage of stages) {
    const rule = DATA.stages.find((row) => row.stage === stage.stage);
    const to = !stage.people.length && rule?.else ? rule.else : stage.stage;
    for (const level of stage.levels) out.set(level, to);
  }
  return out;
}
