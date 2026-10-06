import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EntityId, World } from "../simulation";
import { AfterOfficeEndorsementPanel } from "./AfterOfficeEndorsementPanel";

vi.mock("../simulation/after-office-endorsements", () => ({
  projectAfterOfficeEndorsementScenes: () => [
    {
      requestEventId: "request-1",
      campaignId: "campaign-1",
      candidatePersonId: "candidate-1",
      candidateName: "Jordan Lee",
      facts: [
        {
          sourceEventId: "request-1",
          occurredAt: "2032-01-01",
          jurisdictionId: "place-1",
          visibility: "private",
          summary: "Saved request event summary.",
        },
      ],
      peoplePresent: [
        { personId: "candidate-1", role: "agency:asked" },
        { personId: "former-1", role: "focus:asked-of" },
      ],
      lines: [
        {
          speakerPersonId: "candidate-1",
          speechAct: "request-endorsement",
          sourceEventId: "request-1",
        },
      ],
      replies: [
        { optionKey: "endorse", label: "Endorse" },
        {
          optionKey: "repay:favor-1",
          label: "Endorse in return for earlier help",
        },
        { optionKey: "decline", label: "Decline" },
      ],
      reasons: [],
    },
  ],
  answerAfterOfficeEndorsementScene: vi.fn(),
}));

describe("after-office endorsement controls", () => {
  it("puts each recorded reply on the player-facing People surface", () => {
    const html = renderToStaticMarkup(
      createElement(AfterOfficeEndorsementPanel, {
        world: {} as World,
        personId: "former-1" as EntityId,
        onWorldChange: () => {},
      }),
    );

    expect(html).toContain("Saved request event summary.");
    expect(html).toContain('data-visibility="private"');
    expect(html).toContain('data-person-id="candidate-1"');
    expect(html).toContain('data-role="agency:asked"');
    expect(html).toContain('data-speaker-person-id="candidate-1"');
    expect(html).toContain('data-speech-act="request-endorsement"');
    expect(html).toContain('data-testid="endorsement-reply-endorse"');
    expect(html).toContain('data-testid="endorsement-reply-repay-favor-1"');
    expect(html).toContain('data-testid="endorsement-reply-decline"');
    expect(html).toContain("Endorse in return for earlier help");
  });
});
