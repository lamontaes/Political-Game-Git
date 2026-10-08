import {
  activeWorkRelationshipsAt,
  describePersonContext,
  kinshipRelationshipsAt,
  organizationProfileAt,
  personName,
  type EntityId,
  type World,
} from "../simulation";
import { isProgramBookkeepingPublication } from "../simulation/public-information";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import { LIVING_WORLD_SCENARIO_PROFILE } from "../simulation/living-world/contract";
import { projectPublicMatters } from "../simulation/living-world/developments";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import {
  planStateChambers,
  stateLegislators,
} from "../simulation/nationwide-world/state-legislature-opening";
import { buildLifeIntroduction } from "./life-introduction";
import { projectMacroConditions } from "./macro-conditions";
import { projectGovernmentBrowser } from "./politics-government";
import type { OrientationView } from "./world-orientation";

/**
 * THE OPENING, READ FROM THE WORLD: THE YEAR, YOUR LEGISLATURE, YOUR TOWN
 * AND YOUR FAMILY.
 *
 * The opening walks from the country to the character (Lamontae, Sept. 28:
 * the year and the world, the White House, your state, your county and town,
 * and your story last). These readers supply the screens the tour did not
 * have. Every line is built from a record the World already holds; a fact the
 * World does not record is left out, never filled in, and a reader returns
 * nothing rather than an empty sentence. Pure: no writes, no randomness.
 */

/* -------------------------------------------------------------------------- */
/* In the year 2026                                                            */
/* -------------------------------------------------------------------------- */

export interface OpeningYearView {
  /** "2026", from the World's own date. */
  readonly year: string;
  /** Up to two real headlines with the outlet named on the publication record. */
  readonly publications: readonly {
    readonly outletName: string;
    readonly headline: string;
  }[];
  /**
   * Record values under a label (menu reset: no sentences): who leads, how
   * each chamber of Congress divides, the economy, and the form of the home
   * place's government.
   */
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}

function percent(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

/** The recognition of a local government is a record, not a news item. */
function isGovernmentRecognition(
  world: World,
  publication: { readonly sourceEventId: EntityId },
): boolean {
  return (
    world.history.events.find((event) => event.id === publication.sourceEventId)
      ?.type === "municipal.government-recognized"
  );
}

/** The home place's government, as a label and the value its record holds. */
function homeGovernmentFacts(
  home: EntityId | null | undefined,
): OpeningYearView["facts"] {
  const place = home ? lifePlaceByJurisdictionId(home) : null;
  const government = place ? municipalGovernmentForLifePlace(place) : null;
  if (!government) return [];
  const reading = primaryReading(government);
  return [
    {
      label: "Local government",
      value: reading.bodyName ?? government.displayName,
    },
  ];
}

export function projectOpeningYear(
  world: World,
  personId: EntityId,
  orientation: OrientationView,
): OpeningYearView {
  const facts: { label: string; value: string }[] = [];
  const executive = orientation.steps.find((step) => step.key === "executive");
  const president = executive?.people.find((person) =>
    /^President\b/.test(person.title),
  );
  if (president)
    facts.push({
      label: "President",
      value: [president.name, president.party].filter(Boolean).join(" · "),
    });
  const congress = orientation.steps.find((step) => step.key === "congress");
  for (const chamber of congress?.chambers ?? []) {
    // Every seat is accounted for: the parties' members and the empty seats
    // add up to the chamber.
    const vacant = chamber.roster.filter(
      (row) => row.status === "vacancy",
    ).length;
    const unrecorded = chamber.roster.filter(
      (row) => row.status !== "member" && row.status !== "vacancy",
    ).length;
    const parts = [
      ...chamber.parties
        .filter((party) => party.members > 0)
        .map((party) =>
          party.noParty || party.label === "Independent"
            ? `${party.members} ${party.members === 1 ? "independent" : "independents"}`
            : `${party.members} ${party.label}`,
        ),
      ...(vacant > 0 ? [`${vacant} vacant`] : []),
      ...(unrecorded > 0 ? [`${unrecorded} not recorded`] : []),
    ];
    if (parts.length > 0)
      facts.push({ label: chamber.name, value: parts.join(" · ") });
  }
  const home = world.people[personId]?.homeJurisdictionId;
  const start = home
    ? projectMacroConditions(world, home).startingConditions
    : null;
  if (start)
    facts.push(
      { label: "Unemployment", value: percent(start.unemploymentPct) },
      {
        label: "Prices over a year",
        value: `${start.inflation12mPct >= 0 ? "+" : ""}${percent(start.inflation12mPct)}`,
      },
    );
  const publications = [...(world.history.publications ?? [])]
    .filter(
      (publication) =>
        publication.publishedAt <= world.currentDate &&
        publication.correctsPublicationId === null &&
        !isProgramBookkeepingPublication(world, publication) &&
        !isGovernmentRecognition(world, publication),
    )
    .sort(
      (left, right) =>
        right.publishedAt.localeCompare(left.publishedAt) ||
        right.sequence - left.sequence,
    )
    .slice(0, 2)
    .map((publication) => ({
      outletName: publication.outletName,
      headline: publication.headline,
    }));
  return {
    year: world.currentDate.slice(0, 4),
    publications,
    facts: [...facts, ...homeGovernmentFacts(home)],
  };
}

/* -------------------------------------------------------------------------- */
/* Your legislature                                                            */
/* -------------------------------------------------------------------------- */

export interface OpeningLegislatureView {
  /** "Kentucky General Assembly", or null when the state names none. */
  readonly bodyName: string | null;
  /** Each chamber by party, under the chamber's name. */
  readonly chambers: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  /** Your own members, under their office and district. */
  readonly yours: readonly { readonly label: string; readonly value: string }[];
}

export function projectOpeningLegislature(
  world: World,
  personId: EntityId,
): OpeningLegislatureView {
  const view = projectGovernmentBrowser(world, personId, { scope: "state" });
  const legislative = view.branches.find(
    (branch) => branch.branch === "legislative",
  );
  const bodyName = legislative?.entries[0]?.title ?? null;
  // Each chamber by party, counted from the members the opening seated.
  const usps = homeStateUsps(world, personId);
  const candidacy = usps ? stateCandidacyPack(`US-${usps}`) : null;
  const members = candidacy ? stateLegislators(world, candidacy.packId) : [];
  const chambers = candidacy
    ? planStateChambers(candidacy).chambers.flatMap((plan) => {
        const counts = new Map<string, number>();
        for (const member of members)
          if (member.officeKey === plan.officeKey) {
            const party =
              LIVING_WORLD_SCENARIO_PROFILE.majorParties.find(
                (known) => known.key === member.party,
              )?.name ??
              member.party ??
              "";
            counts.set(party, (counts.get(party) ?? 0) + 1);
          }
        if (counts.size === 0) return [];
        const parties = [...counts]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([party, count]) =>
            party === ""
              ? `${count} ${count === 1 ? "independent" : "independents"}`
              : `${count} ${party}`,
          );
        return [{ label: plan.chamberName, value: parties.join(" · ") }];
      })
    : [];
  const yours = (view.representedBy ?? [])
    .filter((row) => row.key !== "us-house" && row.key !== "us-senate")
    .flatMap((row) => {
      const names = row.holders.flatMap((holder) =>
        holder.status === "member" && holder.name ? [holder.name] : [],
      );
      if (names.length === 0) return [];
      return [
        {
          label: [row.office, row.district].filter(Boolean).join(" · "),
          value: names.join(" · "),
        },
      ];
    });
  return { bodyName, chambers, yours };
}

/* -------------------------------------------------------------------------- */
/* Your county and town                                                        */
/* -------------------------------------------------------------------------- */

export interface OpeningTownView {
  /** Who holds local office, as "Name, title" lines. */
  readonly officials: readonly string[];
  /** What people here are weighing now: the posted local proposals. */
  readonly matters: readonly string[];
}

export function projectOpeningTown(
  world: World,
  personId: EntityId,
): OpeningTownView {
  const view = projectGovernmentBrowser(world, personId, { scope: "local" });
  // A town government's entry names its holder, and its detail says in what
  // office ("Mayor. Members of the ... Council."): only that office is used.
  const officials = [
    ...view.branches
      .flatMap((branch) => branch.entries)
      .flatMap((entry) =>
        entry.holderName ? [`${entry.holderName}, ${entry.title}`] : [],
      ),
    ...view.localGovernments.flatMap((entry) => {
      const office = /^([A-Z][a-z]+)\./.exec(entry.detail ?? "")?.[1];
      return entry.holderName && office
        ? [`${entry.holderName}, ${office} of ${entry.title}`]
        : [];
    }),
  ];
  const matters = projectPublicMatters(world)
    .filter((matter) => matter.family === "local-matter" && !matter.concluded)
    .map((matter) => matter.summary);
  return { officials, matters };
}

/**
 * The room the town step stands in (OW-11): the council chamber where the
 * person's place records a town government with a holder, else the county
 * commission room. Read from the place's own government records.
 */
export function openingLocalChamber(
  world: World,
  personId: EntityId,
): "council-chamber" | "county-commission" {
  const view = projectGovernmentBrowser(world, personId, { scope: "local" });
  return view.localGovernments.some((entry) => entry.holderName)
    ? "council-chamber"
    : "county-commission";
}

/* -------------------------------------------------------------------------- */
/* Your family and your household                                              */
/* -------------------------------------------------------------------------- */

export interface OpeningFamilyMember {
  readonly personId: EntityId;
  /** "Philip Cobb, your dad" */
  readonly introduction: string;
  /** "a nurse at Minneapolis Family Clinic", or null when no work is recorded. */
  readonly work: string | null;
  readonly livesWithYou: boolean;
  readonly died: boolean;
}

export interface OpeningFamilyView {
  /** Parents and guardians, from kinship and guardianship records. */
  readonly parents: readonly OpeningFamilyMember[];
  /** Everyone else you live with. */
  readonly household: readonly OpeningFamilyMember[];
  /** True only when the record says you live alone. */
  readonly livesAlone: boolean;
}

const PARENT = /\b(mom|dad|mother|father|parent|guardian|stepmom|stepdad)\b/i;

function workLine(world: World, personId: EntityId): string | null {
  const [work] = activeWorkRelationshipsAt(world, personId);
  if (!work?.role.title) return null;
  const employer = work.relationship.organizationId
    ? organizationProfileAt(world, work.relationship.organizationId)?.name
    : null;
  const title = work.role.title.toLowerCase();
  const article = /^[aeiou]/.test(title) ? "an" : "a";
  return employer
    ? `${article} ${title} at ${employer}`
    : `${article} ${title}`;
}

export function projectOpeningFamily(
  world: World,
  personId: EntityId,
): OpeningFamilyView {
  const introduction = buildLifeIntroduction(world, personId);
  if (!introduction) return { parents: [], household: [], livesAlone: false };
  const living = new Set(
    introduction.household.map((person) => person.personId),
  );
  const member = (
    otherId: EntityId,
    relationship: string | null,
  ): OpeningFamilyMember | null => {
    const person = world.people[otherId];
    if (!person) return null;
    return {
      personId: otherId,
      introduction: relationship
        ? `${personName(person)}, ${relationship}`
        : personName(person),
      work: workLine(world, otherId),
      livesWithYou: living.has(otherId),
      died: world.history.personDeaths.some(
        (death) =>
          death.personId === otherId && death.diedAt <= world.currentDate,
      ),
    };
  };
  const parents: OpeningFamilyMember[] = [];
  const seen = new Set<EntityId>();
  for (const person of introduction.household) {
    if (!person.relationship || !PARENT.test(person.relationship)) continue;
    const entry = member(person.personId, person.relationship);
    if (entry) parents.push(entry);
    seen.add(person.personId);
  }
  for (const kinship of kinshipRelationshipsAt(world, personId)) {
    for (const otherId of kinship.personIds) {
      if (otherId === personId || seen.has(otherId)) continue;
      const relationship =
        describePersonContext(world, personId, otherId)?.relationship ?? null;
      if (!relationship || !PARENT.test(relationship)) continue;
      const entry = member(otherId, relationship);
      if (entry) parents.push(entry);
      seen.add(otherId);
    }
  }
  const household = introduction.household.flatMap((person) =>
    seen.has(person.personId)
      ? []
      : (member(person.personId, person.relationship) ?? []),
  );
  return {
    parents,
    household,
    livesAlone: introduction.sentences.includes("You live alone."),
  };
}
