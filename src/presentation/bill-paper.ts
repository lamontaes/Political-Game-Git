import {
  measureActions,
  measureById,
  measureEnactment,
  measurePosition,
  measureVotes,
  rulePackForMeasure,
} from "../simulation/legislation";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import {
  isCongressMeasure,
  measureCosponsors,
} from "../simulation/governing/congress-chambers";
import { chamberByKey, committeeByKey } from "../simulation/legislature-rules";
import { personPronouns } from "../simulation/person-identity";
import { personName } from "../simulation/people";
import type {
  EntityId,
  IsoDate,
  LegislativeActionRecord,
  World,
} from "../simulation/types";
import { proseDate } from "./prose-dates";

/**
 * A Congress bill printed the way Congress prints one: the Congress and
 * session, the chamber it was introduced in, who introduced it and with whom,
 * the committee it went to, the enacting clause and its sections, and the
 * record of what each House and the President did with it.
 *
 * Every line is read from the save. The sections are the bill's recorded
 * provisions; a bill with none says so, because a federal bill's operative
 * text is not modeled yet and printing a plausible one would invent law.
 */

export interface BillPaperSection {
  readonly label: string;
  readonly heading: string;
  readonly text: string;
  /** True for a line that stands in for text the save does not hold. */
  readonly missing: boolean;
}

export interface BillPaper {
  readonly measureId: EntityId;
  /** "119th CONGRESS". */
  readonly congressLine: string;
  /** "2d Session". */
  readonly sessionLine: string;
  readonly designation: string;
  /** "IN THE HOUSE OF REPRESENTATIVES". */
  readonly chamberLine: string;
  /** Who introduced it, with whom, when, and where it was referred. */
  readonly introduction: string;
  /** "A BILL" until its first House passes it, then "AN ACT". */
  readonly kindLabel: "A BILL" | "AN ACT";
  readonly enactingClause: string;
  readonly sections: readonly BillPaperSection[];
  /** "LAW · IN EFFECT MARCH 31, 2026", "PENDING · NOT LAW", and so on. */
  readonly stamp: string;
  readonly enacted: boolean;
  /** What each House and the President did, in order. */
  readonly record: readonly string[];
}

/** 1 U.S.C. 101: the enacting clause every Act of Congress carries. */
const ENACTING_CLAUSE =
  "Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,";

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * The Congress and session sitting on a date. The Twentieth Amendment starts
 * each Congress on January 3 of an odd year; the 1st Congress began in 1789.
 * Congress prints the session as "1st Session" or "2d Session".
 */
export function congressSittingOn(date: IsoDate): {
  readonly congress: number;
  readonly session: 1 | 2;
} {
  const year = Number(date.slice(0, 4));
  const beforeJanuary3 = date.slice(5) < "01-03";
  const effectiveYear = beforeJanuary3 ? year - 1 : year;
  const congress = Math.floor((effectiveYear - 1789) / 2) + 1;
  const session = (effectiveYear - 1789) % 2 === 0 ? 1 : 2;
  return { congress, session };
}

function nameOf(world: World, personId: EntityId | null): string | null {
  if (!personId) return null;
  const person = world.people[personId];
  return person ? personName(person) : null;
}

function joined(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function upperDate(date: IsoDate): string {
  return proseDate(date).toUpperCase();
}

/** The printed bill for a Congress measure; null for any other measure. */
export function projectBillPaper(
  world: World,
  measureId: EntityId,
): BillPaper | null {
  const measure = measureById(world, measureId);
  if (!measure || !isCongressMeasure(measure)) return null;
  const pack = rulePackForMeasure(world, measureId);
  const actions = measureActions(world, measureId);
  const votes = new Map(
    measureVotes(world, measureId).map((vote) => [vote.id, vote]),
  );
  const position = measurePosition(world, measureId);
  const enactment = measureEnactment(world, measureId);
  const origin = chamberByKey(pack, measure.originChamberKey);
  const sitting = congressSittingOn(measure.introducedAt);

  const sponsor = nameOf(world, measure.sponsorPersonId) ?? "A member";
  const reflexive = personPronouns(
    measure.sponsorPersonId ? world.people[measure.sponsorPersonId] : undefined,
  ).reflexive;
  const cosponsors = measureCosponsors(world, measureId)
    .map((id) => nameOf(world, id))
    .filter((name): name is string => name !== null);
  const firstReferral = actions.find(
    (action) =>
      action.kind === "referred" &&
      action.chamberKey === measure.originChamberKey &&
      action.committeeKey !== null,
  );
  const referredTo = firstReferral
    ? committeeByKey(origin, firstReferral.committeeKey!).name
    : null;
  const introduction = [
    `${proseDate(measure.introducedAt)}.`,
    cosponsors.length > 0
      ? `${sponsor} (for ${reflexive} and ${joined(cosponsors)}) introduced the following bill;`
      : `${sponsor} introduced the following bill;`,
    referredTo
      ? `which was referred to the ${referredTo}.`
      : "which has not yet been referred to a committee.",
  ].join(" ");

  const passedOrigin = actions.some(
    (action) =>
      action.kind === "transmitted" ||
      (action.kind === "floor-stage-passed" &&
        action.chamberKey === measure.originChamberKey &&
        action.floorStageKey === origin.floorStages.at(-1)?.stageKey),
  );

  const provisions = currentMeasureProvisions(world, measureId);
  const sections: BillPaperSection[] = [
    {
      label: "SECTION 1.",
      heading: "SHORT TITLE.",
      text: `This Act may be cited as the “${measure.shortTitle}”.`,
      missing: false,
    },
    ...provisions.map((provision) => ({
      label: `SEC. ${provision.sectionNumber + 1}.`,
      heading: `${provision.heading.toUpperCase()}.`,
      text: provision.text,
      missing: false,
    })),
  ];
  if (provisions.length === 0)
    sections.push({
      label: "SEC. 2.",
      heading: "WHAT IT CHANGES.",
      text: "The operative text of this bill is not written yet. The game does not yet model what a federal law on this subject does, so it prints nothing rather than invent it.",
      missing: true,
    });

  const executive = pack.executive.titleLabel;
  const record: string[] = [];
  const chamberName = (action: LegislativeActionRecord): string =>
    action.chamberKey ? chamberByKey(pack, action.chamberKey).name : "";
  for (const action of actions) {
    const vote = action.voteId ? votes.get(action.voteId) : undefined;
    const tally = vote ? ` (${vote.tally.yea} to ${vote.tally.nay})` : "";
    const when = proseDate(action.occurredAt);
    const chamber = action.chamberKey
      ? chamberByKey(pack, action.chamberKey)
      : null;
    const lastStage = chamber?.floorStages.at(-1)?.stageKey;
    switch (action.kind) {
      case "floor-stage-passed":
        record.push(
          action.floorStageKey === lastStage
            ? `Passed the ${chamberName(action)} ${when}${tally}.`
            : `The ${chamberName(action)} ended debate ${when}${tally}.`,
        );
        break;
      case "floor-stage-failed":
        record.push(
          action.floorStageKey === lastStage
            ? `Failed in the ${chamberName(action)} ${when}${tally}.`
            : `The ${chamberName(action)} could not end debate ${when}${tally}; the bill went no further there.`,
        );
        break;
      case "committee-not-reported":
        record.push(
          `The committee in the ${chamberName(action)} declined to report it ${when}${tally}.`,
        );
        break;
      case "signed":
        record.push(`Approved by the ${executive} ${when}.`);
        break;
      case "vetoed":
        record.push(`Returned by the ${executive} without approval ${when}.`);
        break;
      case "override-chamber-recorded":
        record.push(
          `The ${chamberName(action)} voted on overriding the veto ${when}${tally}.`,
        );
        break;
      case "override-succeeded":
        record.push(`The veto was overridden ${when}.`);
        break;
      case "override-failed":
        record.push(`The veto was sustained ${when}.`);
        break;
      case "enacted":
        record.push(
          `Became law ${when}${enactment?.actDesignation ? ` as ${enactment.actDesignation}` : ""}.`,
        );
        break;
      case "died-on-adjournment":
        record.push(`Died when Congress adjourned ${when}.`);
        break;
      default:
        break;
    }
  }

  let stamp: string;
  const enacted = position.outcome === "enacted";
  if (enacted) {
    stamp = enactment?.effectiveAt
      ? `LAW · IN EFFECT ${upperDate(enactment.effectiveAt)}`
      : "LAW · EFFECTIVE DATE NOT RECORDED";
  } else if (position.outcome === "vetoed-and-sustained") {
    stamp = "VETOED · NOT LAW";
  } else if (position.terminal) {
    stamp = "DID NOT PASS · NOT LAW";
  } else {
    stamp = "PENDING · NOT LAW";
  }

  return {
    measureId,
    congressLine: `${ordinal(sitting.congress)} CONGRESS`,
    sessionLine: sitting.session === 1 ? "1st Session" : "2d Session",
    designation: measure.designation,
    chamberLine: `IN THE ${origin.name.toUpperCase()}`,
    introduction,
    kindLabel: passedOrigin ? "AN ACT" : "A BILL",
    enactingClause: ENACTING_CLAUSE,
    sections,
    stamp,
    enacted,
    record,
  };
}
