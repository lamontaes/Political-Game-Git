import type { EntityId, World } from "../simulation";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { governmentUnitsForPlace } from "../simulation/government-units";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { stateExecutiveOffice } from "../simulation/nationwide-world/state-executives";
import { projectCongress } from "../simulation/living-world/congress";
import { openingLifeLocation } from "./life-scene-flow";
import { legislativeRulePackForState } from "./new-game-geography";
import { currentPublicOfficeholders } from "./opening-officeholders";

/**
 * The Politics hub's Government browser (UI DECISION FOLLOW-THROUGH).
 *
 * A read of public government for one place, never a grant of power: a
 * citizen may look at any branch without holding it. The default place is
 * where the character is now, which travel changes; the office they hold and
 * the contest they run stay with Your office and Campaigns. Every entry comes
 * from a record the World or an accepted rule pack already has. A branch with
 * no record says so; an office with no current holder record is not called a
 * vacancy; a county is never given an institution it does not have.
 */

export type GovernmentScope = "local" | "state" | "federal";
export type GovernmentBranch = "legislative" | "executive" | "judicial";

export const GOVERNMENT_SCOPES: readonly GovernmentScope[] = [
  "local",
  "state",
  "federal",
];

const SCOPE_LABELS: Readonly<Record<GovernmentScope, string>> = {
  local: "Local",
  state: "State",
  federal: "Federal",
};

const BRANCH_LABELS: Readonly<Record<GovernmentBranch, string>> = {
  legislative: "Legislative",
  executive: "Executive",
  judicial: "Judicial",
};

export interface GovernmentEntry {
  readonly key: string;
  readonly title: string;
  readonly holderName: string | null;
  readonly holderPersonId: EntityId | null;
  readonly detail: string | null;
}

export interface GovernmentBranchView {
  readonly branch: GovernmentBranch;
  readonly label: string;
  readonly entries: readonly GovernmentEntry[];
  /** Plain statement when nothing is recorded for this branch here. */
  readonly absent: string | null;
}

export interface GovernmentPlaceRef {
  readonly jurisdictionId: EntityId | null;
  readonly label: string;
}

export interface GovernmentBrowserView {
  readonly here: GovernmentPlaceRef;
  readonly home: GovernmentPlaceRef;
  /** The place being browsed, and whether it is where the character is. */
  readonly browsing: GovernmentPlaceRef & {
    readonly isHere: boolean;
    readonly isHome: boolean;
  };
  readonly scope: GovernmentScope;
  readonly scopeLabel: string;
  /** "Nevada", "Alamo, Nevada", "United States" — what this scope governs. */
  readonly governs: string | null;
  readonly branches: readonly GovernmentBranchView[];
  /**
   * Other general-purpose governments that serve this place (a county, for
   * instance), listed as the Census Bureau records them rather than forced
   * into a branch they may not have. Only known for the character's home.
   */
  readonly alsoGoverning: readonly GovernmentEntry[];
}

export interface GovernmentBrowserOptions {
  readonly scope?: GovernmentScope;
  /** An explicitly chosen place; null or absent browses "Here". */
  readonly jurisdictionId?: EntityId | null;
}

function placeLabel(jurisdictionId: EntityId | null): string | null {
  if (!jurisdictionId) return null;
  return lifePlaceByJurisdictionId(jurisdictionId)?.displayName ?? null;
}

function branch(
  key: GovernmentBranch,
  entries: readonly GovernmentEntry[],
  absent: string,
): GovernmentBranchView {
  return {
    branch: key,
    label: BRANCH_LABELS[key],
    entries,
    absent: entries.length > 0 ? null : absent,
  };
}

function holderEntry(
  world: World,
  officeKey: string,
  fallbackTitle: string,
): GovernmentEntry | null {
  const holder = currentPublicOfficeholders(world).find(
    (record) => record.officeKey === officeKey,
  );
  if (!holder) return null;
  return {
    key: `office:${officeKey}`,
    title: holder.title || fallbackTitle,
    holderName: holder.personName,
    holderPersonId: holder.personId,
    detail: null,
  };
}

function localBranches(
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  name: string,
): { governs: string | null; branches: GovernmentBranchView[] } {
  if (!place || place.scope === "state") {
    const none = `No local government is recorded for ${name}.`;
    return {
      governs: null,
      branches: [
        branch("legislative", [], none),
        branch("executive", [], none),
        branch("judicial", [], none),
      ],
    };
  }
  const government = municipalGovernmentForLifePlace(place);
  let bodyName: string | null = null;
  let form: string | null = null;
  if (government) {
    try {
      const reading = primaryReading(government);
      bodyName = reading.bodyName;
      form = reading.form;
    } catch {
      /* a government with no reading carries no body or form to show */
    }
  }
  const legislative: GovernmentEntry[] = [];
  if (government && bodyName) {
    legislative.push({
      key: `local-body:${government.key}`,
      title: bodyName,
      holderName: null,
      holderPersonId: null,
      detail: government.displayName,
    });
  } else {
    const units = place.sourceGeoid
      ? governmentUnitsForPlace(place.sourceGeoid)
      : [];
    for (const unit of units) {
      legislative.push({
        key: `unit:${unit.id}`,
        title: unit.name,
        holderName: null,
        holderPersonId: null,
        detail: "Local government listed by the Census Bureau",
      });
    }
  }
  const executive: GovernmentEntry[] =
    government && form
      ? [
          {
            key: `local-executive:${government.key}`,
            title: `${government.displayName} — ${formLabel(form)}`,
            holderName: null,
            holderPersonId: null,
            detail: "No current officeholder is recorded in this save.",
          },
        ]
      : [];
  return {
    governs: government?.displayName ?? place.displayName,
    branches: [
      branch(
        "legislative",
        legislative,
        `No local legislative body is recorded for ${name}.`,
      ),
      branch(
        "executive",
        executive,
        `No local executive office is recorded for ${name}.`,
      ),
      branch("judicial", [], `No local court is recorded for ${name}.`),
    ],
  };
}

const FORM_LABELS: Readonly<Record<string, string>> = {
  MAYOR_COUNCIL: "mayor and council",
  COUNCIL_MANAGER: "council with an appointed manager",
  COMMISSION_MANAGER: "commission with an appointed manager",
  CITY_MANAGER: "appointed city manager",
  TOWN_MEETING: "town meeting",
  URBAN_COUNTY_CONSOLIDATED: "consolidated city and county",
  CITY_COUNTY_CONSOLIDATED: "consolidated city and county",
  CONSOLIDATED_CITY_COUNTY: "consolidated city and county",
};

function formLabel(form: string): string {
  return FORM_LABELS[form] ?? form.toLowerCase().replace(/_/g, " ");
}

function stateBranches(
  world: World,
  stateKey: string | null,
): { governs: string | null; branches: GovernmentBranchView[] } {
  const stateName = stateKey
    ? (stateJurisdictionForKey(stateKey)?.name ?? null)
    : null;
  const subject = stateName ?? "this place's state";
  if (!stateKey || !/^US-[A-Z]{2}$/.test(stateKey)) {
    const none = "No state government is recorded for this place.";
    return {
      governs: null,
      branches: [
        branch("legislative", [], none),
        branch("executive", [], none),
        branch("judicial", [], none),
      ],
    };
  }
  const pack = legislativeRulePackForState(stateKey);
  const legislative: GovernmentEntry[] = pack
    ? [
        {
          key: `legislature:${pack.packId}`,
          title: pack.displayName,
          holderName: null,
          holderPersonId: null,
          detail:
            pack.chambers.length > 0
              ? pack.chambers.map((chamber) => chamber.name).join(" and ")
              : null,
        },
      ]
    : [];
  const office = stateExecutiveOffice(stateKey.slice(3));
  const executive: GovernmentEntry[] = [];
  if (office) {
    executive.push(
      holderEntry(world, office.officeKey, office.displayName) ?? {
        key: `office:${office.officeKey}`,
        title: office.displayName,
        holderName: null,
        holderPersonId: null,
        detail: "No current officeholder is recorded in this save.",
      },
    );
  }
  return {
    governs: stateName,
    branches: [
      branch(
        "legislative",
        legislative,
        `The game has not established ${subject}'s legislature.`,
      ),
      branch(
        "executive",
        executive,
        `The game has not established ${subject}'s executive office.`,
      ),
      branch(
        "judicial",
        [],
        `The game has not established ${subject}'s courts.`,
      ),
    ],
  };
}

function federalBranches(world: World): {
  governs: string | null;
  branches: GovernmentBranchView[];
} {
  const congress = projectCongress(world);
  const legislative: GovernmentEntry[] = congress
    ? [congress.house, congress.senate].map((chamber) => ({
        key: `chamber:${chamber.chamberKey}`,
        title: chamber.name,
        holderName: null,
        holderPersonId: null,
        detail: `${chamber.totals.members} of ${chamber.totals.seats} seats have a recorded member.`,
      }))
    : [];
  const president = holderEntry(
    world,
    "us-president",
    "President of the United States",
  );
  const chiefJustice = holderEntry(
    world,
    "us-chief-justice",
    "Chief Justice of the United States",
  );
  return {
    governs: "United States",
    branches: [
      branch(
        "legislative",
        legislative,
        "Congress is not established in this save.",
      ),
      branch(
        "executive",
        president ? [president] : [],
        "No current President is recorded in this save.",
      ),
      branch(
        "judicial",
        chiefJustice ? [chiefJustice] : [],
        "No current Chief Justice is recorded in this save.",
      ),
    ],
  };
}

export function projectGovernmentBrowser(
  world: World,
  personId: EntityId,
  options: GovernmentBrowserOptions = {},
): GovernmentBrowserView {
  const person = world.people[personId];
  const homeId = person?.homeJurisdictionId ?? null;
  const location = openingLifeLocation(world, personId);
  const hereId = location?.jurisdictionId ?? homeId;
  const here: GovernmentPlaceRef = {
    jurisdictionId: hereId,
    label: location?.label ?? placeLabel(hereId) ?? "Where you are",
  };
  const home: GovernmentPlaceRef = {
    jurisdictionId: homeId,
    label: placeLabel(homeId) ?? "Home",
  };
  const browsingId = options.jurisdictionId ?? hereId;
  const browsingPlace = browsingId
    ? lifePlaceByJurisdictionId(browsingId)
    : null;
  const browsingName =
    browsingPlace?.displayName ??
    (browsingId === hereId ? here.label : "this place");
  const scope = options.scope ?? "local";
  const alsoGoverning: GovernmentEntry[] =
    scope === "local" && browsingId !== null && browsingId === homeId
      ? homeLocalGovernmentUnits(world, personId).counties.map((unit) => ({
          key: `county:${unit.id}`,
          title: unit.name,
          holderName: null,
          holderPersonId: null,
          detail: "County government listed by the Census Bureau",
        }))
      : [];
  const resolved =
    scope === "local"
      ? localBranches(browsingPlace, browsingName)
      : scope === "state"
        ? stateBranches(
            world,
            browsingPlace?.stateJurisdictionKey ??
              (browsingPlace?.scope === "state" ? browsingPlace.key : null),
          )
        : federalBranches(world);
  return {
    here,
    home,
    browsing: {
      jurisdictionId: browsingId,
      label: browsingName,
      isHere: browsingId === hereId,
      isHome: browsingId === homeId,
    },
    scope,
    scopeLabel: SCOPE_LABELS[scope],
    governs: resolved.governs,
    branches: resolved.branches,
    alsoGoverning,
  };
}

export function governmentScopeLabel(scope: GovernmentScope): string {
  return SCOPE_LABELS[scope];
}
