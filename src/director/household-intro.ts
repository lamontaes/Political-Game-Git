/**
 * The first evening at home, said by the narrator: who lives under the player's
 * roof and how each is the player's family, from the household record and the
 * player's `family:<relation>` past facts. A member whose surname differs from
 * the player's is explained only by a record that ties them to one of the
 * player's parents (a grandparent, aunt or uncle); where no
 * record does, the line gives the relation alone and the member is reported in
 * `unexplained`, never given an invented reason.
 *
 * The sentences are the English engine's (`household` pieces in
 * `data/english/parts/scene-words.json`); this file only reads the records.
 */
import { relationPhrase } from "../english/journal-words";
import {
  wordSceneLine,
  type Fact,
  type NarrationMove,
  type SceneWords,
} from "../english/scene-words";
import type { CoreState, PersonId } from "../core2/types";

const PARENT_KINDS = new Set(["parent", "other-parent"]);
/** Relatives who come to the player through a parent's side of the family. */
const SIDE_KINDS = new Set(["grandparent", "aunt-or-uncle"]);

export interface HouseholdIntroLine {
  readonly personId: PersonId;
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
}

export interface HouseholdIntro {
  readonly lines: readonly HouseholdIntroLine[];
  /** Living members whose surname differs and whom no record ties to a parent. */
  readonly unexplained: readonly PersonId[];
}

interface Kin {
  relation: string;
  factId: string;
}

/** The family facts of one person, by the other person each names. */
function kinOf(core: CoreState, personId: PersonId): Map<PersonId, Kin> {
  const kin = new Map<PersonId, Kin>();
  for (const fact of core.people.get(personId)?.pastFacts ?? []) {
    const other = fact.facts?.otherPersonId as PersonId | undefined;
    if (other && fact.kind.startsWith("family:") && !kin.has(other))
      kin.set(other, {
        relation: fact.kind.slice("family:".length),
        factId: fact.id,
      });
  }
  return kin;
}

export function composeHouseholdIntro(
  core: CoreState,
  playerId: PersonId,
  words?: SceneWords,
): HouseholdIntro {
  const player = core.people.get(playerId);
  if (!player) return { lines: [], unexplained: [] };
  const kin = kinOf(core, playerId);
  const parents = [...kin]
    .filter(
      ([id, row]) => PARENT_KINDS.has(row.relation) && core.people.has(id),
    )
    .map(([id, row]) => ({ id, ...row }));
  const lines: HouseholdIntroLine[] = [];
  const unexplained: PersonId[] = [];
  const members = (core.households.get(player.householdId)?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter((row) => row?.alive && row.id !== playerId);
  for (const member of members) {
    if (!member) continue;
    const tie = kin.get(member.id);
    const gender = member.looks?.gender ?? "other";
    const relation = tie
      ? relationPhrase(tie.relation, gender, "scene")
      : undefined;
    const facts: Record<string, Fact> = {
      member: {
        text: `${member.givenName} ${member.familyName}`,
        sourceRecordIds: [member.id, player.householdId],
      },
    };
    let stage = "housemate";
    if (relation && tie) {
      facts.relation = { text: relation, sourceRecordIds: [tie.factId] };
      stage = "plain";
      if (member.familyName !== player.familyName) {
        // A grandparent, aunt or uncle whom a record ties to one of the
        // player's parents comes through that parent's side of the family;
        // a parent, sibling or child with another surname has no such record.
        const through = parents.find((parent) => {
          if (!SIDE_KINDS.has(tie.relation) || parent.id === member.id)
            return false;
          const down = kinOf(core, parent.id).get(member.id);
          const up = kinOf(core, member.id).get(parent.id);
          return Boolean(down || up);
        });
        const link = through
          ? (kinOf(core, through.id).get(member.id) ??
            kinOf(core, member.id).get(through.id))
          : undefined;
        const parentWord = through
          ? relationPhrase(
              through.relation,
              core.people.get(through.id)?.looks?.gender ?? "other",
              "scene",
            )
          : undefined;
        if (through && link && parentWord) {
          // The parent as a fact; the bank pieces say whose side it is.
          facts.parent = {
            text: parentWord,
            sourceRecordIds: [through.factId, link.factId],
          };
          stage = "side";
        } else unexplained.push(member.id);
      }
    }
    const move: NarrationMove = { part: "household" };
    const said = wordSceneLine({
      seed: core.seed,
      move,
      viewerId: playerId,
      facts,
      stage: () => stage,
      momentKey: `opening-home:${core.date}:${member.id}`,
      fallbackSourceId: player.householdId,
      ...(words ? { words } : {}),
    });
    if (said)
      lines.push({
        personId: member.id,
        text: said.text,
        sourceRecordIds: said.sourceRecordIds,
      });
  }
  return { lines, unexplained };
}
