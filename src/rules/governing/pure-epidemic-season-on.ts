// STOPGAP RULES3-GOV-111: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/epidemic.ts; RULES-3, 2026-10-11.
import { daysBetween, makeIsoDate } from "./dates";
import type { IsoDate } from "../../simulation/types";
import type { HealthSeverity } from "../../simulation/crisis/types";

export type ContactSetting =
  "household" | "family" | "work" | "school" | "acquaintance";

export const EPIDEMIC_ESTIMATE = {
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "Centers for Disease Control and Prevention influenza-like illness season (winter peak); contact settings ordered by closeness",
  /** Days between passes; a case passes it on during the week after onset. */
  passDays: 7,
  /**
   * The exposure one person carries in from outside town in a week, for each
   * person they see outside their home: the illness reaches a town through
   * its most-connected residents.
   */
  outsideExposurePerContact: 0.02,
  /**
   * Multiplier on outside exposure at the middle of each calendar month,
   * January first. Between two mid-months it slides along the line joining
   * them, so the season turns by the day and never at a month's edge.
   */
  seasonalMultiplier: [3, 3, 2, 1, 0.5, 0.25, 0.2, 0.2, 0.5, 1, 1.5, 2.5],
  /** The exposure one sick contact gives a person in one week, by setting. */
  exposureBySetting: {
    household: 0.3,
    family: 0.08,
    work: 0.08,
    school: 0.25,
    acquaintance: 0.05,
  } satisfies Record<ContactSetting, number>,
  /**
   * A person falls ill when a week's exposure, times how susceptible they
   * are and how careful they are, reaches this.
   */
  catchAt: 0.3,
  /**
   * How susceptible a person is by age at exposure. The factor holds near
   * each level through the middle of its ages and slides to the next across
   * `widthYears` around each turn (S-shaped), so a day of age moves it by a
   * hair and never by a band.
   */
  susceptibilityByAge: {
    levels: [1.5, 1.2, 1, 1.4],
    turnsAtAge: [4.5, 17.5, 64.5],
    widthYears: 1,
  },
  /** Susceptibility is multiplied by this while another illness is open. */
  alreadyIllFactor: 1.5,
  /** Exposure is multiplied by this for a person's recorded approach to risk. */
  carefulnessFactor: { cautious: 0.6, neutral: 1, "risk-seeking": 1.4 },
  /** Days after a case began in which the same person cannot catch it again. */
  immunityDays: 240,
  /**
   * How serious a case is, from 0 (an ordinary case) to 1 (a serious one).
   * It slides up toward 1 for a baby around the first birthday and for an
   * old person around 80, each across its own width in years, and is 1 for
   * anyone already fighting another illness. The case's added risk of dying
   * slides with it between the two `hazardMicros` levels; it is called
   * serious from one half up.
   */
  seriousness: {
    infantTurnsAtAge: 1,
    infantWidthYears: 1,
    oldTurnsAtAge: 80,
    oldWidthYears: 4,
  },
  /** Multiplier on all-cause death risk while an episode lasts, in millionths. */
  hazardMicros: {
    acute: 1_500_000,
    serious: 8_000_000,
  } satisfies Record<Exclude<HealthSeverity, "chronic">, number>,
  /** Share of a school out sick at which a principal closes it, by risk approach. */
  schoolClosureShare: { cautious: 0.1, neutral: 0.15, "risk-seeking": 0.22 },
  /** A school reopens once the share out sick falls below this fraction of its bar. */
  reopenFractionOfBar: 0.5,
  /** Share of a town's named residents out sick at which a chair cancels a meeting. */
  meetingCancelShare: { cautious: 0.06, neutral: 0.1, "risk-seeking": 0.15 },
  /** A school decision is only considered, and recorded, from this many out sick. */
  minimumSickToDecide: 2,
  /**
   * A job of this many expected hours a week or more pays through sick days;
   * a shorter one does not. The line is the federal full-time line (26 U.S.C.
   * 4980H(c)(4)). Check: the BLS National Compensation Survey (March 2024)
   * finds paid sick leave for 88% of full-time and 47% of part-time
   * private-industry workers.
   */
  fullTimeWeeklyHours: 30,
  /** A sick child this young needs an adult home with them. */
  careAgeUnder: 12,
  /** Days a newspaper-worthy week needs: new cases in one town in one week. */
  newsNewCasesInWeek: 5,
  researchQuestions: [
    "epidemic-transmission-by-setting",
    "epidemic-severity-by-age",
    "epidemic-seasonality",
    "epidemic-school-closure-practice",
    "epidemic-public-meeting-cancellation-practice",
  ],
} as const;

export const U = EPIDEMIC_ESTIMATE;

export function epidemicSeasonOn(date: IsoDate): number {
  const levels = U.seasonalMultiplier;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const middle = (y: number, m: number) =>
    makeIsoDate(
      `${String(y + Math.floor((m - 1) / 12)).padStart(4, "0")}-${String(
        ((((m - 1) % 12) + 12) % 12) + 1,
      ).padStart(2, "0")}-15`,
    );
  // The mid-month on or before the date, and the one after it.
  const back = date >= middle(year, month) ? 0 : 1;
  const fromMonth = month - back;
  const from = middle(year, fromMonth);
  const to = middle(year, fromMonth + 1);
  const share = daysBetween(from, date) / daysBetween(from, to);
  const level = (m: number) => levels[(((m - 1) % 12) + 12) % 12]!;
  return level(fromMonth) + share * (level(fromMonth + 1) - level(fromMonth));
}
