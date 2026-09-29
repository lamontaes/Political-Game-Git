import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  decideChamberVote,
  seatedChamberForPack,
} from "../simulation/governing/chamber-votes";
import { introduceMeasure } from "../simulation/legislation";
import { ensureOfficeholderPrinciples } from "../simulation/governing/officeholder-principles";
import { legislatureForState } from "../simulation/legislature-game-profile";
import { defaultOriginChamber } from "../simulation/legislature-rules";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { nextMeasureNumbering } from "../simulation/measure-numbering";
import { SeededRng } from "../simulation/rng";
import type { LegislativeVoteDisposition, World } from "../simulation/types";
import { observerSetup, openObserverWorld } from "./observer-world";

/**
 * CTO ruling of September 29, 9:45 a.m., "a budget can't pass": an
 * appropriation answers no policy question, so a member with no view of its
 * programs had no reason to vote, and the budget died. A budget bill is now
 * decided by each member's principles on public spending, the party that
 * carries it, and the day the government's offices close without one.
 *
 * A watched world opens in a place drawn at random from every state and
 * territory with a seated legislature. The majority files the budget, and
 * the chamber decides it:
 *
 * 1. every member votes for a reason of their own, none for no reason;
 * 2. the budget passes.
 */

const SEEDS = ["build-25:budget:1", "build-25:budget:2", "build-25:budget:3"];

function openInRandomState(seed: string) {
  const rng = new SeededRng(`budget-place:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  while (states.length > 0) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const pack = legislatureForState(state.jurisdictionKey);
    const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey);
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (!pack || !jurisdiction || !place) continue;
    const { world } = openObserverWorld(observerSetup(seed, place.key));
    const chamber = defaultOriginChamber(pack);
    const seated = seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    if (!seated || seated.body.members.length === 0) continue;
    return { world, pack, chamber, seated, jurisdiction, place };
  }
  throw new Error("No state with a seated legislature was found.");
}

/** The members of the chamber's largest caucus. */
function majority(members: readonly { caucusLabel: string }[]): string {
  const sizes = new Map<string, number>();
  for (const member of members)
    sizes.set(member.caucusLabel, (sizes.get(member.caucusLabel) ?? 0) + 1);
  return [...sizes].sort(
    (l, r) => r[1] - l[1] || l[0].localeCompare(r[0]),
  )[0]![0];
}

describe("a budget bill is decided for the members' own reasons, and passes", () => {
  for (const seed of SEEDS)
    it(`in a random state (${seed})`, { timeout: 600_000 }, () => {
      const { world, pack, chamber, seated, jurisdiction, place } =
        openInRandomState(seed);
      const caucus = majority(seated.body.members);
      const sponsor = seated.body.members.find(
        (member) => member.caucusLabel === caucus && member.personId,
      )!;
      // Members hold the principles an officeholder is known by, as a bill
      // moving through Congress draws them (`congress-lawmaking.ts`).
      const principled = ensureOfficeholderPrinciples(
        world,
        seated.body.members.flatMap((member) =>
          member.personId ? [member.personId] : [],
        ),
      );
      const next: World = introduceMeasure(
        principled.jurisdictions[jurisdiction.id]
          ? principled
          : {
              ...principled,
              jurisdictions: {
                ...principled.jurisdictions,
                [jurisdiction.id]: jurisdiction,
              },
              jurisdictionOrder: [
                ...principled.jurisdictionOrder,
                jurisdiction.id,
              ],
            },
        {
          stableKey: `budget-bill-passes:${seed}`,
          jurisdictionId: jurisdiction.id,
          rulePackId: pack.packId,
          ...nextMeasureNumbering(principled, {
            jurisdictionId: jurisdiction.id,
            originChamber: chamber,
            rulePackId: pack.packId,
          }),
          shortTitle: "General Appropriations Act",
          summary: "Appropriates the state's operating budget.",
          origin: "member-introduction",
          subjectClass: "appropriation",
          sponsorPersonId: sponsor.personId!,
          originChamberKey: chamber.chamberKey,
          propositionIds: [],
        },
      );
      const measure = next.history.legislativeMeasures!.at(-1)!;
      const dispositions: readonly LegislativeVoteDisposition[] =
        decideChamberVote(next, {
          stableKey: `budget-bill-passes:${seed}:floor`,
          question: {
            question: {
              measureId: measure.id,
              purpose: "floor-stage",
              forumKey: chamber.chamberKey,
              floorStageKey: null,
              amendmentStableKey: null,
              provisionKey: null,
            },
            questionLabel: "final passage",
          },
          members: seated.body.members,
        });
      const count = (side: string) =>
        dispositions.filter((row) => row.disposition === side).length;
      const reasons = new Map<string, number>();
      for (const row of dispositions)
        if (row.reason)
          reasons.set(row.reason, (reasons.get(row.reason) ?? 0) + 1);
      const watched = process.env.WATCHED_RUN_OUT;
      if (watched)
        appendFileSync(
          watched,
          JSON.stringify({
            seed,
            place: `${place.displayName} (${place.key})`,
            chamber: chamber.name,
            date: world.currentDate,
            seats: seated.seats,
            yea: count("yea"),
            nay: count("nay"),
            present: count("present-not-voting"),
            absent: count("absent"),
            reasons: Object.fromEntries(reasons),
          }) + "\n",
        );

      for (const row of dispositions)
        if (row.personId) expect(row.reason).not.toBe("member:no-reason");
      expect(reasons.get("member:budget-deadline") ?? 0).toBeGreaterThan(0);
      // Members who hold views on public spending vote them.
      expect(
        [...reasons.keys()].some((reason) =>
          reason.startsWith("member:spending:"),
        ),
      ).toBe(true);
      // Passes by a majority of the whole chamber, the strictest rule any
      // state sets for a budget's ordinary passage.
      expect(count("yea")).toBeGreaterThan(seated.seats / 2);
    });
});
