import { governmentUnit } from "./government-units";
import { registerRulePackResolver } from "./legislature-rule-packs";
import type { GovernmentUnitIdentity } from "./government-units";
import {
  knownRule,
  majorityOf,
  notApplicableRule,
  unknownRule,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "./legislature-rules";
import { localGoverningBodyIdentity } from "./nationwide-world/local-governing-body-candidacy-packs";
import { localGoverningBodyRules } from "./nationwide-world/local-governing-body-rules";

/**
 * A playable council for a town whose own charter the game has not read.
 *
 * A town's council now has members (`local-government-seats.ts`) and meets
 * (`local-council-meetings.ts`), but the engine that records an ordinance and
 * a roll call needs a rule pack, and only a few cities' charters are compiled
 * into one. Every other town gets this: one chamber with the town's own seat
 * count, an ordinance adopted at one meeting by a majority of the members
 * present and voting, a quorum of a majority of the members, and no
 * presentment to the mayor. It is the same idea as the generated state
 * legislature (`legislature-game-profile.ts`) and is labeled the same way:
 * `basis: "game-profile"`, every rule sourced to this profile, and none of it
 * a claim about any town's law.
 *
 * The pack is resolved from its id through `rulePackById`, so a saved
 * ordinance keeps resolving. A town that gets compiled later keeps the id its
 * ordinances were filed under; new ordinances go through the compiled pack.
 */

export const TOWN_COUNCIL_PROFILE_VERSION = "ocd-town-council-profile/v1";

const PACK_ID = /^us-[a-z]{2}-town-council-profile-v1:(.+)$/;

function source(citation: string, note: string): RuleSourceRef {
  return {
    authority: "game-profile",
    citation,
    sourceTitle: `Our Civic Duty town council profile (${TOWN_COUNCIL_PROFILE_VERSION})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note,
  };
}

const PASSAGE = source(
  "Adoption",
  "An ordinance is adopted at one meeting by a majority of the members present and voting. No town's own charter has been read for this.",
);
const QUORUM = source(
  "Quorum",
  "A majority of the members make a quorum. No town's own charter has been read for this.",
);
const ORIGIN = source(
  "Introduction",
  "Any member may introduce an ordinance, and it goes on the next meeting's agenda without a committee.",
);
const EXECUTIVE = source(
  "The mayor",
  "An adopted ordinance is not presented to the mayor. Whether a town's mayor may veto has not been read.",
);
const EFFECT = source(
  "Effective date",
  "An ordinance takes effect when it is adopted. No town's publication rule has been read.",
);

export function townCouncilProfilePackId(unit: GovernmentUnitIdentity): string {
  return `us-${unit.stateUsps.toLowerCase()}-town-council-profile-v1:${unit.id}`;
}

export function townCouncilProfilePack(
  unit: GovernmentUnitIdentity,
): LegislativeRulePack | null {
  const identity = localGoverningBodyIdentity(unit);
  const seats = localGoverningBodyRules(unit)?.seats;
  if (!identity || !seats) return null;
  const seatSource = source(
    "Seats",
    seats.basis === "read"
      ? `The body seats ${seats.value} members, as the game's reading of this town records.`
      : `The body seats ${seats.value} members, the typical size for a town of this kind in the ICMA survey.`,
  );
  return {
    packId: townCouncilProfilePackId(unit),
    jurisdictionKey: `US-${unit.stateUsps}`,
    displayName: `${identity.governmentName} — ${identity.bodyName}`,
    basis: "game-profile",
    structure: "unicameral",
    chambers: [
      {
        chamberKey: "council",
        name: identity.bodyName,
        // The game's own label, as for every council: no town's numbering has
        // been read.
        billDesignationPrefix: "ORD",
        seats: knownRule(seats.value, seatSource),
        quorum: knownRule(
          majorityOf("members-elected", "a majority of the members", QUORUM),
          QUORUM,
        ),
        introductionAllowed: true,
        referral: {
          authorityLabel: `${identity.bodyName} presiding officer`,
          multipleReferralAllowed: unknownRule(
            "Whether this body refers ordinances to committees has not been read.",
          ),
          everyMeasureMustBeHeard: unknownRule(
            "Whether every ordinance is guaranteed a hearing here has not been read.",
          ),
          floorWithoutReferral: knownRule(true, ORIGIN),
          source: ORIGIN,
        },
        committees: [],
        floorStages: [
          {
            stageKey: "final-passage",
            label: "Adoption",
            amendable: unknownRule(
              "Whether this body amends an ordinance before adopting it has not been read.",
            ),
            separateLegislativeDayRequired: false,
            vote: knownRule(
              majorityOf(
                "members-voting",
                "a majority of the members present and voting",
                PASSAGE,
              ),
              PASSAGE,
            ),
            source: PASSAGE,
          },
        ],
        amendments: {
          floorAmendmentsAllowed: unknownRule(
            "Whether this body amends an ordinance on the floor has not been read.",
          ),
          germanenessStandard: unknownRule(
            "No germaneness standard has been read for this body.",
          ),
          source: PASSAGE,
        },
      },
    ],
    chamberOrder: ["council"],
    origination: {
      generalOrigination: knownRule(["council"], ORIGIN),
      subjectRestrictions: [],
      source: ORIGIN,
    },
    interChamber: {
      kind: "not-applicable",
      note: "A town council sits as one chamber.",
    },
    executive: {
      titleLabel: "Mayor",
      presentmentRequired: knownRule(false, EXECUTIVE),
      actionWindowDaysInSession: notApplicableRule(
        "Nothing is presented to the mayor under this profile, so no period runs.",
      ),
      actionWindowDaysAfterAdjournment: notApplicableRule(
        "A town council sits all year under this profile.",
      ),
      inactionOutcomeInSession: notApplicableRule(
        "Nothing is presented to the mayor under this profile, so silence decides nothing.",
      ),
      lineItemVeto: unknownRule(
        "Whether this town's mayor has any veto has not been read.",
      ),
      override: {
        kind: "not-applicable",
        note: "Nothing is presented to the mayor under this profile, so there is no veto to override.",
        source: EXECUTIVE,
      },
      source: EXECUTIVE,
    },
    enactment: {
      effectiveDateDistinctFromEnactment: knownRule(false, EFFECT),
      defaultEffectiveRule: knownRule("on adoption", EFFECT),
      source: EFFECT,
    },
    session: {
      sessionLabel: `${identity.governmentName} council year`,
      adjournmentRule: unknownRule(
        "Whether this council adjourns its year has not been read.",
      ),
      measuresDieAtAdjournment: unknownRule(
        "Whether a pending ordinance dies at the end of the council's year has not been read.",
      ),
      source: ORIGIN,
    },
    sources: [seatSource, PASSAGE, QUORUM, ORIGIN, EXECUTIVE, EFFECT],
    unresolvedGaps: [
      "This council has not been compiled from its town's own charter or ordinances. Only its name and seat count come from the game's research; its procedure is the game's own.",
      "Committees, readings, public hearings, notice periods and the mayor's role are not yet part of this council's procedure.",
    ],
  };
}

/** A town council profile resolved from its pack id, or null. */
export function townCouncilProfilePackById(
  packId: string,
): LegislativeRulePack | null {
  const matched = PACK_ID.exec(packId);
  const unit = matched ? governmentUnit(matched[1]!) : null;
  return unit && townCouncilProfilePackId(unit) === packId
    ? townCouncilProfilePack(unit)
    : null;
}

registerRulePackResolver(townCouncilProfilePackById);
