import { describe, expect, it } from "vitest";

import { serializeWorld } from "../simulation";
import { projectToday } from "./day-overview";
import { projectHouseholdPapers } from "./household-papers";
import { openNextLifeScene } from "./life-scene-flow";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { seekCareerOffer } from "../simulation/career-path7";

function adultLife(seed: string, overrides: Partial<NewGameSetup> = {}) {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 22,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  } as NewGameSetup);
  const opened = openOrdinaryLife(game.world, game.playerPersonId);
  return {
    world: openNextLifeScene(opened, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function lifeWithAnOfferOut(seed: string) {
  const { world, personId } = adultLife(seed);
  const provider = CAREER_PROVIDERS.find((entry) =>
    String(entry.pathId).includes("shop"),
  )!;
  const sought = seekCareerOffer(world, provider);
  expect(sought.ok).toBe(true);
  return { world: sought.world, personId };
}

describe("the papers say where each thing is answered", () => {
  /*
   * The teeth, and they are here because of a sweep in this repository that
   * reported green against an unfixed file: its fixture reached no branch that
   * could have failed. So this one proves it reached the routes before it
   * asserts anything about them, and a fixture that stops producing papers
   * fails here rather than passing silently.
   */
  it("reaches real papers and more than one kind of route", () => {
    const { world, personId } = lifeWithAnOfferOut("papers-reach");
    const papers = projectHouseholdPapers(world, personId);
    expect(papers.length).toBeGreaterThan(1);

    const kinds = new Set(papers.map((paper) => paper.destination.kind));
    // An ordinary week puts the errands and the posted meeting in front of
    // somebody, and the offer is waiting on top of them: an errand answered
    // where they stand, a meeting that is a commitment, and work elsewhere.
    expect(kinds.size).toBeGreaterThan(1);
    expect(kinds.has("here")).toBe(true);
    expect(kinds.has("commitment")).toBe(true);
    expect(kinds.has("surface")).toBe(true);
  });

  it("is the day's own list, not a second copy of it", () => {
    const { world, personId } = lifeWithAnOfferOut("papers-same-list");
    const waiting = projectToday(world, personId).waiting;
    const papers = projectHouseholdPapers(world, personId);
    // Same things, same order, same words. A room that paraphrased the day
    // would be a second account of what is waiting, and the two would drift.
    expect(papers.map((paper) => paper.key)).toEqual(
      waiting.map((entry) => entry.key),
    );
    expect(papers.map((paper) => paper.sentence)).toEqual(
      waiting.map((entry) => entry.sentence),
    );
  });

  it("changes nothing: reading the papers is reading", () => {
    const { world, personId } = lifeWithAnOfferOut("papers-pure");
    const before = serializeWorld(world);
    projectHouseholdPapers(world, personId);
    projectHouseholdPapers(world, personId);
    expect(serializeWorld(world)).toBe(before);
  });

  it("sends an unanswered offer of work to where work is answered", () => {
    const { world, personId } = lifeWithAnOfferOut("papers-offer");
    const offer = projectHouseholdPapers(world, personId).find((paper) =>
      paper.key.startsWith("work-offer:"),
    );
    expect(offer).toBeDefined();
    expect(offer!.destination).toEqual({ kind: "surface", surface: "work" });
  });

  it("points the posted meeting at the commitment actually on the calendar", () => {
    const { world, personId } = adultLife("papers-meeting");
    const meeting = projectHouseholdPapers(world, personId).find(
      (paper) => paper.destination.kind === "commitment",
    );
    expect(meeting).toBeDefined();
    const destination = meeting!.destination;
    if (destination.kind !== "commitment") throw new Error("narrowing");
    // The route is a record, not a guess: the activity it names is on this
    // character's own calendar.
    const activity = world.history.scheduledActivities.find(
      (entry) => entry.id === destination.activityId,
    );
    expect(activity).toBeDefined();
    expect(activity!.participantPersonIds).toContain(personId);
  });

  it("never leaves a paper with a route it cannot explain", () => {
    const { world, personId } = lifeWithAnOfferOut("papers-explained");
    for (const paper of projectHouseholdPapers(world, personId)) {
      if (paper.destination.kind !== "none") continue;
      // An unroutable paper is allowed. Saying nothing about why is not.
      expect(paper.destination.reason.trim().length).toBeGreaterThan(20);
    }
  });

  it("says nothing at all when nothing is waiting", () => {
    // A five-year-old does not carry the household week, so the ordinary-life
    // writer declines to open one. The papers follow that rather than
    // inventing something for the table to hold.
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 5,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "papers-child",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    } as NewGameSetup);
    const papers = projectHouseholdPapers(game.world, game.playerPersonId);
    expect(papers).toEqual(
      projectToday(game.world, game.playerPersonId).waiting.map((entry) => ({
        key: entry.key,
        sentence: entry.sentence,
        destination: expect.anything(),
      })),
    );
  });
});
