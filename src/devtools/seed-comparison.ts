import {
  activeCareResponsibilitiesAt,
  activeEducationEnrollmentsAt,
  activeOrganizationParticipationsAt,
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  ageOnDate,
  canonicalJson,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
  worldContentId,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "../presentation/new-game";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";

/**
 * Do different seeds actually produce different lives?
 *
 * The question sounds rhetorical and is not. A generator can vary names,
 * birthdays and street addresses convincingly while every life it produces has
 * the same household shape, the same job, and the same set of things the
 * player can do — and that world is not varied, it is one world wearing
 * different name tags. This harness answers the question with the simulation's
 * own output rather than with a screenshot.
 *
 * Two rules keep the answer honest. Every dimension below is read from
 * canonical records through accepted queries, never from presentation. And
 * dimensions that are *only* a name are marked as such, so "two seeds differ"
 * can never be satisfied by two different surnames.
 *
 * Where accepted main has no variation in a category, this reports no
 * difference for that category. It does not invent one, and it does not
 * describe a system that does not exist yet.
 */

export const SEED_COMPARISON_VERSION = "seed-comparison-v1";

/** One comparable fact about a generated life. */
export interface SeedDimension {
  readonly key: string;
  readonly label: string;
  /**
   * True when the dimension carries no structural information — a given name,
   * a family name, an opaque identity hash. Kept in the report because it is
   * useful context, excluded from the "meaningful difference" count.
   */
  readonly nameOnly: boolean;
  readonly value: string;
}

export interface SeedSummary {
  readonly seed: string;
  readonly setup: NewGameSetup;
  readonly worldId: EntityId;
  readonly worldContentId: EntityId;
  readonly playerPersonId: EntityId;
  readonly currentDate: string;
  readonly historyFrontier: number;
  readonly dimensions: readonly SeedDimension[];
}

export interface SeedDifference {
  readonly key: string;
  readonly label: string;
  readonly nameOnly: boolean;
  readonly valuesBySeed: readonly {
    readonly seed: string;
    readonly value: string;
  }[];
  readonly distinctValueCount: number;
}

export interface SeedComparison {
  readonly version: typeof SEED_COMPARISON_VERSION;
  readonly baseSetup: Omit<NewGameSetup, "seed">;
  readonly summaries: readonly SeedSummary[];
  readonly differences: readonly SeedDifference[];
  readonly meaningfulDifferences: readonly SeedDifference[];
  readonly identicalDimensionKeys: readonly string[];
}

function dimension(
  key: string,
  label: string,
  value: string | number | boolean | null,
  nameOnly = false,
): SeedDimension {
  return {
    key,
    label,
    nameOnly,
    value:
      value === null
        ? "UNKNOWN"
        : typeof value === "boolean"
          ? value
            ? "yes"
            : "no"
          : String(value),
  };
}

/**
 * Counts by kind rather than by total.
 *
 * "Three relationships" and "three relationships, all of them siblings" are
 * different worlds, and a bare count hides the difference that matters.
 */
function tally(values: readonly string[]): string {
  if (values.length === 0) return "none";
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([value, count]) => `${value}×${count}`)
    .join(", ");
}

function summarizeWorld(
  world: World,
  playerPersonId: EntityId,
  setup: NewGameSetup,
): SeedSummary {
  const player = world.people[playerPersonId];
  if (!player) {
    throw new Error("The generated world has no player character.");
  }
  const memberships = householdMembershipsAt(world, playerPersonId);
  const coResidents = memberships.flatMap((membership) =>
    peopleInHouseholdAt(world, membership.membership.householdId).filter(
      (personId) => personId !== playerPersonId,
    ),
  );
  const kinship = kinshipRelationshipsAt(world, playerPersonId);
  const partnerships = activePartnershipsAt(world, playerPersonId);
  const care = activeCareResponsibilitiesAt(world, playerPersonId);
  const work = activeWorkRelationshipsAt(world, playerPersonId);
  const education = activeEducationEnrollmentsAt(world, playerPersonId);
  const participation = activeOrganizationParticipationsAt(
    world,
    playerPersonId,
  );
  const capabilities = resolvePlayerCapabilities(world);

  return {
    seed: setup.seed,
    setup,
    worldId: world.id,
    worldContentId: worldContentId(world),
    playerPersonId,
    currentDate: world.currentDate,
    historyFrontier: world.history.nextSequence,
    dimensions: [
      dimension("player.givenName", "Given name", player.givenName, true),
      dimension("player.familyName", "Family name", player.familyName, true),
      dimension("player.birthDate", "Birth date", player.birthDate),
      dimension(
        "player.age",
        "Age at start",
        ageOnDate(player.birthDate, world.currentDate),
      ),
      dimension(
        "player.homeJurisdictionId",
        "Home jurisdiction",
        player.homeJurisdictionId,
      ),
      dimension("player.detailLevel", "Detail level", player.detailLevel),
      dimension(
        "player.establishedFactKinds",
        "Established fact kinds",
        tally(player.establishedFacts.map((fact) => fact.kind)),
      ),
      dimension(
        "household.count",
        "Households the character belongs to",
        memberships.length,
      ),
      dimension(
        "household.coResidentCount",
        "People sharing the home",
        coResidents.length,
      ),
      // The age of the adult raising a child, or of the person they share a
      // home with, is a structural fact about the life rather than a label on
      // it — which is exactly why it belongs above the name-only line.
      dimension(
        "household.coResidentAges",
        "Ages of the people sharing the home",
        tally(
          coResidents.map((personId) => {
            const resident = world.people[personId];
            return resident
              ? String(ageOnDate(resident.birthDate, world.currentDate))
              : "UNKNOWN";
          }),
        ),
      ),
      dimension(
        "relationships.kinshipKinds",
        "Kinship relationships by kind",
        tally(kinship.map((record) => record.kind)),
      ),
      dimension(
        "relationships.partnershipCount",
        "Active partnerships",
        partnerships.length,
      ),
      dimension(
        "relationships.careResponsibilityCount",
        "Active care responsibilities",
        care.length,
      ),
      dimension(
        "work.roleKinds",
        "Active work relationships by kind",
        tally(work.map((entry) => entry.relationship.kind)),
      ),
      dimension(
        "education.activeEnrollmentCount",
        "Active education enrollments",
        education.length,
      ),
      dimension(
        "education.enrollmentStartDates",
        "Education enrollment start dates",
        tally(education.map((entry) => entry.enrollment.startedAt)),
      ),
      dimension(
        "work.roleStartDates",
        "Work relationship start dates",
        tally(work.map((entry) => entry.relationship.startedAt)),
      ),
      dimension(
        "participation.activeCount",
        "Active organization participations",
        participation.length,
      ),
      dimension(
        "opportunities.office",
        "Workplace surface available",
        capabilities.office,
      ),
      dimension(
        "opportunities.legislation",
        "Legislative surface available",
        capabilities.legislation,
      ),
      dimension(
        "opportunities.legislativeScenarioKey",
        "Legislative scenario",
        capabilities.legislativeScenarioKey,
      ),
      dimension(
        "opportunities.formativeYears",
        "Formative years still running",
        capabilities.formativeYears,
      ),
      dimension(
        "opportunities.withheld",
        "Surfaces withheld and why",
        tally(
          capabilities.withheld.map(
            (entry) => `${entry.surface}:${entry.reason}`,
          ),
        ),
      ),
      dimension(
        "world.personCount",
        "People generated",
        world.personOrder.length,
      ),
      dimension(
        "world.jurisdictionCount",
        "Jurisdictions generated",
        world.jurisdictionOrder.length,
      ),
      dimension(
        "world.householdCount",
        "Households generated",
        world.history.households.length,
      ),
      dimension(
        "world.dwellingCount",
        "Dwellings generated",
        world.history.dwellings.length,
      ),
      dimension(
        "world.organizationCount",
        "Organizations generated",
        world.history.organizations.length,
      ),
      dimension(
        "world.eventCount",
        "Historical events recorded",
        world.history.events.length,
      ),
      dimension(
        "world.historyFrontier",
        "History frontier",
        world.history.nextSequence,
      ),
      dimension(
        "world.contentId",
        "World content id",
        worldContentId(world),
        true,
      ),
    ],
  };
}

export interface SeedComparisonRequest {
  readonly seeds: readonly string[];
  /** Everything except the seed. Defaults to the shipped new-game defaults. */
  readonly setup?: Omit<NewGameSetup, "seed">;
}

/**
 * Generates one world per seed through the ordinary new-game path and reports
 * where they actually differ.
 *
 * Nothing here touches the player UI: `createNewGameWorld` is the same call the
 * title screen makes, and the comparison reads the world it returns.
 */
export function compareSeeds(request: SeedComparisonRequest): SeedComparison {
  if (request.seeds.length < 2) {
    throw new Error("Comparing seeds needs at least two seeds.");
  }
  const seen = new Set<string>();
  for (const seed of request.seeds) {
    if (seed.trim().length === 0) {
      throw new Error("A seed cannot be blank.");
    }
    if (seen.has(seed)) {
      throw new Error(`Duplicate seed in the comparison: ${seed}`);
    }
    seen.add(seed);
  }

  const baseSetup = request.setup ?? DEFAULT_NEW_GAME_SETUP;
  const summaries = request.seeds.map((seed) => {
    const setup: NewGameSetup = { ...baseSetup, seed };
    const game = createNewGameWorld(setup);
    return summarizeWorld(game.world, game.playerPersonId, setup);
  });

  const first = summaries[0];
  if (!first) throw new Error("No seed produced a summary.");

  const differences: SeedDifference[] = [];
  const identicalDimensionKeys: string[] = [];
  for (const template of first.dimensions) {
    const valuesBySeed = summaries.map((summary) => ({
      seed: summary.seed,
      value:
        summary.dimensions.find((candidate) => candidate.key === template.key)
          ?.value ?? "UNKNOWN",
    }));
    const distinct = new Set(valuesBySeed.map((entry) => entry.value));
    if (distinct.size === 1) {
      identicalDimensionKeys.push(template.key);
      continue;
    }
    differences.push({
      key: template.key,
      label: template.label,
      nameOnly: template.nameOnly,
      valuesBySeed,
      distinctValueCount: distinct.size,
    });
  }

  return {
    version: SEED_COMPARISON_VERSION,
    baseSetup,
    summaries,
    differences,
    meaningfulDifferences: differences.filter(
      (difference) => !difference.nameOnly,
    ),
    identicalDimensionKeys,
  };
}

export function seedComparisonJson(comparison: SeedComparison): string {
  return `${canonicalJson(comparison)}\n`;
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function seedComparisonMarkdown(comparison: SeedComparison): string {
  const lines: string[] = [];
  lines.push("# Multi-seed comparison");
  lines.push("");
  lines.push(
    "Development diagnostic. Every row is read from canonical records through accepted queries; nothing here samples presentation.",
  );
  lines.push("");
  lines.push("## Setup held constant");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(comparison.baseSetup).sort(
    ([left], [right]) => (left < right ? -1 : 1),
  )) {
    lines.push(`| ${cell(key)} | ${cell(String(value ?? "UNKNOWN"))} |`);
  }
  lines.push("");

  lines.push("## Worlds");
  lines.push("");
  lines.push("| Seed | World | Player | Current date | History frontier |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const summary of comparison.summaries) {
    lines.push(
      `| \`${cell(summary.seed)}\` | \`${cell(summary.worldId)}\` | \`${cell(summary.playerPersonId)}\` | ${cell(summary.currentDate)} | ${summary.historyFrontier} |`,
    );
  }
  lines.push("");

  lines.push(
    `## Differences beyond names (${comparison.meaningfulDifferences.length})`,
  );
  lines.push("");
  if (comparison.meaningfulDifferences.length === 0) {
    lines.push(
      "These seeds produced no structural difference. That is a finding about the generator, not a gap in this report.",
    );
    lines.push("");
  } else {
    lines.push(
      `| Dimension | ${comparison.summaries.map((summary) => `\`${cell(summary.seed)}\``).join(" | ")} |`,
    );
    lines.push(
      `| --- | ${comparison.summaries.map(() => "---").join(" | ")} |`,
    );
    for (const difference of comparison.meaningfulDifferences) {
      lines.push(
        `| ${cell(difference.label)} | ${difference.valuesBySeed.map((entry) => cell(entry.value)).join(" | ")} |`,
      );
    }
    lines.push("");
  }

  const nameOnly = comparison.differences.filter(
    (difference) => difference.nameOnly,
  );
  lines.push(`## Name-only differences (${nameOnly.length})`);
  lines.push("");
  lines.push(
    "Listed separately because a different name is not a different life.",
  );
  lines.push("");
  for (const difference of nameOnly) {
    lines.push(
      `- ${cell(difference.label)}: ${difference.valuesBySeed
        .map((entry) => `${entry.seed}=${cell(entry.value)}`)
        .join("; ")}`,
    );
  }
  lines.push("");

  lines.push(
    `## Identical across every seed (${comparison.identicalDimensionKeys.length})`,
  );
  lines.push("");
  lines.push(
    "Dimensions the generator did not vary at this setup. Reported plainly rather than omitted.",
  );
  lines.push("");
  for (const key of comparison.identicalDimensionKeys) {
    lines.push(`- \`${cell(key)}\``);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
