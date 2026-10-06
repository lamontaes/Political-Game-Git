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
      lines: [],
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

    expect(html).toContain("Jordan Lee asks you to endorse their campaign.");
    expect(html).toContain('data-testid="endorsement-reply-endorse"');
    expect(html).toContain('data-testid="endorsement-reply-repay-favor-1"');
    expect(html).toContain('data-testid="endorsement-reply-decline"');
    expect(html).toContain("Endorse in return for earlier help");
  });
});
