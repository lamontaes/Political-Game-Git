import { writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../../src/presentation/new-game";
import { openConversationWith } from "../../src/presentation/person-conversation-entry";
import { personName } from "../../src/simulation";
import type { NewGameSetup } from "../../src/presentation/new-game";
import type { Person } from "../../src/simulation";

/**
 * Why the Talk action is disabled while the dossier says there is time to talk.
 *
 * The browser journey found the two disagreeing on the same pair of people in
 * the same moment: the action menu renders `action-talk` disabled, and the
 * dossier beside it prints "You and Clara Poole have time for a conversation."
 * One of them is wrong, and which one matters — a disabled control with an
 * encouraging sentence next to it is worse than either answer alone.
 *
 * This asks the world directly, for every household member of a child life and
 * an adult life, so the answer comes from the writer rather than from the DOM.
 *
 *   npx vitest run scripts/dev-lab/trace-conversation-gate.test.ts
 */

const REPORT = "test-results/conversation-gate.txt";
const lines: string[] = [];
const say = (text: string) => lines.push(text);

function aWorld(age: number) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: age,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: `person-journey-${age}`,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
}

describe("the conversation gate, asked of the world rather than the DOM", () => {
  it("reports what openConversationWith says for each household member", () => {
    for (const age of [10, 34]) {
      const { world, playerPersonId } = aWorld(age);
      say(`=== start age ${age} — player ${playerPersonId} ===`);
      for (const id of world.personOrder) {
        if (id === playerPersonId) continue;
        const person = world.people[id] as Person | undefined;
        if (!person) continue;
        const entry = openConversationWith(world, playerPersonId, id);
        say(
          `  ${personName(person).padEnd(22)} ${id}  kind=${entry.kind}${
            entry.kind === "unavailable" ? ` reason=${entry.reason}` : ""
          }`,
        );
      }
      say("");
    }
    writeFileSync(REPORT, `${lines.join("\n")}\n`);
    expect(lines.length).toBeGreaterThan(0);
  });
});
