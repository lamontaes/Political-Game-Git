import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { CONVERSATION_DATA, openConversation, say } from "./conversation";
import { createDirector } from "./ledger";

// M4-02, conversations: at least four choices, each naming a real subject and
// answering the last line; leaving is the screen's control; the scales dim
// when nothing false can be said; a lie is recorded with its hearer and can
// be found out later.
const seed = process.env.GOLDEN_PATH_SEED ?? "conversation-test";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 400,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 25 &&
    age(person.birthDate) < 60 &&
    person.jobId &&
    person.knownIds.length > 4,
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-01-03");
const me = core.people.get(player.id)!;
const others = [...me.knownIds].filter(
  (id) => !me.familyIds.has(id) && core.people.get(id)?.alive,
);

function resolves(id: string): boolean {
  return (
    core.people.has(id) ||
    core.jobs.has(id) ||
    core.organizations.has(id) ||
    core.households.has(id) ||
    core.relationships.has(id) ||
    [...core.people.values()].some((row) =>
      (row.pastFacts ?? []).some((fact) => fact.id === id),
    )
  );
}

describe(`conversations in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("offers at least four choices, each answering the last line with a real subject", () => {
    let checked = 0;
    for (const otherId of others) {
      const talk = openConversation(core, player.id, otherId);
      if (!talk.lines.length) continue;
      for (let turn = 0; turn < 3 && talk.choices.length; turn += 1) {
        const last = talk.lines.at(-1)!;
        expect(last.speakerId).toBe(otherId);
        expect(talk.choices.length).toBeGreaterThanOrEqual(
          CONVERSATION_DATA.minimumChoices,
        );
        for (const choice of talk.choices) {
          expect(choice.answers).toBe(last.subjectId);
          expect(choice.sourceRecordIds.length).toBeGreaterThan(0);
          for (const id of choice.sourceRecordIds)
            expect(resolves(id), id).toBe(true);
          expect(choice.text).not.toMatch(/\b(goodbye|leave|bye)\b/i);
        }
        const next = talk.choices.find((row) => row.raises);
        if (!next) break;
        say(core, talk, next.key);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("dims the scales when nothing false can be said", () => {
    for (const otherId of others) {
      const talk = openConversation(core, player.id, otherId);
      if (!talk.lines.length) continue;
      const asked = talk.lines.at(-1)!;
      if (
        !asked.subjectId.startsWith("own-") &&
        !asked.subjectId.startsWith("home:")
      )
        expect(talk.lie).toBeNull();
      // After the other person tells about someone else, there is no lie.
      const raise = talk.choices.find((row) =>
        row.raises?.startsWith("mutual:"),
      );
      if (!raise) continue;
      say(core, talk, raise.key);
      expect(talk.lie).toBeNull();
    }
  });

  it("records a lie with its hearer, and it ends when the hearer learns the truth", () => {
    // Someone the player has just met asks about their home or work.
    const strangerId = [...core.people.values()].find(
      (row) =>
        row.alive &&
        row.id !== player.id &&
        row.householdId !== me.householdId &&
        !me.knownIds.has(row.id) &&
        row.knownIds.size > 0,
    )!.id;
    coreAPI(core).meet(player.id, strangerId, {
      placeId: me.placeId,
      sourceId: "fixture-meeting",
      cause: "met-in-group",
      hours: 1,
    });
    const talk = openConversation(core, player.id, strangerId);
    expect(talk.lie).not.toBeNull();
    const hearerId = talk!.otherId;
    director.watch(core, hearerId);
    say(core, talk!, talk!.lie!.key);
    const book = director.ledger.people.get(player.id)!;
    const lie = [...book.keptFacts.values()].find(
      (row) => row.kind === "lie" && row.otherId === hearerId,
    )!;
    expect(lie).toMatchObject({ holderId: player.id, otherId: hearerId });
    expect(lie.endedAt).toBeUndefined();
    // Later, someone tells the hearer the true fact the lie denied.
    const key = lie.concernsKey!;
    const truth = key.endsWith(":employer")
      ? core.jobs.get(me.jobId!)!.organizationId
      : me.placeId;
    advanceCore(core, "2021-01-10");
    applyCoreEvent(core, {
      id: "fixture-told-truth",
      date: core.date,
      kind: CONVERSATION_DATA.toldEvent,
      personIds: [hearerId],
      placeId: me.placeId,
      facts: { [key]: truth },
      source: {
        tag: "SOURCED",
        citation: "Fixture: a third person tells the hearer.",
        asOf: core.date,
      },
    });
    expect(lie.endedAt).toBe(core.date);
    expect(lie.endedBy).toBe("fixture-told-truth");
  });
});
