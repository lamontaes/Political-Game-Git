import { describe, expect, it } from "vitest";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { newsModule } from "../core2/modules/news";
import { viewsModule } from "../core2/modules/views";
import { buildPopulation } from "../core2/population";
import { coreAPI } from "../core2/state";
import {
  beliefsModule,
  openConversation,
  say,
  subjectsBetween,
} from "./conversation";
import { createDirector } from "./ledger";

/**
 * Someone sent to prison is a subject the people who know them can raise
 * (pool item words-justice-imprisoned-talk): the speaker's own ledger names
 * the jailed person, the line is worded from the conversation bank and cites
 * the imprisonment's record, and the player's answers know whether they had
 * heard.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? "conversation-imprisoned";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 500,
    }),
  ),
);
const player = base.people.find(
  (person) => person.tier !== "husk" && person.knownIds.length > 6,
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, {
  modules: [viewsModule, newsModule, beliefsModule, director.module],
});
director.start(core);
advanceCore(core, "2021-01-03");
const api = coreAPI(core);

describe(`talking of someone sent to prison in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("raises the jailed person as a subject, worded from the bank and citing the record", () => {
    const me = core.people.get(player.id)!;
    // Someone the player and a friend both know goes to prison.
    const friends = [...me.knownIds].filter((id) => {
      const row = core.people.get(id);
      return row?.alive && row.tier !== "husk";
    });
    let told: { speaker: string; jailed: string } | undefined;
    for (const jailed of friends) {
      const knowers = friends.filter(
        (id) => id !== jailed && core.people.get(id)!.knownIds.has(jailed),
      );
      if (!knowers.length) continue;
      api.emit({
        id: `justice.imprisoned:fixture:${jailed}`,
        kind: "justice.imprisoned",
        date: core.date,
        personIds: [jailed],
        placeId: me.placeId,
        facts: { custodyMonths: "18" },
        // As the justice engine emits it: a public record the news carries.
        publicRecord: true,
        news: true,
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation: "Technical fixture record.",
          estimatedFrom: "Conversation fixture only.",
        },
      } as never);
      told = { speaker: knowers[0]!, jailed };
      break;
    }
    expect(told, "someone both the player's friends know").toBeTruthy();
    advanceCore(core, "2021-01-12");
    // The speakers whose own ledger names the jailed person raise it.
    let raised = 0;
    for (const speakerId of [...director.ledger.people.keys()].filter(
      (id) => id !== player.id,
    )) {
      const subject = subjectsBetween(
        core,
        speakerId,
        player.id,
        director,
      ).find((row) => row.kind === "imprisoned");
      if (!subject) continue;
      expect(subject.aboutId).toBeTruthy();
      const recordId = subject.facts.name!.sourceRecordIds[0]!;
      const talk = openConversation(core, player.id, speakerId, { director });
      const line = talk.lines.find((row) => row.kind === "imprisoned");
      if (!line) continue;
      expect(line.text).not.toMatch(/[{}]/);
      expect(line.text).not.toMatch(/doing\?$/);
      expect(line.sourceRecordIds).toContain(recordId);
      expect(talk.choices.length).toBeGreaterThan(0);
      say(core, talk, talk.choices[0]!.key);
      raised += 1;
    }
    console.log(
      `conversation-imprisoned: ${raised} raised for ${told!.jailed}, seed ${seed}`,
    );
    expect(raised).toBeGreaterThan(0);
  });
});
