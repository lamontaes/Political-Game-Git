import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 120_000 });

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { previewTimeCommand } from "../presentation/time-command";
import {
  describeInterval,
  describeTimeTarget,
  PROTECTED_STOP_NOTE,
  skipToLabel,
} from "../presentation/time-target-label";
import { addSimulationMinutes, type EntityId, type World } from "../simulation";
import { seekCareerOffer } from "../simulation/career-path7";
import { CAREER_PROVIDERS } from "../presentation/career-path7-provider";
import { CareerPathsPanel } from "./CareerPathsPanel";
import { LifePathsPanel } from "./LifePathsPanel";
import { PressPreparationTimeControl } from "./PressWorkspace";
import {
  CALENDAR_COMMITMENT_NOTE,
  describeTimeCommandReport,
  TimeCommandProvider,
  type TimeCommandRunner,
} from "./time-command-runner";

/*
 * Markup proofs, in the style of this repository's other shell component
 * tests: render to static markup rather than driving a DOM. They cover what
 * the defect was about — that these panel controls now read the shell's one
 * runner: the destination is disclosed before the press, the pending state is
 * painted, and with no runner mounted the control is absent with its reason.
 *
 * Pointer and keyboard activation of these controls stays a browser proof and
 * is deliberately not claimed here. Single-flight and the stale-World refusal
 * are proved against the runner itself in time-command-runner.test.ts.
 */

function adultLife(): { readonly world: World; readonly personId: EntityId } {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "crunch47-panel-time-controls",
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

function stubRunner(pending: boolean): TimeCommandRunner {
  return { pending, submit: () => {}, perform: () => {} };
}

function withRunner(runner: TimeCommandRunner | null, node: ReactNode) {
  return renderToStaticMarkup(
    runner ? (
      <TimeCommandProvider runner={runner}>{node}</TimeCommandProvider>
    ) : (
      <>{node}</>
    ),
  );
}

describe("the day control inside Jobs and study", () => {
  const life = adultLife();
  const panel = <LifePathsPanel world={life.world} onWorldChange={() => {}} />;

  it("says where the day lands before the player presses it", () => {
    const markup = withRunner(stubRunner(false), panel);
    const target = previewTimeCommand(life.world, life.personId, {
      kind: "days",
      days: 1,
    })!;
    expect(markup).toContain('data-testid="life-paths-pass-day"');
    expect(markup).toContain(skipToLabel(target.target));
    expect(markup).toContain(PROTECTED_STOP_NOTE);
    // The control is described by the line that carries the destination.
    expect(markup).toContain('aria-describedby="life-paths-pass-day-target"');
    expect(markup).toContain('id="life-paths-pass-day-target"');
  });

  it("is busy and disabled while a command is running", () => {
    const markup = withRunner(stubRunner(true), panel);
    expect(markup).toMatch(
      /data-testid="life-paths-pass-day"[^>]*aria-disabled="true"/,
    );
    expect(markup).toMatch(
      /data-testid="life-paths-pass-day"[^>]*aria-busy="true"/,
    );
    expect(markup).toContain("Time is passing…");
  });

  it("is absent with its reason where the shell's clock is not mounted", () => {
    const markup = withRunner(null, panel);
    expect(markup).not.toContain('data-testid="life-paths-pass-day"');
    expect(markup).toContain('data-testid="life-paths-pass-day-unavailable"');
    expect(markup).toContain("owns the one clock");
  });
});

describe("the wait control on a career offer", () => {
  const life = adultLife();
  const provider = CAREER_PROVIDERS[0]!;
  const sought = seekCareerOffer(life.world, provider);
  const panel = (
    <CareerPathsPanel world={sought.world} onWorldChange={() => {}} />
  );

  it("offers an expected career offer to wait on", () => {
    // If this fails the rest of this block is proving nothing, so it is
    // asserted rather than skipped around.
    expect(sought.ok).toBe(true);
    expect(withRunner(stubRunner(false), panel)).toContain(
      'data-testid="career-paths-wait-day"',
    );
  });

  it("says where waiting a day lands before the player presses it", () => {
    const markup = withRunner(stubRunner(false), panel);
    const target = previewTimeCommand(sought.world, life.personId, {
      kind: "days",
      days: 1,
    })!;
    expect(markup).toContain(skipToLabel(target.target));
    expect(markup).toContain(PROTECTED_STOP_NOTE);
    expect(markup).toContain('aria-describedby="career-paths-wait-day-target"');
  });

  it("is busy and disabled while a command is running", () => {
    const markup = withRunner(stubRunner(true), panel);
    expect(markup).toMatch(
      /data-testid="career-paths-wait-day"[^>]*aria-disabled="true"/,
    );
    expect(markup).toMatch(
      /data-testid="career-paths-wait-day"[^>]*aria-busy="true"/,
    );
    expect(markup).toContain("Time is passing…");
  });

  it("is absent with its reason where the shell's clock is not mounted", () => {
    const markup = withRunner(null, panel);
    expect(markup).not.toContain('data-testid="career-paths-wait-day"');
    expect(markup).toContain('data-testid="career-paths-wait-day-unavailable"');
    expect(markup).toContain("owns the one clock");
  });
});

describe("the preparation step on the press desk", () => {
  const life = adultLife();
  const control = <PressPreparationTimeControl world={life.world} />;

  it("says the interval and where it lands before the player presses it", () => {
    const markup = withRunner(stubRunner(false), control);
    expect(markup).toContain('data-testid="press-continue-quarter-hour"');
    expect(markup).toContain(
      `${describeInterval(15)}, to ${describeTimeTarget(
        addSimulationMinutes(life.world.currentMoment, 15),
      )}.`,
    );
    expect(markup).toContain(PROTECTED_STOP_NOTE);
    expect(markup).toContain('aria-describedby="press-quarter-hour-target"');
  });

  it("is busy and disabled while a command is running", () => {
    const markup = withRunner(stubRunner(true), control);
    expect(markup).toMatch(
      /data-testid="press-continue-quarter-hour"[^>]*aria-disabled="true"/,
    );
    expect(markup).toMatch(
      /data-testid="press-continue-quarter-hour"[^>]*aria-busy="true"/,
    );
    expect(markup).toContain("Time is passing…");
  });

  it("is absent with its reason where the shell's clock is not mounted", () => {
    const markup = withRunner(null, control);
    expect(markup).not.toContain('data-testid="press-continue-quarter-hour"');
    expect(markup).toContain(
      'data-testid="press-continue-quarter-hour-unavailable"',
    );
    expect(markup).toContain("owns the one clock");
  });
});

describe("what a control says after the clock answers", () => {
  it("keeps the calendar-commitment meaning when the report carries no detail", () => {
    expect(
      describeTimeCommandReport({
        status: "accepted",
        outcome: "No time passed.",
        target: null,
        stoppedEarly: false,
      }),
    ).toBe(`No time passed.\n${CALENDAR_COMMITMENT_NOTE}`);
  });

  it("prefers the runner's own reason where it names the commitment", () => {
    const outcome =
      "No time passed.\nStopped for Budget hearing; resolve this commitment before continuing.";
    expect(
      describeTimeCommandReport({
        status: "accepted",
        outcome,
        target: null,
        stoppedEarly: false,
      }),
    ).toBe(outcome);
  });

  it("leads with the stopped-early line when a skip did not reach its target", () => {
    const life = adultLife();
    const target = previewTimeCommand(life.world, life.personId, {
      kind: "days",
      days: 7,
    })!.target;
    const said = describeTimeCommandReport({
      status: "accepted",
      outcome: "2 days passed (2880 minutes).",
      target,
      stoppedEarly: true,
    });
    expect(said.startsWith("Stopped before ")).toBe(true);
    expect(said).toContain("2 days passed (2880 minutes).");
  });
});
