import { lifeSituationCatalog } from "../../simulation/character-history";
import { companionRoleFor } from "../../presentation/formative-context";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
  type ContentRole,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.life-situations";
const SOURCE_MODULE = "src/simulation/character-history.ts";

/**
 * One entry as the catalog returns it. Derived from the catalog itself rather
 * than a named import, so the adapter follows wherever the situation type is
 * defined without a second import to keep in step.
 */
type LifeSituationEntry = ReturnType<typeof lifeSituationCatalog>[number];

/**
 * The growing-up years, as a bank.
 *
 * Every dimension below comes from something the situation itself already
 * says. The band is the situation's own `band`. The companion requirement is
 * its own `needsCompanion`, and the part that companion has to be playing is
 * `companionRoleFor`, which is the scene read rather than a person guessed.
 * The options are its own options.
 *
 * Two dimensions are deliberately undeclared. Eligibility for a formative
 * situation is a predicate over a world — `formativeEligibilityProvider` asks
 * whether this character is at a school, has a job, is in a recorded household
 * — and it is not written down anywhere as data. Restating it here as a list
 * of declarative prerequisites would be a second copy of a rule, free to drift
 * from the one that actually runs, so the index says where the rule lives
 * instead of paraphrasing it.
 */
export function lifeSituationBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Formative life situations",
    description:
      "The authored moments a character can play through between birth and eighteen, banded by life stage.",
    domain: "life",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: lifeSituationCatalog().map(toItem),
  };
}

function toItem(situation: LifeSituationEntry): ContentItem {
  const companionRole = companionRoleFor(situation.key);
  const roles: readonly ContentRole[] = companionRole
    ? [
        {
          key: companionRole,
          description: describeRole(companionRole),
          required: situation.needsCompanion,
        },
      ]
    : [];

  return {
    id: contentItemId(BANK_ID, situation.key),
    bankId: BANK_ID,
    itemKey: situation.key,
    title: situation.prose.split(/(?<=[.!?])\s/)[0] ?? situation.prose,
    summary: situation.prose,
    domain: "life",
    family: situation.key.split(".")[0] ?? "formative",
    authority: "authored",
    status: "production",
    lifeStages: declared([situation.band]),
    roles: declared(roles),
    prerequisites: undeclared(
      "The situation's own declared eligibility is its band — reported under life stages — and its companion requirement, reported under roles with the companion role marked required. The bank declares no further offering gate, and formative eligibility against a world is evaluated by formativeEligibilityProvider (see required facts).",
    ),
    requiredFacts: undeclared(
      "Formative eligibility is evaluated against a world by formativeEligibilityProvider in src/presentation/formative-context.ts; the bank stores no declarative fact requirements to read.",
    ),
    slots: undeclared(
      "The bank stores fixed prose and fixed option text; it declares no substitution slots.",
    ),
    options: declared(
      situation.options.map((option) => ({
        key: option.key,
        label: option.label,
        description: option.description,
      })),
    ),
    followUps: undeclared(
      "A resolved situation writes memories and development proposals through ordinary history rather than naming a next item.",
    ),
    attributes: declared([
      {
        key: `needs-companion:${situation.needsCompanion}`,
        label: "Companion",
        description: situation.needsCompanion
          ? "The situation declares that it is not offered alone."
          : "The situation declares that it can be played alone.",
      },
    ]),
    unresolvedResearch: undeclared(
      "Formative situations are authored for the game rather than compiled from an instrument, so they record no unresolved research.",
    ),
    tags: [
      `band:${situation.band}`,
      situation.needsCompanion ? "companion:required" : "companion:not-needed",
      ...(companionRole ? [`role:${companionRole}`] : []),
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "lifeSituationCatalog",
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: "Authored for the game. The research kernels these come from mostly have no defensible arrival rate, so nothing here samples a frequency.",
      sources: [],
    },
  };
}

function describeRole(role: string): string {
  switch (role) {
    case "household-adult":
      return "An adult who actually holds recorded authority over this child.";
    case "peer":
      return "Another child close enough in age to be a peer, at the same school.";
    case "teacher":
      return "An adult employed in a teaching role at the school the child attends.";
    default:
      return role;
  }
}
