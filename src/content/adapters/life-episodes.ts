import { EPISODE_FAMILIES } from "../../simulation/episode-bank";
import type { EpisodeRequirement } from "../../simulation/life-episodes";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentFacet,
  type ContentFollowUp,
  type ContentItem,
  type ContentOption,
  type ContentRequirement,
  type ContentRole,
  type ContentSlot,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.episodes";
const SOURCE_MODULE = "src/simulation/episode-bank.ts";

type EpisodeFamilyEntry = (typeof EPISODE_FAMILIES)[number];
type EpisodeStageEntry = EpisodeFamilyEntry["stages"][number];

/**
 * The authored episode families, one stage at a time.
 *
 * An episode family is a small tree: a narrative family, the roles it may bind,
 * and a set of stages, each of which is a single authored moment with its own
 * lines and its own options. The unit a reviewer actually reads is the stage,
 * so that is the item here — `family-key/stage-key` — and the family is carried
 * in the `family` field and a tag rather than collapsed away. Nothing across
 * stages is merged, so the staged shape the bank authored is not flattened into
 * one fake choice set.
 *
 * `stage.requires` is read and reported, because it is data. The bank's own
 * header says so — "every family here is data — stages, requirements, roles,
 * copy, options" — and an `EpisodeRequirement` is a plain discriminated union
 * naming a role, an age, a capability, a fact key or an earlier stage. Calling
 * it undeclared said the bank was silent about the one thing it is most
 * explicit about.
 *
 * What is *not* claimed is that this index can decide eligibility. Reading a
 * requirement is not evaluating one: `eligibleEpisodeBeats` does that against a
 * world, and nothing here builds a world, resolves a role binding, or asks
 * whether a fact holds. The projection below is a transcription of the union's
 * own fields under the union's own vocabulary, which is why it cannot drift
 * from the rule that runs — there is no second rule here to drift.
 */
export function lifeEpisodeBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Life episodes",
    description:
      "The authored adult narrative episodes, taken one stage at a time: each stage's lines, the choices it offers, the roles it requires and the requirements it declares.",
    domain: "narrative",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: EPISODE_FAMILIES.flatMap((family) =>
      family.stages.map((stage) => toItem(family, stage)),
    ),
  };
}

function toItem(
  family: EpisodeFamilyEntry,
  stage: EpisodeStageEntry,
): ContentItem {
  const itemKey = `${family.key}/${stage.key}`;
  const summary = stage.lines.join(" ").trim() || humanize(stage.key);

  const options: readonly ContentOption[] = stage.options.map((option) => ({
    key: option.key,
    label: option.label,
    description: option.description,
  }));

  return {
    id: contentItemId(BANK_ID, itemKey),
    bankId: BANK_ID,
    itemKey,
    title: `${humanize(family.key)} — ${humanize(stage.key)}`,
    summary,
    domain: "narrative",
    family: family.family,
    authority: "authored",
    status: "production",
    lifeStages: undeclared(
      "The episode bank declares no named life-stage or band classification. A stage may bound age through an `age-at-least`/`age-below` requirement, which is a declarative prerequisite reported under prerequisites — an arbitrary numeric age bound is not a life-stage classification, and reporting it here as well would state one source requirement twice under two meanings.",
    ),
    roles: declareRoles(family, stage),
    prerequisites: declarePrerequisites(stage),
    requiredFacts: declareRequiredFacts(stage),
    slots: declareSlots(stage),
    options:
      options.length > 0
        ? declared(options)
        : undeclared(
            "This stage offers no options of its own; it is a line the instance passes through.",
          ),
    followUps: declareFollowUps(stage),
    attributes: declared([
      {
        key: `stakes:${stage.stakes}`,
        label: "Stakes",
        description: `The stage declares its stakes tier as ${stage.stakes}.`,
      },
      ...stage.tensions.map((tension, index) => ({
        key: `tension:${tension.between.join("-vs-")}:${index + 1}`,
        label: `Tension between ${tension.between.join(" and ")}`,
        description: tension.note,
      })),
    ]),
    unresolvedResearch: undeclared(
      "The episode bank is authored for the game rather than compiled from an instrument, so it records no unresolved research.",
    ),
    tags: [
      `episode-family:${family.key}`,
      `narrative-family:${family.family}`,
      `stakes:${stage.stakes}`,
      ...stageRoleKeys(family, stage).map((role) => `role:${role}`),
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "EPISODE_FAMILIES",
      citation: family.authority.reference,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: `Authored for the game. Copy authority: ${family.authority.sourceDocument} — ${family.authority.reference}.`,
      sources: [],
    },
  };
}

/**
 * The roles THIS stage cannot do without, and the ones it never mentions.
 *
 * Two things make a role required, and both are read off the stage. It may
 * declare a `role` or `role-age-at-least` requirement, in which case the stage
 * is not eligible without a binding. Or its copy may name the role in a
 * `{role:…}`, `{who:…}` or pronoun slot, in which case it cannot be rendered
 * without one — `substituteSlots` throws on a role the beat did not bind, so
 * this is a fact about the authored text rather than a guess about it.
 *
 * A family role the stage neither requires nor names is reported, because the
 * family may still bind it, and reported as not required, which is the truth
 * for this stage. What is no longer said is that every role is optional
 * everywhere, which was false in both directions: it made a stage that cannot
 * open without a household peer look as though it could.
 */
function declareRoles(
  family: EpisodeFamilyEntry,
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentRole[]> {
  const required = new Set(stageRoleKeys(family, stage));
  const known = [...new Set<string>([...family.roles, ...required])].sort();
  if (known.length === 0) {
    return undeclared(
      "This family binds no roles and this stage names none; the beat is written for the character alone.",
    );
  }
  const roles: readonly ContentRole[] = known.map((role) => ({
    key: role,
    description: required.has(role)
      ? `This stage requires ${role}: it is named by the stage's own requirements or by a slot in its authored copy, and the beat is neither offered nor rendered without a binding.`
      : `A role the ${humanize(family.key)} family may bind. This stage neither requires it nor names it in its copy.`,
    required: required.has(role),
  }));
  return declared(roles);
}

/** The role keys this stage requires or names, read off its own data. */
function stageRoleKeys(
  family: EpisodeFamilyEntry,
  stage: EpisodeStageEntry,
): readonly string[] {
  const keys = new Set<string>();
  for (const requirement of stage.requires) {
    if (
      requirement.kind === "role" ||
      requirement.kind === "role-age-at-least" ||
      requirement.kind === "role-age-below"
    ) {
      keys.add(requirement.role);
    }
  }
  for (const slot of slotTokens(stage)) {
    const [form, detail] = slot.split(":");
    if (detail && form !== "self" && form !== "place" && form !== "age") {
      if (
        family.roles.includes(detail as EpisodeFamilyEntry["roles"][number])
      ) {
        keys.add(detail);
      }
    }
  }
  return [...keys].sort();
}

/**
 * The stage's own `requires`, transcribed under each kind's own vocabulary.
 *
 * Fact requirements are not here: a `fact`/`absent` requirement names a
 * canonical record the world has to show, which is what `requiredFacts` means,
 * so it is reported there instead of twice.
 */
function declarePrerequisites(
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentRequirement[]> {
  const requirements = stage.requires
    .filter(
      (requirement) =>
        requirement.kind !== "fact" && requirement.kind !== "absent",
    )
    .map(describeRequirement);
  if (requirements.length === 0) {
    return undeclared(
      "This stage declares no requirement beyond the canonical facts it reads; an empty `requires` means the stage may open.",
    );
  }
  return declared(requirements);
}

/** The canonical record keys the stage's own `requires` names. */
function declareRequiredFacts(
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentRequirement[]> {
  const facts = stage.requires
    .filter(
      (requirement) =>
        requirement.kind === "fact" || requirement.kind === "absent",
    )
    .map(describeRequirement);
  if (facts.length === 0) {
    return undeclared(
      "This stage names no canonical fact key in its requirements. Whether the facts it does read hold is computed from world records by episodeFacts in src/simulation/life-episodes.ts.",
    );
  }
  return declared(facts);
}

/**
 * One requirement, said in the requirement's own terms.
 *
 * Every branch names the union member it came from, so a reader can go back to
 * `EpisodeRequirement` and check it. Nothing is collapsed into a generic
 * sentence: `without-capability` is not reported as `capability`, and
 * `role-age-at-least` and `role-age-below` each keep their own age and their
 * own direction, because the whole reason those kinds exist is that the plain
 * `role` requirement was not enough — and reporting one as the other would
 * describe a scene written for a small child as one written for an adult.
 */
function describeRequirement(
  requirement: EpisodeRequirement,
): ContentRequirement {
  switch (requirement.kind) {
    case "fact":
      return {
        key: `fact:${requirement.fact}`,
        description: `The record has to show the fact ${requirement.fact}.`,
      };
    case "absent":
      return {
        key: `absent:${requirement.fact}`,
        description: `The record must NOT show the fact ${requirement.fact}.`,
      };
    case "age-at-least":
      return {
        key: `age-at-least:${requirement.age}`,
        description: `The character is at least ${requirement.age}.`,
      };
    case "age-below":
      return {
        key: `age-below:${requirement.age}`,
        description: `The character is under ${requirement.age}.`,
      };
    case "role":
      return {
        key: `role:${requirement.role}`,
        description: `Somebody can be bound as ${requirement.role}.`,
      };
    case "role-age-at-least":
      return {
        key: `role-age-at-least:${requirement.role}:${requirement.age}`,
        description: `The binding for ${requirement.role} is at least ${requirement.age}; a younger person does not satisfy this and the stage is not offered.`,
      };
    case "role-age-below":
      return {
        key: `role-age-below:${requirement.role}:${requirement.age}`,
        description: `The binding for ${requirement.role} is under ${requirement.age}; an older person does not satisfy this and the stage is not offered.`,
      };
    case "capability":
      return {
        key: `capability:${requirement.capability}`,
        description: `The character is in a position to: ${requirement.capability}.`,
      };
    case "without-capability":
      return {
        key: `without-capability:${requirement.capability}`,
        description: `The character is deliberately NOT in a position to: ${requirement.capability}.`,
      };
    case "after-stage":
      return {
        key: `after-stage:${requirement.stage}`,
        description: `The stage ${requirement.stage} of this instance is already on the record.`,
      };
    case "without-stage":
      return {
        key: `without-stage:${requirement.stage}`,
        description: `The stage ${requirement.stage} of this instance is NOT on the record.`,
      };
    case "after-choice":
      return {
        key: `after-choice:${requirement.stage}:${requirement.option}`,
        description: `The stage ${requirement.stage} was answered ${requirement.option}.`,
      };
    case "without-choice":
      return {
        key: `without-choice:${requirement.stage}:${requirement.option}`,
        description: `The stage ${requirement.stage} was NOT answered ${requirement.option}.`,
      };
    case "days-since-stage":
      return {
        key: `days-since-stage:${requirement.stage}:${requirement.days}`,
        description: `At least ${requirement.days} day(s) have passed since the stage ${requirement.stage}.`,
      };
  }
}

/**
 * The substitution slots a stage's authored text expects.
 *
 * Read straight off the lines, the option memory and the option copy — the slot
 * forms the bank documents (`{self}`, `{place}`, `{age}`, `{role:<key>}` and
 * the `{who:…}`/pronoun forms) are literal tokens, so what the text asks to be
 * filled in is knowable without a world even though filling it in needs one.
 */
function declareSlots(
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentSlot[]> {
  const keys = slotTokens(stage);
  if (keys.length === 0) {
    return undeclared(
      "This stage's lines and options carry no substitution slots.",
    );
  }
  return declared(
    keys.map((key) => ({
      key,
      description: `A slot the authored copy fills from the bound scene; substituted against a world by substituteSlots.`,
    })),
  );
}

function slotTokens(stage: EpisodeStageEntry): readonly string[] {
  const texts = [
    ...stage.lines,
    ...stage.options.flatMap((option) => [
      option.label,
      option.description,
      option.memory,
    ]),
  ];
  const keys = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(/\{([^}]+)\}/g)) {
      const token = match[1];
      if (token) keys.add(token);
    }
  }
  return [...keys].sort();
}

/** The stages this one advises may follow. Advisory and authored, so declared. */
function declareFollowUps(
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentFollowUp[]> {
  if (stage.mayLeadTo.length === 0) {
    return undeclared(
      "This stage advises no next stage; where an instance ends is decided by the family's exits and the world, not a named follow-up.",
    );
  }
  return declared(
    stage.mayLeadTo.map((next) => ({
      key: next,
      description: `The stage advises that ${humanize(next)} may follow. Advisory only: eligibility is computed from requirements, not from this list.`,
    })),
  );
}

function humanize(key: string): string {
  const words = key.replace(/[._/-]+/g, " ").trim();
  return words.length > 0
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : key;
}
