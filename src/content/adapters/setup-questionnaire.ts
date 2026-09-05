import { SETUP_QUESTIONNAIRE_BANK } from "../../simulation/setup-questionnaire-bank";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentFacet,
  type ContentItem,
  type ContentRequirement,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.setup-questionnaire";
const SOURCE_MODULE = "src/simulation/setup-questionnaire-bank.ts";

type QuestionnaireEntry = (typeof SETUP_QUESTIONNAIRE_BANK)[number];

/**
 * The selectable setup questionnaire, as a bank.
 *
 * Every item is authored copy the calibration can put to a player before any
 * world exists, and it carries its own provenance — which research document it
 * came from, and a transparency verdict a reviewer assigned it. Both are read
 * through to the index rather than re-derived.
 *
 * Its eligibility is declarative on purpose: the calibration runs before a
 * world, so an item names the bands it belongs to, the agency it assumes and
 * the relationships and settings it reads as data that can be checked against
 * the setup answers. Those are declared here because the bank declares them.
 * What is not written down — what an answer does to the adaptive profile, and
 * how it feeds world generation — is left undeclared with the reason, because
 * inventing a follow-up an answer does not name would be worse than admitting
 * the bank does not name one.
 */
export function setupQuestionnaireBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Setup questionnaire",
    description:
      "The authored calibration items the setup can put to a player before a world exists, banded by life stage and carrying their own research provenance.",
    domain: "setup",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: SETUP_QUESTIONNAIRE_BANK.map(toItem),
  };
}

function toItem(item: QuestionnaireEntry): ContentItem {
  const bands = item.eligibility.bands;

  return {
    id: contentItemId(BANK_ID, item.key),
    bankId: BANK_ID,
    itemKey: item.key,
    title: firstSentence(item.prompt),
    summary: item.prompt,
    domain: "setup",
    family: item.register,
    authority: "authored",
    status: "production",
    lifeStages: declareLifeStages(bands),
    roles: undeclared(
      "A questionnaire item is answered by the player alone; it casts no scene role. The people an item assumes are read from its eligibility relationships instead.",
    ),
    prerequisites:
      item.eligibility.agency.length > 0
        ? declared(
            item.eligibility.agency.map((agency) => ({
              key: `agency:${agency}`,
              description: `The item assumes the character can: ${humanize(agency)}. Checked against the setup answers, not a world.`,
            })),
          )
        : undeclared(
            "The item assumes no particular agency; it can be asked of any character in its bands.",
          ),
    requiredFacts: declareAssumptions(item),
    slots: undeclared(
      "Prompts and option copy are authored as fixed sentences for the calibration; the bank declares no substitution slots to read.",
    ),
    options: declared(
      item.options.map((option) => ({
        key: option.key,
        label: firstSentence(option.text),
        description: option.text,
      })),
    ),
    followUps: undeclared(
      "An answer feeds the adaptive profile and, through setup-generation-inputs, world generation; the bank names no next item to follow.",
    ),
    attributes: declared([
      {
        key: `register:${item.register}`,
        label: "Register",
        description: `The item is written in the ${item.register} register.`,
      },
      {
        key: `review:${item.review.verdict}`,
        label: "Transparency review",
        description: item.review.note,
      },
      ...(item.fixedOrdinal !== null
        ? [
            {
              key: `fixed-opener:${item.fixedOrdinal}`,
              label: "Fixed opener",
              description: `The item is pinned to opening position ${item.fixedOrdinal} rather than selected.`,
            },
          ]
        : []),
    ]),
    unresolvedResearch: undeclared(
      "The questionnaire is authored from a research document and carries a transparency verdict, but records no unresolved gap of its own.",
    ),
    tags: [
      `register:${item.register}`,
      `review:${item.review.verdict}`,
      ...bands.map((band) => `band:${band}`),
      ...(item.fixedOrdinal !== null
        ? [`fixed-opener:${item.fixedOrdinal}`]
        : []),
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "SETUP_QUESTIONNAIRE_BANK",
      citation: item.source.reference,
      sourceUrl: null,
      retrievedAt: null,
      verification: item.review.verdict,
      note: `Authored from ${item.source.sourceDocument}. Transparency review: ${item.review.note}`,
      sources: [],
    },
  };
}

/**
 * The bands the item declares itself eligible in.
 *
 * `eligibility.bands` is a set on purpose: an item honest for both adolescence
 * and young adulthood says so. This used to report any item with more than one
 * band as *undeclared*, which inverted the truth — the bank is at its most
 * explicit exactly where the index claimed it was silent, and a two-band item
 * could not be found under either of its bands. A band set is declared as a
 * band set, and an item is discoverable under every band it names.
 */
function declareLifeStages(
  bands: readonly string[],
): ContentFacet<readonly string[]> {
  if (bands.length === 0) {
    return undeclared(
      "The item declares no band; its eligibility names no life stage to read.",
    );
  }
  return declared([...bands].sort());
}

/** What the item assumes about the people and places around the character. */
function declareAssumptions(
  item: QuestionnaireEntry,
): ContentFacet<readonly ContentRequirement[]> {
  const requirements: ContentRequirement[] = [
    ...item.eligibility.relationships.map((relationship) => ({
      key: `relationship:${relationship}`,
      description: `The scene assumes the character can imagine having: a ${humanize(relationship)}.`,
    })),
    ...item.eligibility.settings.map((setting) => ({
      key: `setting:${setting}`,
      description: `The scene is set in: a ${humanize(setting)}.`,
    })),
  ];
  if (requirements.length === 0) {
    return undeclared(
      "The item assumes no particular relationship or setting to be honest to ask.",
    );
  }
  return declared(requirements);
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.search(/(?<=[.!?])\s/);
  return end === -1 ? trimmed : trimmed.slice(0, end);
}

function humanize(key: string): string {
  const words = key.replace(/[._/-]+/g, " ").trim();
  return words.length > 0 ? words : key;
}
