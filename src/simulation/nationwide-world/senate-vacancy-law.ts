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
 * - `secondary-2026`: a 2026 secondary source; the statute is unread.
 *
 * A special election's timing is simplified to one date: the earliest day
 * the statute allows after the vacancy (`prompt`), or the next regular
 * November election (`next-general`). The proximity rules that move a
 * special election onto a regular election are simplified: whenever the next
 * regular November election comes before the prompt date, it is used. Where
 * the statute's window is not recorded, `promptDays` is null and the game's
 * placeholder (`SENATE_SPECIAL_ELECTION_PLACEHOLDER_DAYS`) applies, marked.
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
  readonly source: "crs-r44781-2017" | "statute-read-2026" | "secondary-2026";
}

/** PLACEHOLDER: a prompt special election whose window is not recorded. */
export const SENATE_SPECIAL_ELECTION_PLACEHOLDER_DAYS = 90;
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

const ROWS: readonly SenateVacancyLaw[] = [
  // Special election only (CRS 2017): North Dakota, Oklahoma, Rhode Island,
  // Wisconsin. The window is not in the CRS summary.
  crs("ND", "none", prompt(null)),
  crs("OK", "none", prompt(null)),
  crs("RI", "none", prompt(null)),
  crs("WI", "none", prompt(null)),
  {
    // ORS 188.120, read September 28, 2026: the governor appoints within 30
    // days someone affiliated with the departed senator's party for the 180
    // days before; a special election 80 to 150 days after the vacancy.
    stateUsps: "OR",
    appointment: "governor-same-party",
    appointmentDeadlineDays: 30,
    specialElection: prompt(80),
    citation: "ORS 188.120",
    source: "statute-read-2026",
  },
  {
    // Wikipedia, "Seventeenth Amendment," citing NCSL (retrieved February
    // 2026): Kentucky no longer permits appointment. KRS 63.200 is unread.
    stateUsps: "KY",
    appointment: "none",
    appointmentDeadlineDays: null,
    specialElection: prompt(null),
    citation: "KRS 63.200 (unread)",
    source: "secondary-2026",
  },
  // Same-party limits (CRS 2017).
  crs("AZ", "governor-same-party"),
  crs("HI", "governor-from-party-list"),
  crs("MD", "governor-from-party-list"),
  crs("NC", "governor-same-party", NEXT_GENERAL, "N.C.G.S. 163-12"),
  crs("UT", "governor-same-party", NEXT_GENERAL, "Utah Code 20A-1-502"),
  crs("WY", "governor-same-party", NEXT_GENERAL, "Wyo. Stat. 22-18-111"),
  // Appointment, then a prompt special election (CRS 2017).
  crs("AL", "governor", prompt(null), "Ala. Code 36-9-7"),
  crs("AK", "governor", prompt(60)),
  crs("CT", "governor", prompt(150)),
  crs("LA", "governor", prompt(77)),
  crs("MA", "governor", prompt(145)),
  crs("MS", "governor", prompt(90)),
  crs("TX", "governor", prompt(36)),
  crs("VT", "governor", prompt(90)),
  crs("WA", "governor", prompt(140)),
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
