import { lifeSituationCatalog } from "../../simulation/character-history";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentFacet,
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
 * says, read from `lifeSituationCatalog` alone. The band is the situation's own
 * `band`. The options are its own options. Whether a companion is needed is its
 * own `needsCompanion`.
 *
 * What the source does NOT say is which part that companion plays. The specific
 * role — peer, teacher, household-adult — lives in `formative-context.ts`'s
 * `companionRoleFor`, a presentation-layer runtime mapping the scene consults;
 * `AvailableLifeSituation` declares only the boolean. Reading the specific role
 * back here would attribute to `lifeSituationCatalog`, which the item names as
 * its source, a claim that source never makes — so this bank reports only the
 * generic requirement the source does declare, and leaves the specific casting
 * to the runtime that owns it.
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
    roles: declareRoles(situation),
    prerequisites: undeclared(
      "The situation's own declared eligibility is its band — reported under life stages — and its companion requirement, reported under roles when a companion is needed. The bank declares no further offering gate, and formative eligibility against a world is evaluated by formativeEligibilityProvider (see required facts).",
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

/**
 * The one part `AvailableLifeSituation` actually declares: whether a companion
 * is needed at all.
 *
 * `needsCompanion` is the whole of what the source says about casting. Where it
 * is true, the source is explicit that the scene "is not offered alone", so a
 * single required `companion` role is a faithful reading of a named part that
 * has to be playing for the item to make sense. It stays GENERIC on purpose:
 * peer, teacher and household-adult are supplied by `companionRoleFor` in the
 * presentation layer, not by this bank, and specialising the role here would
 * put a claim into `lifeSituationCatalog`'s provenance that it never made.
 *
 * Where `needsCompanion` is false the source says only that no companion is
 * required — reported under the needs-companion attribute — not that the scene
 * declares a complete empty cast, so the role facet is undeclared rather than
 * an empty list that would overstate the source.
 */
function declareRoles(
  situation: LifeSituationEntry,
): ContentFacet<readonly ContentRole[]> {
  if (!situation.needsCompanion) {
    return undeclared(
      "The situation declares no companion is required (see the needs-companion attribute) and names no other part; `AvailableLifeSituation` declares no role list, so there is nothing to report here.",
    );
  }
  return declared([
    {
      key: "companion",
      description:
        "Somebody else has to be in the scene; the situation declares it is not offered alone. The source names that a companion is needed, not which part they play — the specific role (peer, teacher, household-adult) is supplied by companionRoleFor in the presentation layer.",
      required: true,
    },
  ]);
}
