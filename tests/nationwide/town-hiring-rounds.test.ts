import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { recordWorkStatus } from "../../src/simulation/life";
import { activeWorkRelationshipsAt } from "../../src/simulation/life-queries";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import { TOWN_EMPLOYMENT_VERSION } from "../../src/simulation/living-world/town-employment";
import {
  TOWN_JOB_END_REASONS,
  activeTownJobs,
  reviewTownJobs,
} from "../../src/simulation/living-world/town-labor-market";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";

/**
 * AU2-DUP-07: a round of the town's hiring is the employer's choice. Laid-off
 * residents look for work; the kind of work furthest below its share opens a
 * role; its employer's decision-maker picks among everyone looking, and the
 * choice is that person's recorded decision. The place is drawn from all 56
 * by seed and named in the case.
 */
const SEED = "au2-dup-07-hiring-rounds";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const PLACE = searchLifePlaces("", 1, {
  stateJurisdictionKey: state!.jurisdictionKey,
  scope: "locality",
})[0]!;

describe(`a round of hiring in ${PLACE.displayName} (${state!.jurisdictionKey}, seed ${SEED})`, () => {
  it("is each employer's own choice among the residents looking, recorded as theirs", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const town = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    let world = game.world;
    // Six residents lose their town jobs and are out looking.
    const laidOff = activeTownJobs(world, town)
      .filter((job) => job.personId !== game.playerPersonId)
      .slice(0, 6);
    expect(laidOff.length).toBeGreaterThan(0);
    for (const job of laidOff)
      world = recordWorkStatus(world, {
        stableKey: `au2-dup-07:layoff:${job.relationshipId}`,
        workRelationshipId: job.relationshipId,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: TOWN_JOB_END_REASONS.laidOff,
        provenance: { kind: "authored", note: "AU2-DUP-07 fixture layoff." },
        supersedesStatusId: job.status.id,
      });

    const before = world.history.workRelationships.length;
    const next = reviewTownJobs(world, town, game.playerPersonId, "au2-round");
    const hires = next.history.workRelationships
      .slice(before)
      .filter((row) =>
        row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:${town}:job:`),
      );
    expect(hires.length, "the round hires").toBeGreaterThan(0);
    const traces = next.history.decisionTraces.filter(
      (row) => row.context.decisionType === "labor.employer-choose-hire",
    );
    expect(traces.length, "employers decided").toBeGreaterThan(0);
    for (const trace of traces) {
      const chosen = trace.selectedOptionKey?.startsWith("person:")
        ? trace.selectedOptionKey.slice("person:".length)
        : null;
      // The one deciding is somebody who works at the employer, and is not
      // among the people they chose from.
      const employer = trace.context.subject.entityId!;
      expect(
        activeWorkRelationshipsAt(next, trace.context.actorPersonId).some(
          (job) => job.relationship.organizationId === employer,
        ),
      ).toBe(true);
      expect(trace.context.randomness).toBe("none");
      expect(
        trace.context.options.some(
          (option) => option.key === `person:${trace.context.actorPersonId}`,
        ),
      ).toBe(false);
      if (chosen)
        expect(
          hires.some(
            (row) => row.personId === chosen && row.organizationId === employer,
          ),
        ).toBe(true);
    }
    // Nobody holds two town jobs, and the played person is never hired.
    expect(hires.some((row) => row.personId === game.playerPersonId)).toBe(
      false,
    );
    expect(new Set(hires.map((row) => row.personId)).size).toBe(hires.length);
    // The same round again writes nothing.
    expect(reviewTownJobs(next, town, game.playerPersonId, "au2-round")).toBe(
      next,
    );
  }, 180_000);
});
