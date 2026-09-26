import { governmentUnitDisplayName } from "./government-unit-names";
import type { GovernmentUnitIdentity } from "../government-units";
import { primaryReading } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";

/**
 * What a town's governing body is called, and what one of its members is
 * called, for every municipal government.
 *
 * Read first: where the game has compiled the town's government and its
 * reading names the body (`MunicipalReading.bodyName`, reached the way the
 * mayor's title is in `local-chief-executive-rules.ts`), that name is used.
 * A reading that names only the kind of body, such as "City Council" or
 * "Board of Commissioners", gets the town's own name in front of it; a
 * reading that already names the town ("Anchorage Assembly", "Council of the
 * District of Columbia") is used as it stands. No reading records a member's
 * title, so a member is a "Council member" of a body the reading calls a
 * council and otherwise a "Member of the" body by its read name.
 *
 * A town-meeting reading names the meeting of the voters, not an elected
 * body, so it is not used as the name of a seat anybody files for.
 *
 * GAME PROFILE, PLACEHOLDER until each town's own body is researched
 * (research request `municipal-governing-body-names-and-member-titles`): a
 * town whose body has not been read is named by the kind of government its
 * Census listing name gives it, in `PLACEHOLDER_BODY_BY_FORM`. These are
 * common American usages, not the town's own words; a real town may call its
 * body a commission, a board of aldermen or a select board.
 *
 * Display strings only. Office keys and IDs never depend on them.
 */

export type LocalBodyNameBasis = "read" | "game-profile";

export interface LocalGoverningBodyName {
  /** "Seattle City Council", "Anchorage Assembly". */
  readonly bodyName: string;
  /** The body without the town in front, where it was added: "City Council". */
  readonly shortBodyName: string;
  /** "Council member", "Trustee", or "Member of the Anchorage Assembly". */
  readonly memberTitle: string;
  readonly basis: LocalBodyNameBasis;
}

interface PlaceholderBody {
  readonly body: string;
  readonly member: string;
}

/**
 * GAME PROFILE placeholder, by the form of government the listing's name
 * gives ("City of", "Town of", ...). Replace with each town's own body once
 * researched.
 */
const PLACEHOLDER_BODY_BY_FORM: Readonly<Record<string, PlaceholderBody>> = {
  city: { body: "City Council", member: "Council member" },
  town: { body: "Town Council", member: "Council member" },
  village: { body: "Village Board", member: "Trustee" },
  borough: { body: "Borough Council", member: "Council member" },
};
const PLACEHOLDER_OTHERWISE: PlaceholderBody = {
  body: "Council",
  member: "Council member",
};

/** Words that name only a kind of body, never a particular town. */
const GENERIC_BODY_WORDS = new Set([
  "aldermen",
  "alders",
  "and",
  "assembly",
  "board",
  "body",
  "borough",
  "city",
  "commission",
  "commissioners",
  "common",
  "council",
  "county",
  "court",
  "directors",
  "governing",
  "mayor",
  "metropolitan",
  "municipal",
  "of",
  "supervisors",
  "the",
  "town",
  "trustees",
  "urban",
  "village",
]);

const TOWN_MEETING_FORMS = new Set(["TOWN_MEETING", "ANNUAL_TOWN_MEETING"]);

/** "City of Seattle" -> ["city", "Seattle"]; a name without "of" has no form. */
function formAndPlace(unit: GovernmentUnitIdentity): {
  readonly form: string | null;
  readonly place: string;
} {
  const display = governmentUnitDisplayName(unit);
  const at = display.indexOf(" of ");
  if (at < 0) return { form: null, place: display };
  return {
    form: display.slice(0, at).toLowerCase(),
    place: display.slice(at + " of ".length),
  };
}

function namesNoTown(bodyName: string): boolean {
  return bodyName
    .toLowerCase()
    .split(/\s+/)
    .every((word) => GENERIC_BODY_WORDS.has(word));
}

export function localGoverningBodyName(
  unit: GovernmentUnitIdentity,
): LocalGoverningBodyName {
  const { form, place } = formAndPlace(unit);
  const government = municipalGovernmentForUnit(unit);
  const reading = government ? primaryReading(government) : null;
  const read =
    reading?.bodyName && !TOWN_MEETING_FORMS.has(reading.form ?? "")
      ? reading.bodyName.trim()
      : null;
  if (read) {
    const bodyName = namesNoTown(read) ? `${place} ${read}` : read;
    return {
      bodyName,
      shortBodyName: read,
      memberTitle: /\bcouncil$/i.test(read)
        ? "Council member"
        : `Member of the ${bodyName}`,
      basis: "read",
    };
  }
  const profile =
    (form ? PLACEHOLDER_BODY_BY_FORM[form] : undefined) ??
    PLACEHOLDER_OTHERWISE;
  return {
    bodyName: `${place} ${profile.body}`,
    shortBodyName: profile.body,
    memberTitle: profile.member,
    basis: "game-profile",
  };
}
