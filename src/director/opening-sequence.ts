/**
 * The opening's sequence (owner, Oct 14, 2026, late): the President giving
 * the address with the Vice President and key people behind; then Congress,
 * the player's own senators and representative; then the state, the council
 * and the state's legislators; then the player's family, if they have one;
 * then home. Who the key people are is one list the owner ruled on Oct 15
 * (`src/core2/opening-key-people.ts`), shared with the Politics screen; this
 * file only says which of them each stage points out, by the reasons
 * `data/opening-story.json` lists.
 */
import leadershipData from "../../data/research/legislature/chamber-leadership.json" with { type: "json" };
import {
  keyChambersOf,
  keyPeopleOf,
  type KeyPerson,
  type KeyReason,
} from "../core2/opening-key-people";
import { coreStateName } from "../core2/place-lookup";
import type { CoreState, PersonId } from "../core2/types";
import openingData from "./data/opening-story.json" with { type: "json" };
import journalRows from "./data/journal-rows.json" with { type: "json" };

/** One person a stage points out: their name and office, from the records. */
export interface OpeningFigure {
  readonly id: string;
  readonly name: string;
  /** Their post in a chamber (a Speaker, a majority leader), by its title. */
  readonly post: string | null;
  /** Their office, by its title. */
  readonly office: string | null;
  /** Their state's name, from their seat or term (none for a national office). */
  readonly state: string | null;
  /** A household member's relation to the player, by the family fact that records it. */
  readonly relation: string | null;
  /** The rule that picked them: "household", "key:vice-president", "key:chamber-leader:federal:speaker". */
  readonly role: string;
  /**
   * Why they are pointed out: the address sentence that names them (its
   * index in the address), or the player's own household. Set by the
   * opening story; a figure with no reason is not pointed out.
   */
  readonly namedBy?: number;
  readonly sourceRecordIds: readonly string[];
}

export interface OpeningStage {
  readonly stage: string;
  /** The parts of the address that play over this stage. */
  readonly levels: readonly string[];
  readonly people: readonly OpeningFigure[];
}

interface PersonRule {
  readonly reason?: KeyReason;
  /** For a chamber's most powerful person: Congress's two chambers or the state's own. */
  readonly scope?: "federal" | "state";
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
    sequence: { stages: readonly StageRule[] };
  }
).sequence;

const POSTS = leadershipData as unknown as {
  tables: Record<string, { id: string; value: unknown }[]>;
};
/** A chamber kind's leadership template, as chamber-leadership.json names it. */
const TEMPLATE: Readonly<Record<string, string>> = {
  "us-house": "federal-house",
  "us-senate": "federal-senate",
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

const RELATION_WORDS = (
  journalRows as unknown as {
    relationWords: Record<string, Record<string, string>>;
  }
).relationWords;

/** A state's name from a jurisdiction or state key ("US-WV"), else null. */
const stateName = (key: string | null | undefined) =>
  key && /^US-[A-Z]{2}$/.test(key)
    ? (coreStateName(key.replace(/^US-/, "")) ?? null)
    : null;

/** The chambers the sequence reads leaders of, organized as their rules say. */
export function openingChambers(
  core: CoreState,
  playerId: PersonId,
): readonly string[] {
  return keyChambersOf(core, playerId);
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
  const player = core.people.get(playerId);
  if (!player) return [];
  const keyPeople = keyPeopleOf(core, playerId);
  const federal = (row: KeyPerson) =>
    row.officeKind === "us-house" || row.officeKind === "us-senate";
  const taken = new Set<string>([playerId, presidentId]);
  const figuresOf = (rule: PersonRule): OpeningFigure[] => {
    if (rule.household) {
      // Each member by their relation to the player, from the family fact.
      const kin = new Map<string, { relation: string; factId: string }>();
      for (const fact of player.pastFacts ?? []) {
        const other = fact.facts?.otherPersonId;
        if (other && fact.kind.startsWith("family:") && !kin.has(other))
          kin.set(other, {
            relation: fact.kind.slice("family:".length),
            factId: fact.id,
          });
      }
      return (core.households.get(player.householdId)?.memberIds ?? [])
        .map((id) => core.people.get(id))
        .filter((row) => row?.alive)
        .map((row) => {
          const of = kin.get(row!.id);
          const words = of ? RELATION_WORDS[of.relation] : undefined;
          const relation =
            words?.[row!.looks?.gender ?? "other"] ?? words?.other ?? null;
          return {
            id: row!.id,
            name: `${row!.givenName} ${row!.familyName}`,
            post: null,
            office: null,
            state: null,
            relation,
            role: "household",
            sourceRecordIds: [
              player.householdId,
              row!.id,
              ...(of && relation ? [of.factId] : []),
            ],
          };
        });
    }
    // The key people who are key for the rule's reason, each as the records name them.
    return keyPeople
      .filter(
        (row) =>
          rule.reason !== undefined &&
          row.reasons.includes(rule.reason) &&
          (rule.reason !== "chamber-leader" ||
            (rule.scope === "federal") === federal(row)),
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        post: row.leads ? postTitle(row.officeKind, row.leads.post) : null,
        office: row.officeTitle || null,
        state: stateName(row.stateKey),
        relation: null,
        role: row.leads
          ? `key:${rule.reason}:${rule.scope}:${row.leads.post}`
          : `key:${rule.reason}`,
        sourceRecordIds: row.sourceRecordIds,
      }));
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
