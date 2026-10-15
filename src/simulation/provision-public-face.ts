import { isEligibleVoterIn } from "./issue-record";
import type { EntityId, IsoDate, PoliticalSalience, World } from "./types";
import type { VoteBundlePart } from "./vote-bundle";

/**
 * The public face of one part of a bill (Build 25 step 2, design D-5).
 *
 * A voter never hears "section 4 of the committee substitute". They hear "the
 * work requirement" or "school lunch". So a part of a bill that can be
 * attacked or defended has to carry a short public label and, for the people
 * of a place, a measured account of who cares about it and which way.
 *
 * Nothing here is typed by hand. The label is the catalog question the part
 * answers (its `name`, the plain words the policy pack already shows
 * players), and how much people care is read from the views they actually
 * hold on that question, formed from their own stakes, family, values, party
 * and friends (Decision Register, September 26, 2026). No part carries a
 * popularity number: a part paying retirees matters to the people whose
 * views on it say so, and to nobody else.
 */

export interface PartPublicFace {
  /** Plain words a voter would recognize, e.g. "Work requirement for Medicaid". */
  readonly label: string;
  /** The catalog question behind the label; null when the part answers none. */
  readonly propositionId: EntityId | null;
  /** Whether enacting the part does what the question proposes. */
  readonly answer: "yes" | "no" | null;
  /** The broader issue, e.g. "Health care", when the catalog names one. */
  readonly issueLabel: string | null;
}

export function publicFaceOfPart(
  world: World,
  part: VoteBundlePart,
): PartPublicFace {
  const proposition = part.answers
    ? world.policyCatalog.propositions[part.answers.propositionId]
    : undefined;
  if (!part.answers || !proposition) {
    return {
      // A section that answers no catalog question is known to the public
      // only by its own heading; a part with neither has no public face, and
      // the label says so rather than inventing one.
      label: part.heading ?? "an unnamed part of the bill",
      propositionId: null,
      answer: null,
      issueLabel: null,
    };
  }
  return {
    label: proposition.name,
    propositionId: proposition.id,
    answer: part.answers.answer,
    issueLabel: world.policyCatalog.issues[proposition.issueId]?.name ?? null,
  };
}

/** How the eligible voters of a place hold one question, as measured. */
export interface WhoCares {
  readonly propositionId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly asOf: IsoDate;
  /** Adults who could vote there on `asOf`: the denominator. */
  readonly eligibleVoters: number;
  readonly support: SideCount;
  readonly oppose: SideCount;
  /** Eligible voters with no view, or an unsettled one. Most, usually. */
  readonly noSettledView: number;
}

export interface SideCount {
  readonly people: number;
  readonly bySalience: Readonly<Record<PoliticalSalience, number>>;
}

const EMPTY_SALIENCE: Readonly<Record<PoliticalSalience, number>> = {
  low: 0,
  moderate: 0,
  high: 0,
  central: 0,
};

/**
 * Who, among the voters of `jurisdictionId`, cares about this question and
 * which way, on `asOf`. Read-only; every count is people in the world holding
 * a recorded view, never an estimate.
 */
export function whoCaresAbout(
  world: World,
  propositionId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate = world.currentDate,
): WhoCares {
  // Each person's latest view on this question by `asOf`, read in one pass.
  const latest = new Map<
    EntityId,
    {
      formedAt: IsoDate;
      sequence: number;
      position: string;
      salience: PoliticalSalience;
    }
  >();
  for (const belief of world.history.privateBeliefs) {
    if (belief.propositionId !== propositionId || belief.formedAt > asOf)
      continue;
    const held = latest.get(belief.personId);
    if (
      !held ||
      belief.formedAt > held.formedAt ||
      (belief.formedAt === held.formedAt && belief.sequence > held.sequence)
    )
      latest.set(belief.personId, {
        formedAt: belief.formedAt,
        sequence: belief.sequence,
        position: belief.position,
        salience: belief.salience,
      });
  }

  let eligibleVoters = 0;
  let noSettledView = 0;
  const support = { people: 0, bySalience: { ...EMPTY_SALIENCE } };
  const oppose = { people: 0, bySalience: { ...EMPTY_SALIENCE } };
  for (const personId of world.personOrder) {
    if (!isEligibleVoterIn(world, personId, jurisdictionId, asOf)) continue;
    eligibleVoters += 1;
    const view = latest.get(personId);
    const side =
      view?.position === "support"
        ? support
        : view?.position === "oppose"
          ? oppose
          : null;
    if (!side || !view) {
      noSettledView += 1;
      continue;
    }
    side.people += 1;
    side.bySalience[view.salience] += 1;
  }
  return {
    propositionId,
    jurisdictionId,
    asOf,
    eligibleVoters,
    support,
    oppose,
    noSettledView,
  };
}
