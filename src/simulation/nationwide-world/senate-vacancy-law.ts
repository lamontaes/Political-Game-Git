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

/**
 * PLACEHOLDER: how many days a governor takes to appoint when the statute
 * sets no deadline. Kept from the earlier game profile.
 */
export const SENATE_APPOINTMENT_PLACEHOLDER_DAYS = 10;

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
  // Not readable by script in 2026 (TO READ): the 2017 summary stands.
  crs("HI", "governor-from-party-list"),
  crs("UT", "governor-same-party", NEXT_GENERAL, "Utah Code 20A-1-502"),
  crs("TX", "governor", prompt(36)),
  // Appointment, then a prompt special election (CRS 2017).
  crs("AL", "governor", prompt(null), "Ala. Code 36-9-7"),
  crs("LA", "governor", prompt(77)),
  crs("MS", "governor", prompt(90)),
  crs("VT", "governor", prompt(90)),
  // Appointment until the next general election (CRS 2017).
  ...[
    "AR",
    "CA",
    "CO",
    "DE",
    "FL",
    "GA",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "ME",
    "MI",
    "MN",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "OH",
    "PA",
    "SC",
    "SD",
    "TN",
    "VA",
    "WV",
  ].map((usps) => crs(usps, "governor")),
];

/**
 * ESTIMATED FROM AVERAGE: the days to a prompt special election where the
 * state's statute gives no window, the median of the windows the recorded
 * statutes do give (10 states; 92 days as recorded September 28, 2026).
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
