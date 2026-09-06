import { LEGISLATIVE_RULE_PACKS } from "../../simulation/legislature-rule-packs";
import type {
  LegislativeRulePack,
  RuleSourceRef,
} from "../../simulation/legislature-rules";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentAttribute,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
  type ContentSourceRef,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.legislative-rule-packs";
const SOURCE_MODULE = "src/simulation/legislature-rule-packs.ts";

/**
 * The one bank in the repository that is genuinely sourced.
 *
 * A rule pack cites the instrument it came from, the date it was read, and how
 * far it was verified — `verified` means the operative text was read at the
 * cited URL, `partial` means only a heading or summary was, and nothing is
 * marked verified by construction. It also carries its own `unresolvedGaps`:
 * the things the research did not settle, kept as gaps rather than filled in.
 *
 * Both come through whole, and both come through under their own names. They
 * did not, before. The citations were reported as the pack's *required facts*,
 * which said a legislature needs its own footnote to be true; the unresolved
 * research was reported as *follow-ups*, which said the game could lead
 * somewhere that is in fact a hole in what anybody knows. A citation is
 * evidence of where a value came from, so it is provenance. An unresolved gap
 * is unresolved research, so it says that.
 *
 * The institution itself — chambers, seats, floor stages, committees — is
 * neither a gate on this item nor a choice it offers anybody, so it is reported
 * as the declared structure it is. A floor stage in particular is procedure the
 * institution runs; a member does not pick one off a list.
 */
export function legislativeRulePackBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Legislative rule packs",
    description:
      "Institutional procedure compiled from cited instruments. Each value carries its citation and how far it was verified; unresolved research stays unresolved.",
    domain: "legislation",
    authority: "sourced",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: LEGISLATIVE_RULE_PACKS.map(toItem),
  };
}

function toItem(pack: LegislativeRulePack): ContentItem {
  const primary = pack.sources[0] ?? null;

  const attributes: readonly ContentAttribute[] = [
    {
      key: `structure:${pack.structure}`,
      label: "Structure",
      description: `The legislature is ${pack.structure}.`,
    },
    {
      key: `session:${pack.session.sessionLabel}`,
      label: "Session",
      description: pack.session.sessionLabel,
    },
    {
      key: `inter-chamber:${pack.interChamber.kind}`,
      label: "Inter-chamber procedure",
      description: `Disagreement between chambers is resolved by: ${pack.interChamber.kind}.`,
    },
    {
      key: `executive:${pack.executive.titleLabel}`,
      label: "Executive at presentment",
      description: `The office that acts when a measure is presented is titled ${pack.executive.titleLabel}.`,
    },
    {
      key: `origination:${pack.origination.generalOrigination.kind}`,
      label: "Where an ordinary measure may start",
      description:
        pack.origination.generalOrigination.kind === "known"
          ? `An ordinary measure may originate in: ${pack.origination.generalOrigination.value.join(", ")}.`
          : `Not resolved: ${pack.origination.generalOrigination.note}`,
    },
    ...pack.origination.subjectRestrictions.map((restriction) => ({
      key: `origination-restriction:${restriction.subjectClass}`,
      label: `Origination of a ${restriction.subjectClass} measure`,
      description: `Confined to ${restriction.chamberKeys.join(", ")} by ${restriction.source.citation}. ${restriction.note}`,
    })),
    ...pack.chambers.map((chamber) => ({
      key: `chamber:${chamber.chamberKey}`,
      label: chamber.name,
      description: `${chamber.seats} seats${
        chamber.seatsSource
          ? ` (${chamber.seatsSource.citation})`
          : " (seat-fixing instrument not established by this pack)"
      }, ${chamber.committees.length} committee rule(s).`,
    })),
    ...pack.chambers.flatMap((chamber) =>
      chamber.floorStages.map((stage) => ({
        key: `floor-stage:${chamber.chamberKey}:${stage.stageKey}`,
        label: stage.label,
        description: `A floor stage the ${chamber.name} runs a measure through. Institutional procedure, not a choice offered to anybody.`,
      })),
    ),
  ];

  return {
    id: contentItemId(BANK_ID, pack.packId),
    bankId: BANK_ID,
    itemKey: pack.packId,
    title: pack.displayName,
    summary: `A ${pack.structure} legislature: ${pack.chambers
      .map((chamber) => `${chamber.name} (${chamber.seats} seats)`)
      .join(", ")}. ${pack.session.sessionLabel}.`,
    domain: "legislation",
    family: pack.structure,
    authority: "sourced",
    status: "production",
    lifeStages: undeclared(
      "An institution's procedure does not belong to a stage of anybody's life.",
    ),
    roles: undeclared(
      "A rule pack declares institutional structure — chambers, their order, an executive rule, a session, an enactment rule — not a ContentRole list. Its members and its executive office are participants the institution defines, and are reported as declared structure; the pack names no part a player has to be playing for the pack to make sense.",
    ),
    prerequisites: undeclared(
      "A rule pack is the institution a measure runs through, not content that waits on a condition. The pack declares nothing that has to hold before it applies.",
    ),
    requiredFacts: undeclared(
      "The pack names no canonical fact a world must show. Its citations are evidence of where its values came from and are carried in provenance.sources, not restated here as requirements.",
    ),
    slots: undeclared(
      "A rule pack is compiled institutional data with no authored player-facing text to fill in.",
    ),
    options: undeclared(
      "A rule pack offers nobody a bounded choice. Its floor stages are procedure the chamber runs and are reported as declared structure.",
    ),
    followUps: undeclared(
      "The pack names nothing that follows it. Its unresolved research is reported as unresolved research, which is what it is, rather than as somewhere the content can lead.",
    ),
    attributes: declared(attributes),
    unresolvedResearch:
      pack.unresolvedGaps.length > 0
        ? declared(
            pack.unresolvedGaps.map((gap, index) => ({
              key: `unresolved-gap:${index + 1}`,
              description: gap,
            })),
          )
        : undeclared(
            "This pack's compilation records no unresolved gap. That is the pack reporting none, not this index deciding there are none.",
          ),
    tags: [
      `jurisdiction:${pack.jurisdictionKey}`,
      `structure:${pack.structure}`,
      `inter-chamber:${pack.interChamber.kind}`,
      ...distinct(
        pack.sources.map((source) => `authority:${source.authority}`),
      ),
      ...distinct(
        pack.sources.map((source) => `verification:${source.verification}`),
      ),
      ...(pack.unresolvedGaps.length > 0 ? ["unresolved-research"] : []),
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "LEGISLATIVE_RULE_PACKS",
      citation: primary?.citation ?? null,
      sourceUrl: primary?.sourceUrl ?? null,
      retrievedAt: primary?.retrievedAt ?? null,
      verification: primary?.verification ?? null,
      note: primary?.note ?? null,
      sources: pack.sources.map(toSourceRef),
    },
  };
}

/** Every cited instrument, kept whole and kept as provenance. */
function toSourceRef(source: RuleSourceRef): ContentSourceRef {
  return {
    citation: source.citation,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl ?? null,
    retrievedAt: source.retrievedAt ?? null,
    authority: source.authority,
    verification: source.verification,
    note: source.note ?? null,
  };
}

function distinct(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}
