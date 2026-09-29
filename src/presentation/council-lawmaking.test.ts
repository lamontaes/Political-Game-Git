import { describe, expect, it } from "vitest";

import { addDays } from "../simulation/dates";
import { lawInForce } from "../simulation/governing/law-in-force";
import { principledLeaning } from "../simulation/governing/officeholder-principles";
import { ORDINANCE_EFFECTIVE_AFTER_DAYS } from "../simulation/governing/ordinance-effective-date";
import { postedMeetingOrdinanceKey } from "../simulation/living-world/local-council-meetings";
import { playerTown } from "../simulation/living-world/town-residents";
import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * Build 25, CTO ruling of September 29, 12:24 a.m.: local councils take over
 * from the stand-in ballots. A watched world in a randomly drawn place runs
 * ninety days, and every ordinance its council takes up is read back:
 *
 * 1. who filed it and why: the sponsor's own principles press on the
 *    question, and the town's law did not already say what they wanted;
 * 2. how each member voted and why: a reason from the vote engine on every
 *    ballot, never the old stand-in note;
 * 3. when it took effect: 30 days after adoption, the estimated rule where a
 *    charter's own rule is unread.
 */

const SEEDS = ["build-25:councils:1", "build-25:councils:2"];

describe("a town council makes law for its own reasons", () => {
  for (const seed of SEEDS)
    it(
      `files, votes and enacts from members' own reasons (${seed})`,
      { timeout: 600_000 },
      () => {
        const place = observerPlace(seed);
        const opened = openObserverWorld(observerSetup(seed));
        let world = opened.world;
        const town = playerTown(world, opened.anchorPersonId);
        // A place with no town government has no council to watch.
        if (!town) return;
        world = advanceObservedWorld(world, 90);
        const measures = (world.history.legislativeMeasures ?? []).filter(
          (measure) =>
            measure.jurisdictionId === town &&
            measure.originChamberKey === "council" &&
            measure.stableKey !== postedMeetingOrdinanceKey(town),
        );
        const ids = new Set(measures.map((measure) => measure.id));
        const votes = (world.history.legislativeVotes ?? []).filter((vote) =>
          ids.has(vote.measureId),
        );
        const enactments = (world.history.legislativeEnactments ?? []).filter(
          (row) => ids.has(row.measureId),
        );
        const meetings = world.history.events.filter(
          (event) =>
            event.type === "local.council-meeting-held" &&
            event.jurisdictionId === town,
        ).length;
        const reasons = new Map<string, number>();
        for (const vote of votes)
          for (const row of vote.dispositions) {
            const key = `${row.disposition} ${row.reason ?? "none"}`;
            reasons.set(key, (reasons.get(key) ?? 0) + 1);
          }
        console.log(
          JSON.stringify(
            {
              seed,
              place: `${place.displayName} (${place.key})`,
              meetings,
              ordinances: measures.map((measure) => ({
                designation: measure.designation,
                title: measure.shortTitle,
                sponsorLeaning: measure.sponsorPersonId
                  ? principledLeaning(
                      world,
                      measure.sponsorPersonId,
                      measure.propositionIds![0]!,
                    ).score
                  : null,
                votes: votes
                  .filter((vote) => vote.measureId === measure.id)
                  .map(
                    (vote) =>
                      `${vote.outcome} ${vote.tally.yea}-${vote.tally.nay}`,
                  ),
              })),
              reasons: Object.fromEntries(reasons),
            },
            null,
            1,
          ),
        );

        expect(meetings).toBeGreaterThanOrEqual(6);
        for (const measure of measures) {
          // Filed on the sponsor's own principles, hard enough to file.
          const leaning = principledLeaning(
            world,
            measure.sponsorPersonId!,
            measure.propositionIds![0]!,
          ).score;
          expect(Math.abs(leaning)).toBeGreaterThanOrEqual(3);
          expect(measure.propositionAnswers![0]!.answer).toBe(
            leaning > 0 ? "yes" : "no",
          );
        }
        for (const vote of votes) {
          expect(vote.provenance.method).toBe("member-decisions");
          for (const row of vote.dispositions)
            if (row.disposition === "yea" || row.disposition === "nay")
              expect(row.reason).toMatch(/^member:/);
        }
        for (const enactment of enactments) {
          const measure = measures.find(
            (row) => row.id === enactment.measureId,
          )!;
          expect(enactment.effectiveAt).toBe(
            addDays(enactment.resolvedAt, ORDINANCE_EFFECTIVE_AFTER_DAYS),
          );
          // In force once its day comes, and not before.
          const question = measure.propositionIds![0]!;
          if (enactment.effectiveAt! <= world.currentDate)
            expect(lawInForce(world, town, question)?.answer).toBe(
              measure.propositionAnswers![0]!.answer,
            );
        }
      },
    );
});
