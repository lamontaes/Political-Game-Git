import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { relationWord } from "../bench/words";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { JOURNAL_WORDS } from "../english/journal-words";
import { composeJournal } from "./journal";

// A relative is "my mother" or "my father", never "my parent", wherever their
// record carries a sex (words-parent-named-mother-or-father): the Journal's
// opening on the first evening and the person card both say the kin word
// that record gives. "Parent" is kept for a relative recorded as neither,
// who is named here by record id as a finding.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "journal-kin-words");

it(`the Journal and the card say mother or father where the record has a sex, ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId! as PersonId;
  const player = core.people.get(playerId)!;
  const where = `${place.name} (${place.key}), seed ${seed}`;
  // Play watches the player and their household (src/bench/player.ts).
  director.watch(core, playerId);
  for (const id of core.households.get(player.householdId)?.memberIds ?? [])
    if (id !== playerId) director.watch(core, id as PersonId);
  const lines = composeJournal(core, director, playerId).flatMap(
    (chapter) => chapter.lines,
  );
  const findings: string[] = [];
  let checked = 0;
  let told = 0;
  for (const fact of player.pastFacts ?? []) {
    const otherId = fact.facts?.otherPersonId;
    if (!fact.kind.startsWith("family:") || !otherId) continue;
    const relation = fact.kind.slice("family:".length);
    const forms = JOURNAL_WORDS.relationWords[relation];
    if (!forms) continue;
    const gender = core.people.get(otherId as PersonId)?.looks?.gender;
    const word = relationWord(core, otherId, relation);
    if (gender !== "male" && gender !== "female") {
      findings.push(`${otherId} (${relation}, recorded ${gender ?? "no sex"})`);
      continue;
    }
    checked += 1;
    // The card's word.
    expect(word, `${where}: card for ${otherId} (${relation})`).toBe(
      forms[gender],
    );
    // Every Journal line that cites this relative's kin fact.
    for (const line of lines.filter((row) =>
      row.sourceRecordIds.includes(fact.id),
    )) {
      expect(
        line.text,
        `${where}: ${otherId} (${relation}, ${gender})`,
      ).not.toMatch(new RegExp(`\\bmy ${forms.other}\\b`, "i"));
      told += 1;
      console.log(
        `${where}: ${relation} ${otherId} (${gender}): "${line.text}"`,
      );
    }
  }
  expect(checked, `${where}: no relative with a recorded sex`).toBeGreaterThan(
    0,
  );
  expect(told, `${where}: no Journal line names a relative`).toBeGreaterThan(0);
  console.log(
    `${where}: ${checked} relatives checked, ${told} Journal lines; recorded as neither male nor female (finding, "parent" kept): ${findings.join(", ") || "none"}`,
  );
}, 600_000);
