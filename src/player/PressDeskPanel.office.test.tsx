import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { assertWorldIntegrity } from "../simulation";
import type { EntityId, World } from "../simulation";
import { openMatter, recordAllegation } from "../simulation/press";
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import {
  OFFICE_ANSWER_EVENT,
  answerForOfficeOnDesk,
  projectOfficeMatters,
} from "../presentation/office-response";
import { PressDeskPanel } from "./PressDeskPanel";

/**
 * Answering for an office from the press desk. Before this the five answers,
 * resigning among them, were reachable from no screen, and GOVERNING's
 * `recordOfficeConsequence` had no caller outside its own tests.
 */
function legislatorWithAPublicAllegation(): {
  readonly world: World;
  readonly player: EntityId;
} {
  const fixture = recordedTermFixture("player");
  const world = enterSupportedTerm(fixture.world, fixture.personId);
  const player = fixture.personId;
  const opened = openMatter(world, {
    stableKey: "desk-office:matter",
    family: "M1",
    subjectPersonIds: [player],
    occurrenceId: null,
    originEventId: world.history.events.at(-1)!.id,
    jurisdictionId: world.people[player]!.homeJurisdictionId,
  });
  return {
    world: recordAllegation(opened.world, {
      stableKey: "desk-office:allegation",
      matterId: opened.matter.id,
      allegerPersonId: world.personOrder.find((id) => id !== player)!,
      statement: "Campaign money paid for something personal.",
      publicAllegation: true,
      basisEventIds: [],
    }).world,
    player,
  };
}

function render(world: World, personId: EntityId): string {
  return renderToStaticMarkup(
    <PressDeskPanel
      world={world}
      personId={personId}
      onWorldChange={() => undefined}
      onOpenPerson={() => undefined}
    />,
  );
}

describe("the press desk lets an officeholder answer for a matter", () => {
  const { world, player } = legislatorWithAPublicAllegation();
  const matterId = projectOfficeMatters(world, player)[0]!.matterId;

  it("offers the five answers, resigning among them, on the matter", () => {
    const html = render(world, player);
    expect(html).toContain('data-testid="press-desk-office-answer"');
    for (const label of [
      "Explain it yourself",
      "Stand behind your account",
      "Cooperate with the inquiry",
      "Decline to cooperate",
      "Resign the office",
    ])
      expect(html).toContain(label);
  });

  it("resigning goes through the office's own writer and says when it is vacant", () => {
    const said = answerForOfficeOnDesk(world, {
      personId: player,
      matterId,
      kind: "resignation",
    });
    expect(said.line).toContain("The office is vacant from");
    expect(
      said.world.history.events.some(
        (event) => event.type === "governing.office-consequence",
      ),
    ).toBe(true);
    expect(
      said.world.history.events.filter(
        (event) => event.type === OFFICE_ANSWER_EVENT,
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(said.world);
    // Answered once, the matter no longer offers the answers.
    expect(render(said.world, player)).not.toContain(
      'data-testid="press-desk-office-answer"',
    );
  });

  it("any other answer leaves the office alone", () => {
    const said = answerForOfficeOnDesk(world, {
      personId: player,
      matterId,
      kind: "cooperation-agreed",
    });
    expect(said.line).not.toContain("vacant");
    expect(said.world.history.workStatuses).toEqual(world.history.workStatuses);
  });
});
