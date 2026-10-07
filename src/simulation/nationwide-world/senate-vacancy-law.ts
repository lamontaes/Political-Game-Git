/**
 * HOW EACH STATE FILLS A VACANT U.S. SENATE SEAT — the Seventeenth Amendment
 * has the governor issue writs of election, and lets the legislature let the
 * governor appoint a senator until the people fill the seat. Each state's
 * statute decides whether the governor may appoint, whom, how soon, and when
 * the special election falls.
 *
 * Where each row comes from, row by row in `source`:
 *
 * - `crs-r44781-2017`: Congressional Research Service report R44781, "U.S.
 *   Senate Vacancies: Contemporary Developments and Perspectives," updated
 *   May 17, 2017 (read September 28, 2026, at everycrsreport.com). That is a
 *   summary of each statute as of 2017, not the statute read today; several
 *   states have changed since. Research 9 is reading each current statute,
 *   and a row is replaced when it is read.
 * - `statute-read-2026`: the statute text itself, read September 28, 2026.
 *
 * A special election's timing is simplified to one date: the earliest day
 * the statute allows after the vacancy (`prompt`), or the next regular
 * November election (`next-general`). The proximity rules that move a
 * special election onto a regular election are simplified: whenever the next
 * regular November election comes before the prompt date, it is used. Where
 * the statute's window is not recorded, `promptDays` is null and the window
 * is ESTIMATED FROM AVERAGE: the median of the windows the other states'
 * statutes set (`SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS`), marked as such.
 *
 * September 29, 2026: 44 rows are read from the statute and 6 stay from the
 * 2017 summary (Arkansas, Georgia, Indiana, Mississippi, New Mexico and
 * Tennessee), whose official codes could not be read.
 */

export type SenateAppointmentRule =
  /** The governor may not appoint; the seat is empty until the election. */
  | "none"
  /** The governor appoints anyone qualified. */
  | "governor"
  /** The governor must appoint someone of the departed senator's party. */
  | "governor-same-party"
  /** The governor picks from names the departed senator's party submits. */
  | "governor-from-party-list";

export interface SenateVacancyLaw {
  readonly stateUsps: string;
  readonly appointment: SenateAppointmentRule;
  /** The latest day after the vacancy the statute allows an appointment. */
  readonly appointmentDeadlineDays: number | null;
  readonly specialElection:
    | { readonly kind: "next-general" }
    | { readonly kind: "prompt"; readonly promptDays: number | null };
  readonly citation: string | null;
  readonly source: "crs-r44781-2017" | "statute-read-2026";
}

const NEXT_GENERAL = { kind: "next-general" } as const;
const prompt = (promptDays: number | null) =>
  ({ kind: "prompt", promptDays }) as const;

function crs(
  stateUsps: string,
  appointment: SenateAppointmentRule,
  specialElection: SenateVacancyLaw["specialElection"] = NEXT_GENERAL,
  citation: string | null = null,
): SenateVacancyLaw {
  return {
    stateUsps,
    appointment,
    appointmentDeadlineDays: null,
    specialElection,
    citation,
    source: "crs-r44781-2017",
  };
}

function read(
  stateUsps: string,
  appointment: SenateAppointmentRule,
  appointmentDeadlineDays: number | null,
  specialElection: SenateVacancyLaw["specialElection"],
  citation: string,
): SenateVacancyLaw {
  return {
    stateUsps,
    appointment,
    appointmentDeadlineDays,
    specialElection,
    citation,
    source: "statute-read-2026",
  };
}

const ROWS: readonly SenateVacancyLaw[] = [
  // Statutes read September 28, 2026, by Research 9 (research file
  // r9-primaries/senate-vacancy-law-2026.csv) and by Build 27 (Oregon).
  // No appointment: the seat is empty until the special election.
  read("ND", "none", null, prompt(95), "N.D.C.C. 16.1-13-08"),
  // Read in the Oklahoma Senate's 2019 compilation; later amendments unread.
  read("OK", "none", null, prompt(null), "26 O.S. 12-101"),
  read("RI", "none", null, prompt(null), "R.I. Gen. Laws 17-4-9"),
  // No appointment since P.A. 09-170 (2009): writs within 10 days for an
  // election on the 150th day.
  read("CT", "none", null, prompt(150), "Conn. Gen. Stat. 9-211"),
  read("WI", "none", null, prompt(null), "Wis. Stat. 17.18, 8.50(4)(b)"),
  // KRS 63.200, the appointment statute, was repealed by 2024 Ky. Acts
  // ch. 187, sec. 4, effective April 12, 2024. KRS 118.720 sets no date.
  read("KY", "none", null, prompt(null), "KRS 118.720"),
  // The appointee must share the departed senator's party.
  // ORS 188.120: within 30 days; a special election 80 to 150 days after.
  read("OR", "governor-same-party", 30, prompt(80), "ORS 188.120"),
  // A.R.S. 16-222(D), an exception, is unread.
  read("AZ", "governor-same-party", null, NEXT_GENERAL, "A.R.S. 16-222"),
  // The governor picks from the departed senator's party's names. North
  // Carolina: three names within 30 days, election at the first legislative
  // election more than 60 days after the vacancy. Maryland: names within 30
  // days, then 15 days to appoint. Wyoming: the committee meets within 15
  // days, then 5 days to appoint.
  read("NC", "governor-from-party-list", null, NEXT_GENERAL, "G.S. 163-12"),
  read(
    "MD",
    "governor-from-party-list",
    45,
    NEXT_GENERAL,
    "Md. Election Law 8-602",
  ),
  read(
    "WY",
    "governor-from-party-list",
    20,
    NEXT_GENERAL,
    "W.S. 22-18-111(a)(i)",
  ),
  // Appointment, then a prompt special election. Alaska: a special primary
  // 60 to 90 days after the vacancy and the election at least 60 days
  // later, so 120 days at the earliest. Washington: a writ within 10 days,
  // the primary at least 70 days after it and the election at least 70
  // after that, so 140 days at the earliest.
  read("AK", "governor", 30, prompt(120), "AS 15.40.140, 15.40.145"),
  read("MA", "governor", null, prompt(145), "M.G.L. c.54 s.140"),
  read("WA", "governor", null, prompt(140), "RCW 29A.28.030, 29A.28.041"),
  // Read September 28 and 29, 2026, by Research 9 (same file), loaded by
  // Build 27. Where a statute switches rule by the date of the vacancy, the
  // row gives its rule for a vacancy early in a term; the cutoffs are not
  // modeled.
  // Hawaii: three names from the departed senator's party.
  read("HI", "governor-from-party-list", null, NEXT_GENERAL, "HRS 17-1"),
  // Utah: the Legislature nominates three of the departed senator's party.
  // The special primary and general fall on existing election dates, each
  // more than 90 days after the step before it, with the proclamation due
  // in 7 days: 187 days at the earliest.
  read(
    "UT",
    "governor-from-party-list",
    null,
    prompt(187),
    "Utah Code 20A-1-502",
  ),
  // Montana: the party's three names, and an election 85 to 100 days after.
  read("MT", "governor-from-party-list", null, prompt(85), "MCA 13-25-206"),
  // West Virginia: the party gives three names within 15 days, and the
  // governor appoints within 5 days of receiving them.
  read(
    "WV",
    "governor-from-party-list",
    20,
    NEXT_GENERAL,
    "W. Va. Code 3-10-4, 3-10-1",
  ),
  // Nevada: the appointee must share the former senator's party.
  read("NV", "governor-same-party", null, NEXT_GENERAL, "NRS 304.030"),
  // Kansas: the governor picks from three people a legislative committee
  // recommends, of any party; the committee is not modeled.
  read("KS", "governor", null, NEXT_GENERAL, "K.S.A. 25-322 to 25-325"),
  // Appointment, then a special election on its own schedule. Texas's
  // Chapter 203 dates are unread, so its 36 days stay the 2017 summary's.
  // Vermont (within six months), Louisiana (a date the governor sets;
  // appointment within 10 days) and Alabama ("forthwith") set no fixed
  // window.
  read("TX", "governor", null, prompt(36), "Tex. Elec. Code 204.001-204.005"),
  read("VT", "governor", null, prompt(null), "17 V.S.A. 2621, 2622"),
  read("LA", "governor", 10, prompt(null), "La. R.S. 18:1278"),
  read("AL", "governor", null, prompt(null), "Ala. Code 36-9-7 to 36-9-9"),
  // Appointment until the next general election. Pennsylvania also uses an
  // odd-year municipal election, which the game does not hold for Congress.
  // Missouri's election statute is unread; its timing is ESTIMATED FROM
  // AVERAGE, the most common rule among the states read.
  ...(
    [
      ["CA", "Cal. Elec. Code 10720"],
      ["CO", "C.R.S. 1-12-201"],
      ["DE", "15 Del. C. 7321"],
      ["FL", "Fla. Stat. 100.161"],
      ["ID", "Idaho Code 59-910"],
      ["IL", "10 ILCS 5/25-8"],
      ["IA", "Iowa Code 69.8, 69.11, 69.13"],
      ["ME", "21-A M.R.S. 391"],
      ["MI", "MCL 168.105"],
      ["MN", "Minn. Stat. 204D.28"],
      ["MO", "RSMo 105.040"],
      ["NE", "Neb. Rev. Stat. 32-565"],
      ["NH", "RSA 661:5"],
      ["NJ", "N.J.S.A. 19:3-26"],
      ["NY", "N.Y. Public Officers Law 42(4-a)"],
      ["OH", "Ohio Rev. Code 3521.02"],
      ["PA", "25 P.S. 2776"],
      ["SC", "S.C. Code 7-19-20"],
      ["SD", "SDCL 12-11-1, 12-11-4, 12-11-5"],
      ["VA", "Va. Code 24.2-207"],
    ] as const
  ).map(([usps, citation]) =>
    read(usps, "governor", null, NEXT_GENERAL, citation),
  ),
  // No official copy could be read in 2026 (captchas or script-only pages):
  // the 2017 summary stands, a source for each.
  crs("MS", "governor", prompt(90)),
  ...["AR", "GA", "IN", "NM", "TN"].map((usps) => crs(usps, "governor")),
];

/**
 * ESTIMATED FROM AVERAGE: the days to a prompt special election where the
 * state's statute gives no window, the median of the windows the recorded
 * statutes do give (10 states; 107 days as recorded September 29, 2026).
 * Affects when a vacant seat in such a state is filled.
 */
export const SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS: number = (() => {
  const days = ROWS.flatMap((row) =>
    row.specialElection.kind === "prompt" &&
    row.specialElection.promptDays !== null
      ? [row.specialElection.promptDays]
      : [],
  ).sort((a, b) => a - b);
  const mid = days.length >> 1;
  return days.length % 2 === 1
    ? days[mid]!
    : Math.floor((days[mid - 1]! + days[mid]!) / 2);
})();

const BY_STATE: ReadonlyMap<string, SenateVacancyLaw> = new Map(
  ROWS.map((row) => [row.stateUsps, row]),
);

/** The recorded law for a state's Senate vacancies, or null if none is. */
export function senateVacancyLaw(stateUsps: string): SenateVacancyLaw | null {
  return BY_STATE.get(stateUsps) ?? null;
}

/** Every recorded row, for tests and reports. */
export function senateVacancyLawRows(): readonly SenateVacancyLaw[] {
  return ROWS;
}

export interface SenateAppointmentTiming {
  readonly days: number;
  readonly basis: "recorded-deadline" | "estimated-deadline-proxy";
  readonly comparatorCount: number;
  readonly comparison: "same-appointment-rule" | "all-appointment-rules" | null;
}

/** A legal deadline is a latest day, not an observed appointment duration.
 * Schedule at that bound where recorded. Otherwise use the median recorded
 * deadline for the same appointment rule, falling back to all appointing
 * rules. This is explicitly an estimate from legal windows, not observed
 * governor behavior; no appointment is scheduled where the law forbids one.
 */
export function senateAppointmentTiming(
  law: SenateVacancyLaw | null,
): SenateAppointmentTiming | null {
  if (law?.appointment === "none") return null;
  if (
    law?.appointmentDeadlineDays !== null &&
    law?.appointmentDeadlineDays !== undefined
  )
    return {
      days: law.appointmentDeadlineDays,
      basis: "recorded-deadline",
      comparatorCount: 0,
      comparison: null,
    };
  const recorded = ROWS.filter(
    (row) => row.appointment !== "none" && row.appointmentDeadlineDays !== null,
  );
  const similar = law
    ? recorded.filter((row) => row.appointment === law.appointment)
    : [];
  const comparators = similar.length ? similar : recorded;
  const days = comparators
    .map((row) => row.appointmentDeadlineDays!)
    .sort((a, b) => a - b);
  if (!days.length)
    throw new Error(
      "No recorded Senate appointment deadlines to estimate from.",
    );
  const middle = Math.floor(days.length / 2);
  return {
    days:
      days.length % 2
        ? days[middle]!
        : Math.floor((days[middle - 1]! + days[middle]!) / 2),
    basis: "estimated-deadline-proxy",
    comparatorCount: days.length,
    comparison: similar.length
      ? "same-appointment-rule"
      : "all-appointment-rules",
  };
}
