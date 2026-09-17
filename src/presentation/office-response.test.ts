import { describe, expect, it } from "vitest";
import { assertWorldIntegrity, serializeWorld } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import { openMatter, recordAllegation } from "../simulation/press";
import {
  OFFICE_ANSWER_EVENT,
  answerForOffice,
  officeOutcomeLine,
  projectOfficeMatters,
} from "./office-response";
import type { OfficeConsequenceWriter } from "./office-response";

/**
 * CRUNCH47 B2: answering for something in the office you hold.
 *
 * B decides what is said; GOVERNING decides what the office does about it.
 * The writer is injected here so this file proves B's half exactly — including
 * that B never ends a term itself — and the composed proof against
 * GOVERNING's real writer runs on the seam.
 */

/** Stands in for GOVERNING's writer, in the shape D published. */
function stubWriter(): {
  writer: OfficeConsequenceWriter;
  calls: { kind: string; statedReason: string; officeKey: string }[];
} {
  const calls: { kind: string; statedReason: string; officeKey: string }[] = [];
  const writer: OfficeConsequenceWriter = (world, input) => {
    calls.push({
      kind: input.kind,
      statedReason: input.statedReason,
      officeKey: input.officeKey,
    });
    return {
      world,
      eventId: "stub-event" as EntityId,
      outcome:
        input.kind === "resignation"
          ? {
              changed: true,
              kind: "term-closed",
              effectiveAt: input.effectiveAt,
              note: "The term is closed. Who fills the office next is decided by that state's own rules, which the game has not compiled.",
            }
          : {
              changed: false,
              note: "Nothing in the office changed.",
            },
    };
  };
  return { writer, calls };
}

function officeholder() {
  const fixture = recordedTermFixture("player");
  return {
    world: enterSupportedTerm(fixture.world, fixture.personId),
    player: fixture.personId,
  };
}

function withMatter(world: World, player: EntityId) {
  const opened = openMatter(world, {
    stableKey: "office-response:matter",
    family: "M1",
    subjectPersonIds: [player],
    occurrenceId: null,
    originEventId: world.history.events.at(-1)!.id,
    jurisdictionId: world.people[player]!.homeJurisdictionId,
  });
  return recordAllegation(opened.world, {
    stableKey: "office-response:allegation",
    matterId: opened.matter.id,
    allegerPersonId: world.personOrder.find((id) => id !== player)!,
    statement: "Campaign money paid for something personal.",
    publicAllegation: true,
    basisEventIds: [],
  }).world;
}

describe("PEOPLE B2: answering for your office", () => {
  const { world, player } = officeholder();
  const alleged = withMatter(world, player);

  it("offers five answers, and marks the only one that ends a term", () => {
    const [view] = projectOfficeMatters(alleged, player);
    expect(view).toBeTruthy();
    expect(view!.options.map((option) => option.kind)).toEqual([
      "explanation-requested",
      "defense-recorded",
      "cooperation-agreed",
      "cooperation-declined",
      "resignation",
    ]);
    expect(
      view!.options.filter((option) => option.endsOffice).map((o) => o.kind),
    ).toEqual(["resignation"]);
    expect(view!.note).toMatch(/not a body that has found anything/);
    expect(view!.knownLines.length).toBeGreaterThan(0);
    // Reading changes nothing.
    expect(serializeWorld(alleged)).toBe(serializeWorld(alleged));
  });

  it("records the words whatever the office decides, and prints the office's own answer", () => {
    const { writer, calls } = stubWriter();
    const said = answerForOffice(
      alleged,
      {
        personId: player,
        matterId: projectOfficeMatters(alleged, player)[0]!.matterId,
        kind: "cooperation-declined",
        statement: "I won't take part in that, and I'll say why later.",
      },
      writer,
    );
    // The refusal is a record of its own, not silence.
    const answer = said.world.history.events.find(
      (event) => event.type === OFFICE_ANSWER_EVENT,
    )!;
    expect(answer.summary).toContain("I won't take part in that");
    expect(answer.tags).toContain("office.answer:cooperation-declined");
    // The words reached GOVERNING exactly as they were said.
    expect(calls).toHaveLength(1);
    expect(calls[0]!.statedReason).toBe(
      "I won't take part in that, and I'll say why later.",
    );
    expect(calls[0]!.kind).toBe("cooperation-declined");
    // And the office's answer is what gets printed.
    expect(said.officeChanged).toBe(false);
    expect(officeOutcomeLine(said)).toBe("Nothing in the office changed.");
    expect(said.effectiveAt).toBeNull();
    assertWorldIntegrity(said.world);
  });

  it("a resignation is a decision here and a closed term there", () => {
    const { writer } = stubWriter();
    const resigned = answerForOffice(
      alleged,
      {
        personId: player,
        matterId: projectOfficeMatters(alleged, player)[0]!.matterId,
        kind: "resignation",
      },
      writer,
    );
    expect(resigned.officeChanged).toBe(true);
    expect(resigned.effectiveAt).toBe(alleged.currentDate as IsoDate);
    expect(officeOutcomeLine(resigned)).toContain("The office is vacant from");
    // B wrote no term record of its own; only the answer.
    expect(resigned.world.history.workStatuses).toEqual(
      alleged.history.workStatuses,
    );
    expect(
      resigned.world.history.events.filter(
        (event) => event.type === OFFICE_ANSWER_EVENT,
      ),
    ).toHaveLength(1);
  });

  it("is answered once, and only by the person being played", () => {
    const { writer } = stubWriter();
    const matterId = projectOfficeMatters(alleged, player)[0]!.matterId;
    const answered = answerForOffice(
      alleged,
      { personId: player, matterId, kind: "explanation-requested" },
      writer,
    ).world;
    expect(projectOfficeMatters(answered, player)).toEqual([]);
    expect(() =>
      answerForOffice(
        answered,
        { personId: player, matterId, kind: "defense-recorded" },
        writer,
      ),
    ).toThrow(/nothing of yours to answer/);
    const observing: World = { ...alleged, control: { kind: "observer" } };
    expect(() =>
      answerForOffice(
        observing,
        { personId: player, matterId, kind: "resignation" },
        writer,
      ),
    ).toThrow(/being played/);
  });

  it("somebody with no office has nothing to answer for here", () => {
    const other = alleged.personOrder.find((id) => id !== player)!;
    expect(projectOfficeMatters(alleged, other)).toEqual([]);
  });
});
