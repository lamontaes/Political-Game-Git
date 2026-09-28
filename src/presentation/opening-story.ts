import {
  activeWorkRelationshipsAt,
  describePersonContext,
  kinshipRelationshipsAt,
  organizationProfileAt,
  personName,
  type EntityId,
  type World,
} from "../simulation";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import { LIVING_WORLD_SCENARIO_PROFILE } from "../simulation/living-world/contract";
import { projectPublicMatters } from "../simulation/living-world/developments";
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
  /** Plain sentences: who leads, how Congress divides, the economy. */
  readonly lines: readonly string[];
  /** Up to two of the newest real headlines in this world. */
  readonly headlines: readonly string[];
}

function percent(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

export function projectOpeningYear(
  world: World,
  personId: EntityId,
  orientation: OrientationView,
): OpeningYearView {
  const lines: string[] = [];
  const executive = orientation.steps.find((step) => step.key === "executive");
  const president = executive?.people.find((person) =>
    /^President\b/.test(person.title),
  );
  if (president)
    lines.push(
      president.party
        ? `${president.name} of the ${president.party} is President.`
        : `${president.name} is President.`,
    );
  const congress = orientation.steps.find((step) => step.key === "congress");
  for (const chamber of congress?.chambers ?? []) {
    const parties = chamber.parties
      .filter((party) => party.members > 0)
      .map((party) => `${party.members} ${party.label}`);
    if (parties.length > 0)
      lines.push(`In the ${chamber.name}: ${parties.join(", ")}.`);
  }
  const home = world.people[personId]?.homeJurisdictionId;
  const start = home
    ? projectMacroConditions(world, home).startingConditions
    : null;
  if (start)
    lines.push(
      `Across the country, ${percent(start.unemploymentPct)} of people looking for work cannot find it, and prices are ${percent(start.inflation12mPct)} higher than a year ago.`,
    );
  const headlines = [...(world.history.publications ?? [])]
    .filter(
      (publication) =>
        publication.publishedAt <= world.currentDate &&
        publication.correctsPublicationId === null,
    )
    .sort(
      (left, right) =>
        right.publishedAt.localeCompare(left.publishedAt) ||
        right.sequence - left.sequence,
    )
    .slice(0, 2)
    .map((publication) => publication.headline);
  return { year: world.currentDate.slice(0, 4), lines, headlines };
}

/* -------------------------------------------------------------------------- */
/* Your legislature                                                            */
/* -------------------------------------------------------------------------- */

export interface OpeningLegislatureView {
  /** "Kentucky General Assembly", or null when the state names none. */
  readonly bodyName: string | null;
  /** One line per chamber: "Senate: 31 Republican Party, 7 Democratic Party." */
  readonly chambers: readonly string[];
  /** Your own members: "Dana Reyes represents you in the Senate, State Senate District 12." */
  readonly yours: readonly string[];
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
              "No party";
            counts.set(party, (counts.get(party) ?? 0) + 1);
          }
        if (counts.size === 0) return [];
        const parties = [...counts]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([party, count]) => `${count} ${party}`);
        return [`${plan.chamberName}: ${parties.join(", ")}.`];
      })
    : [];
  const yours = (view.representedBy ?? [])
    .filter((row) => row.key !== "us-house" && row.key !== "us-senate")
    .flatMap((row) => {
      const names = row.holders.flatMap((holder) =>
        holder.status === "member" && holder.name ? [holder.name] : [],
      );
      if (names.length === 0) return [];
      const where = row.district ? `, ${row.district}` : "";
      const verb = names.length > 1 ? "represent" : "represents";
      return [
        `${names.join(" and ")} ${verb} you in the ${row.office}${where}.`,
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
