import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { addDays } from "../dates";
import { recordWorldEvent } from "../world";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { jailTermOn, sentencesOf } from "./jail-terms";

function event(
  world: World,
  personId: EntityId,
  type: HistoricalEvent["type"],
  tags: readonly string[],
  date: IsoDate,
): World {
  return recordWorldEvent(world, {
    stableKey: `sentence-reader:${world.history.nextSequence}`,
    type,
    occurredAt: date,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0] ?? null,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "focus:defendant",
        detail: "Controlled fictional sentence",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags,
    summary: "Controlled fictional sentencing record for the custody reader.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function fixture() {
  let world = createDemoWorld("team1-sentence-reader");
  const person = world.personOrder[0]!;
  const start = addDays(world.currentDate, -365);
  world = event(
    world,
    person,
    "justice.sentenced",
    ["justice.sentence:jail", "justice.sentence-months:24"],
    start,
  );
  const sentence = world.history.events.at(-1)!;
  return { world, person, sentence };
}

function reduce(
  world: World,
  person: EntityId,
  sentence: HistoricalEvent,
  until: IsoDate,
  on: IsoDate = world.currentDate,
) {
  return event(
    world,
    person,
    "justice.federal-sentence-reduced",
    [
      `justice.reduced-sentence:${sentence.id}`,
      `justice.reduced-until:${until}`,
    ],
    on,
  );
}

describe("recorded federal sentence reductions reach custody readers", () => {
  it("ends custody on the recorded release day without rewriting the original sentence", () => {
    const { world, person, sentence } = fixture();
    expect(jailTermOn(world, person)).not.toBeNull();
    const next = reduce(world, person, sentence, world.currentDate);
    expect(jailTermOn(next, person)).toBeNull();
    expect(sentencesOf(next, person)[0]).toMatchObject({
      months: 24,
      until: world.currentDate,
    });
    expect(next.history.events.find((row) => row.id === sentence.id)).toEqual(
      sentence,
    );
  });
  it("keeps a past custody query in custody before the review took effect", () => {
    const { world, person, sentence } = fixture();
    const next = reduce(world, person, sentence, world.currentDate);
    expect(
      jailTermOn(next, person, addDays(world.currentDate, -1)),
    ).not.toBeNull();
    expect(jailTermOn(next, person, world.currentDate)).toBeNull();
    expect(sentencesOf(next, person, addDays(sentence.occurredAt, -1))).toEqual(
      [],
    );
  });
  it("uses the earliest legal end and cannot lengthen a reduced term", () => {
    const { world, person, sentence } = fixture();
    const earlier = addDays(world.currentDate, 10);
    let next = reduce(world, person, sentence, earlier);
    next = reduce(next, person, sentence, addDays(world.currentDate, 20));
    expect(sentencesOf(next, person)[0]?.until).toBe(earlier);
    expect(jailTermOn(next, person, earlier)).toBeNull();
  });
  it("retains earlier clemency and ignores another person's review", () => {
    const { world, person, sentence } = fixture();
    const clemencyOn = addDays(world.currentDate, -10);
    let next = event(
      world,
      person,
      "justice.clemency-granted",
      [
        `justice.clemency-sentence:${sentence.id}`,
        "justice.clemency-kind:commutation",
      ],
      clemencyOn,
    );
    next = reduce(next, world.personOrder[1]!, sentence, world.currentDate);
    expect(sentencesOf(next, person)[0]?.until).toBe(clemencyOn);
    expect(jailTermOn(next, person, addDays(clemencyOn, -1))).not.toBeNull();
  });
  it("does not apply a malformed end date or a release dated before its review", () => {
    const { world, person, sentence } = fixture();
    let next = reduce(world, person, sentence, "bad-date" as IsoDate);
    next = reduce(next, person, sentence, addDays(world.currentDate, -1));
    expect(jailTermOn(next, person)).not.toBeNull();
    next = reduce(next, person, sentence, "9999-02-30" as IsoDate);
    expect(jailTermOn(next, person)).not.toBeNull();
  });
});
