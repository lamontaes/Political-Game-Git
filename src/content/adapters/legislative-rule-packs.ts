import { LEGISLATIVE_RULE_PACKS } from "../../simulation/legislature-rule-packs";
import type {
  LegislativeRulePack,
  RuleSourceRef,
} from "../../simulation/legislature-rules";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
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
 * Both of those are exactly what a content index is for, so both come through
 * whole. The gaps are follow-up hooks in the only sense that matters here —
 * they name what is still open — and the citations are the provenance a
 * reviewer needs to check a claim without reading the runtime.
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
    lifeStage: undeclared(
      "An institution's procedure does not belong to a stage of anybody's life.",
    ),
    roles: declared([
      {
        key: "member",
        description: `A seated member of one of the ${pack.chambers.length} chamber(s) in this pack.`,
        required: true,
      },
      {
        key: pack.executive.titleLabel.toLowerCase(),
        description: `The executive who acts at presentment; this pack titles the office ${pack.executive.titleLabel}.`,
        required: true,
      },
    ]),
    prerequisites: declared(
      pack.chambers.map((chamber) => ({
        key: `chamber:${chamber.chamberKey}`,
        description: `${chamber.name}, ${chamber.seats} seats, ${chamber.floorStages.length} floor stage(s), ${chamber.committees.length} committee rule(s).`,
      })),
    ),
    requiredFacts: declared(
      pack.sources.map((source) => ({
        key: `${source.authority}:${source.citation}`,
        description: describeSource(source),
      })),
    ),
    slots: undeclared(
      "A rule pack is compiled institutional data with no authored player-facing text to fill in.",
    ),
    options: declared(
      pack.chambers.flatMap((chamber) =>
        chamber.floorStages.map((stage) => ({
          key: `${chamber.chamberKey}:${stage.stageKey}`,
          label: stage.label,
          description: `A floor stage in ${chamber.name}.`,
        })),
      ),
    ),
    followUps: declared(
      pack.unresolvedGaps.map((gap, index) => ({
        key: `unresolved-gap:${index + 1}`,
        description: gap,
      })),
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
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "LEGISLATIVE_RULE_PACKS",
      citation: primary?.citation ?? null,
      sourceUrl: primary?.sourceUrl ?? null,
      retrievedAt: primary?.retrievedAt ?? null,
      verification: primary?.verification ?? null,
      note: primary?.note ?? null,
    },
  };
}

function describeSource(source: RuleSourceRef): string {
  const url = source.sourceUrl ? ` (${source.sourceUrl})` : "";
  const retrieved = source.retrievedAt
    ? `, retrieved ${source.retrievedAt}`
    : "";
  return `${source.sourceTitle}, ${source.citation}${url} — ${source.verification}${retrieved}.`;
}

function distinct(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}
