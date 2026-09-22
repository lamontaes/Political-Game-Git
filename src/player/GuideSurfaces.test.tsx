import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GuideTerm, GuideHelpProvider, type GuideHelp } from "./GuideTerm";
import { GuideWorkspace } from "./GuideWorkspace";

/*
 * Markup proofs, in the same style as the rest of the shell's component tests:
 * this repository renders to static markup rather than driving a DOM here.
 * Pointer and keyboard activation of these controls is a browser proof and is
 * deliberately not claimed by this file.
 */

const HELP: GuideHelp = {
  learnedKeys: [],
  setLearned: () => {},
  openGuide: () => {},
};

function withHelp(help: GuideHelp, children: React.ReactNode) {
  return renderToStaticMarkup(
    <GuideHelpProvider help={help}>{children}</GuideHelpProvider>,
  );
}

describe("inline term help", () => {
  it("is the plain word where the shell offers no Guide", () => {
    const markup = renderToStaticMarkup(
      <GuideTerm semanticKey="quorum">quorum</GuideTerm>,
    );
    expect(markup).toBe("quorum");
  });

  it("is a labeled control where the shell does", () => {
    const markup = withHelp(
      HELP,
      <GuideTerm semanticKey="quorum">quorum</GuideTerm>,
    );
    expect(markup).toContain('data-testid="guide-term-quorum"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('data-learned="false"');
    expect(markup).toContain("what Quorum means");
  });

  it("says a learned term is learned, and still links to it", () => {
    const markup = withHelp(
      { ...HELP, learnedKeys: ["quorum"] },
      <GuideTerm semanticKey="quorum">quorum</GuideTerm>,
    );
    expect(markup).toContain('data-learned="true"');
    expect(markup).toContain("marked learned");
  });

  it("leaves a label that is not a term exactly as it was", () => {
    const seat = "Council Member, District 3";
    expect(withHelp(HELP, <GuideTerm label={seat}>{seat}</GuideTerm>)).toBe(
      seat,
    );
  });

  it("explains a seat title that is a term", () => {
    const seat = "President pro tempore";
    const markup = withHelp(HELP, <GuideTerm label={seat}>{seat}</GuideTerm>);
    expect(markup).toContain('data-testid="guide-term-president-pro-tempore"');
  });
});

describe("the Guide workspace", () => {
  it("opens as a searchable catalog with nothing chosen", () => {
    const markup = renderToStaticMarkup(
      <GuideWorkspace learnedKeys={[]} onSetLearned={() => {}} />,
    );
    expect(markup).toContain('data-testid="guide-search"');
    expect(markup).toContain('data-testid="guide-result-quorum"');
    expect(markup).toContain('data-testid="guide-entry-empty"');
    expect(markup).not.toContain('data-testid="guide-entry"');
  });

  it("opens on the term inline help asked for, with its related links", () => {
    const markup = renderToStaticMarkup(
      <GuideWorkspace
        learnedKeys={[]}
        onSetLearned={() => {}}
        openKey="presentment"
      />,
    );
    expect(markup).toContain('data-guide-entry="presentment"');
    expect(markup).toContain('data-testid="guide-entry-explanation"');
    expect(markup).toContain('data-testid="guide-related-veto"');
    expect(markup).toContain('data-testid="guide-entry-learned"');
  });

  it("shows a learned term as learned without hiding it", () => {
    const markup = renderToStaticMarkup(
      <GuideWorkspace
        learnedKeys={["veto"]}
        onSetLearned={() => {}}
        openKey="veto"
      />,
    );
    expect(markup).toContain('data-testid="guide-result-veto"');
    expect(markup).toContain("Marked learned");
  });

  it("carries no research address into play", () => {
    const markup = renderToStaticMarkup(
      <GuideWorkspace
        learnedKeys={[]}
        onSetLearned={() => {}}
        openKey="quorum"
      />,
    );
    expect(markup).not.toMatch(/https?:\/\//);
  });
});
