import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegislativeBargainingFixture } from "../presentation/legislative-bargaining-fixture";
import { recordLegislativeNegotiation, type World } from "../simulation";
import { MeasurePaperWorkspace } from "./MeasurePaperWorkspace";

const fixture = createLegislativeBargainingFixture();
function render(world: World) {
  return renderToStaticMarkup(
    <MeasurePaperWorkspace
      world={world}
      seat={fixture}
      progress={fixture.progress}
      panel="record"
      proposalVariant="as-asked"
      memberAccounts={[]}
      message={null}
      onOpenPanel={() => {}}
      onChooseVariant={() => {}}
      onReadFiscalNote={() => {}}
      onOfferAmendment={() => {}}
      onTakeFloorVote={() => {}}
      onClose={() => {}}
    />,
  );
}

describe("measure paper negotiation record", () => {
  it("omits the empty helper and its dangling heading without hiding floor actions", () => {
    const html = render(fixture.world);
    expect(html).not.toContain("Nobody has asked you for anything yet");
    expect(html).not.toContain("What was asked for");
    expect(html).not.toContain('data-testid="record-negotiations"');
    expect(html).toContain('data-testid="record-panel"');
    expect(html).toContain('data-testid="close-panel"');
    expect(html).toContain('data-testid="call-the-vote"');
  });

  it("retains the actual recorded request and the same legal actions", () => {
    const request = "Keep the recorded provision in the bill.";
    const world = recordLegislativeNegotiation(fixture.world, {
      stableKey: "measure-paper:recorded-request",
      measureId: fixture.measureId,
      initiatorPersonId: fixture.advocatePersonId,
      counterpartyPersonId: fixture.playerPersonId,
      character: "policy-bargaining",
      request,
      disposition: "proposed",
      audience: "private",
      eventId: fixture.world.history.events[0]!.id,
    });
    const html = render(world);
    expect(html).toContain("What was asked for");
    expect(html).toContain('data-testid="record-negotiations"');
    expect(html).toContain(request);
    expect(html).toContain('data-testid="call-the-vote"');
    expect(html).not.toContain("Nobody has asked you for anything yet");
  });
});
