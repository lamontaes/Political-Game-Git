import signerTerms from "../../data/research/elections/petition-signer-terms.json" with { type: "json" };
import { ageOnDate } from "./dates";
import { residesForVoting } from "./issue-record";
import { generalElectionDay } from "./nominations/nomination-rules";
import { isPersonAliveAt } from "./vitality-integrity";
import type { EntityId, IsoDate, World } from "./types";

/**
 * Who may sign a petition here (b01 part 1).
 *
 * A signer must be an eligible registered voter when they sign: old enough,
 * alive and living in the place the petition covers. Registration is
 * automatic at 18 for anyone eligible in this game (owner ruling,
 * `issue-record.ts`), so the rule reads age, life and residence from the
 * records. The age comes from one data row per state: the common pattern is
 * the default, marked estimated, and a researched statute that differs has
 * its own row (Maryland lets a 17-year-old sign who will be 18 by the next
 * general election). One reader serves every one of the 56 places.
 */

export interface PetitionSignerTerms {
  readonly minimumAge: number;
  /** A younger signer counts when they will turn 18 by this date. */
  readonly mustTurnEighteenBy: "next-general-election" | null;
  readonly basis: "estimated-from-average" | "read";
  readonly source: string;
}

export type PetitionSignerRefusalKey =
  "not-in-this-world" | "not-living" | "too-young" | "not-a-resident";

export interface PetitionSignerEligibility {
  readonly eligible: boolean;
  /** Why not, as record keys; empty when eligible. No wording lives here. */
  readonly reasons: readonly { readonly key: PetitionSignerRefusalKey }[];
  readonly terms: PetitionSignerTerms;
}

/** The signer terms of a state, territory or D.C. (`"MD"` or `"US-MD"`). */
export function petitionSignerTerms(stateUsps: string): PetitionSignerTerms {
  const key = `US-${stateUsps.replace(/^US-/, "").toUpperCase()}`;
  const row = (
    signerTerms.places as Record<string, Partial<PetitionSignerTerms>>
  )[key];
  return {
    ...(signerTerms.default as PetitionSignerTerms),
    ...row,
  };
}

function nextGeneralElection(on: IsoDate): IsoDate {
  const year = Number(on.slice(0, 4));
  const thisYear = generalElectionDay(year);
  return thisYear >= on ? thisYear : generalElectionDay(year + 1);
}

/** Whether this person could sign a petition covering `jurisdictionId` on this day. Read only. */
export function petitionSignerEligibility(
  world: World,
  input: {
    readonly stateUsps: string;
    readonly jurisdictionId: EntityId;
    readonly signerPersonId: EntityId;
    readonly on: IsoDate;
  },
): PetitionSignerEligibility {
  const terms = petitionSignerTerms(input.stateUsps);
  const reasons: { key: PetitionSignerRefusalKey }[] = [];
  const person = world.people[input.signerPersonId];
  if (!person) {
    reasons.push({ key: "not-in-this-world" });
    return { eligible: false, reasons, terms };
  }
  if (
    !isPersonAliveAt(world, input.signerPersonId, {
      asOfDate: input.on > world.currentDate ? world.currentDate : input.on,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    reasons.push({ key: "not-living" });
  const age = ageOnDate(person.birthDate, input.on);
  const youngButQualifies =
    terms.mustTurnEighteenBy === "next-general-election" &&
    age >= terms.minimumAge &&
    ageOnDate(person.birthDate, nextGeneralElection(input.on)) >= 18;
  if (age < 18 && !youngButQualifies) reasons.push({ key: "too-young" });
  if (
    !residesForVoting(
      world,
      input.signerPersonId,
      input.jurisdictionId,
      input.on,
    )
  )
    reasons.push({ key: "not-a-resident" });
  return { eligible: reasons.length === 0, reasons, terms };
}
