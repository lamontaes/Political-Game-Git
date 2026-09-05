import {
  AUTHORED_MEASURE_NOTICE,
  legislativeBlueprint,
  legislativeScenarioKeys,
} from "../../simulation/legislation-scenarios";
import type { LegislativeBlueprint } from "../../simulation/legislation-scenarios";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentAttribute,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.legislative-measures";
const SOURCE_MODULE = "src/simulation/legislation-scenarios.ts";

/**
 * The bills.
 *
 * The blueprint is already the declarative half of a legislative scenario:
 * `createLegislativeScenario` builds a whole developer world around one, and
 * production reads the same blueprint against the world the player is living
 * in. Indexing the blueprint rather than the built scenario is what keeps this
 * a read — no world is constructed to look at the bank.
 *
 * These measures carry the notice the game shows on screen: the procedure is
 * sourced, the bill is not a real one. That distinction is the whole reason
 * this bank's authority is `authored` while the rule-pack bank beside it is
 * `sourced`, and it survives into both exports rather than being flattened.
 */
export function legislativeMeasureBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Legislative measures",
    description:
      "Measures written so the institutions have something to act on. The procedure they run through is sourced; the bills are not real ones.",
    domain: "legislation",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: legislativeScenarioKeys().map((key) =>
      toItem(legislativeBlueprint(key)),
    ),
  };
}

function toItem(blueprint: LegislativeBlueprint): ContentItem {
  return {
    id: contentItemId(BANK_ID, blueprint.scenarioKey),
    bankId: BANK_ID,
    itemKey: blueprint.scenarioKey,
    title: `${blueprint.designation} — ${blueprint.shortTitle}`,
    summary: blueprint.summary,
    domain: "legislation",
    family: blueprint.pack.packId,
    authority: "authored",
    status: "production",
    lifeStages: undeclared(
      "A measure belongs to a legislature, not to a stage of anybody's life.",
    ),
    roles: declared([
      {
        key: "sponsor",
        description:
          "A member who introduces the measure. The scenario builder uses the player; production uses whoever files it.",
        required: true,
      },
      {
        key: blueprint.pack.executive.titleLabel.toLowerCase(),
        description: `The executive who acts on the measure at presentment; this measure is authored to be ${blueprint.governorAction}.`,
        required: true,
      },
    ]),
    prerequisites: declared([
      {
        key: `rule-pack:${blueprint.pack.packId}`,
        description: `The measure runs through the ${blueprint.pack.displayName} rule pack.`,
      },
      {
        key: `jurisdiction:${blueprint.context.jurisdiction.slug}`,
        description: `The measure is filed in ${blueprint.context.jurisdiction.name}.`,
      },
    ]),
    requiredFacts: undeclared(
      "The blueprint names no canonical fact a world must already show. What it does declare about itself — its subject class, whether the seated chamber carries caucus labels, and the notice that the bill is not a real one — describes the measure rather than gating it, and is reported as declared structure.",
    ),
    slots: undeclared(
      "Designation, short title and summary are authored strings; the blueprint declares no substitution slots.",
    ),
    options: undeclared(
      "The measure offers nobody a bounded choice. Its votePlan is authored member decisions — how the seated chamber is written to vote — which is data about what the NPCs do, not a menu the player picks from, and it is reported as declared structure.",
    ),
    followUps: undeclared(
      "The blueprint names no content this measure leads to. The disposition its executive is authored to take is an outcome the measure is written to reach, not somewhere a reader can go next, and it is reported as declared structure.",
    ),
    attributes: declared(describeAttributes(blueprint)),
    unresolvedResearch: undeclared(
      "A measure is authored for the game rather than compiled from an instrument. The procedure it runs through is sourced and records its own gaps; the bill does not.",
    ),
    tags: [
      `pack:${blueprint.pack.packId}`,
      `subject-class:${blueprint.subjectClass}`,
      `executive:${blueprint.governorAction}`,
      "measure:authored-for-development",
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "legislativeBlueprint",
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: AUTHORED_MEASURE_NOTICE,
      sources: [],
    },
  };
}

/**
 * What the blueprint says about the measure itself.
 *
 * The vote plan is here rather than in `options` because it is not a choice
 * anybody is offered: it is how many seated members are authored to vote each
 * way on each question, which is the chamber's behaviour written down. The
 * executive disposition is here rather than in `followUps` for the same kind of
 * reason — it is the outcome this measure is written to reach, not a link to
 * further content — and it keeps the authored rationale beside it.
 */
function describeAttributes(
  blueprint: LegislativeBlueprint,
): readonly ContentAttribute[] {
  return [
    {
      key: `subject-class:${blueprint.subjectClass}`,
      label: "Subject class",
      description: `The measure is classified as ${blueprint.subjectClass}, which is what a money-bill threshold reads.`,
    },
    {
      key: `nonpartisan:${blueprint.nonpartisan}`,
      label: "Caucus labels",
      description: blueprint.nonpartisan
        ? "The seated chamber carries no caucus labels."
        : "The seated chamber carries descriptive caucus labels that hold no mechanical weight.",
    },
    {
      key: "measure-notice",
      label: "Authored-measure notice",
      description: AUTHORED_MEASURE_NOTICE,
    },
    {
      key: `executive-disposition:${blueprint.governorAction}`,
      label: "Authored executive disposition",
      description: `The measure is authored to be ${blueprint.governorAction} at presentment. ${blueprint.governorRationale}`,
    },
    ...Object.keys(blueprint.votePlan)
      .sort()
      .map((key) => ({
        key: `vote-plan:${key}`,
        label: `Authored member decisions — ${key}`,
        description: describeVoteCounts(blueprint, key),
      })),
  ];
}

function describeVoteCounts(
  blueprint: LegislativeBlueprint,
  key: string,
): string {
  const counts = blueprint.votePlan[key];
  if (!counts) return "No authored decision for this question.";
  const parts = [
    `yea ${counts.yea}`,
    counts.nay === undefined ? null : `nay ${counts.nay}`,
    counts.presentNotVoting === undefined
      ? null
      : `present not voting ${counts.presentNotVoting}`,
    counts.absent === undefined ? null : `absent ${counts.absent}`,
    counts.excused === undefined ? null : `excused ${counts.excused}`,
  ].filter((part): part is string => part !== null);
  return `Authored member decisions: ${parts.join(", ")}.`;
}
