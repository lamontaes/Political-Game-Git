import { canonicalJson } from "../simulation/canonical-json";
import {
  declaredList,
  type ContentBank,
  type ContentFacet,
  type ContentItem,
} from "./content-bank";
import type { ContentIndex } from "./content-registry";

/**
 * The index, written out twice: once for a person and once for a machine.
 *
 * Both exports are pure functions of the index, and the index is a sorted read
 * of module constants, so the same repository produces the same bytes every
 * time — on any machine, in any order, with no clock and no random source
 * anywhere in the path. That is the whole point: a review export that changed
 * between two identical runs could not be diffed, and a diff is what a
 * reviewer actually does with one.
 *
 * The JSON goes through `canonicalJson` rather than `JSON.stringify` for the
 * same reason the world snapshot does — key order is not content, and an
 * export whose bytes depend on insertion order is not deterministic in any
 * sense a reviewer can rely on.
 */

export interface ContentExport {
  readonly markdown: string;
  readonly json: string;
  readonly contentDigest: string;
}

/** Both exports, from one read of the index. */
export function exportContentIndex(index: ContentIndex): ContentExport {
  return {
    markdown: exportContentMarkdown(index),
    json: exportContentJson(index),
    contentDigest: index.contentDigest,
  };
}

export function exportContentJson(index: ContentIndex): string {
  return canonicalJson({
    format: "political-game-content-index",
    formatVersion: 1,
    contentDigest: index.contentDigest,
    banks: index.banks.map((bank) => ({
      id: bank.id,
      title: bank.title,
      description: bank.description,
      domain: bank.domain,
      authority: bank.authority,
      status: bank.status,
      sourceModule: bank.sourceModule,
      itemIds: bank.items.map((item) => item.id),
    })),
    items: index.items,
  });
}

export function exportContentMarkdown(index: ContentIndex): string {
  const lines: string[] = [];
  lines.push("# Content index");
  lines.push("");
  lines.push(
    "Every authored content bank the game currently registers, read through its own source module. Nothing here is authored: it is a report of what is already written down.",
  );
  lines.push("");
  lines.push(`- Content digest: \`${index.contentDigest}\``);
  lines.push(`- Banks: ${index.banks.length}`);
  lines.push(`- Items: ${index.items.length}`);
  lines.push("");
  lines.push("## Banks");
  lines.push("");
  lines.push("| Bank | Domain | Authority | Status | Items | Source |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const bank of index.banks) {
    lines.push(
      `| \`${bank.id}\` | ${bank.domain} | ${bank.authority} | ${bank.status} | ${bank.items.length} | \`${bank.sourceModule}\` |`,
    );
  }
  lines.push("");

  for (const bank of index.banks) {
    lines.push(...bankSection(bank));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function bankSection(bank: ContentBank): readonly string[] {
  const lines: string[] = [];
  lines.push(`## ${bank.title}`);
  lines.push("");
  lines.push(`\`${bank.id}\` · ${bank.authority} · ${bank.status}`);
  lines.push("");
  lines.push(bank.description);
  lines.push("");
  lines.push(`Source: \`${bank.sourceModule}\``);
  lines.push("");
  if (bank.items.length === 0) {
    lines.push(
      "This bank registers no items. That is a fact about the game, not a gap in the report.",
    );
    lines.push("");
    return lines;
  }
  for (const item of bank.items) {
    lines.push(...itemSection(item));
  }
  return lines;
}

function itemSection(item: ContentItem): readonly string[] {
  const lines: string[] = [];
  lines.push(`### ${item.title}`);
  lines.push("");
  lines.push(`\`${item.id}\``);
  lines.push("");
  lines.push(item.summary);
  lines.push("");
  lines.push(`- Domain: ${item.domain}`);
  lines.push(`- Family: ${item.family}`);
  lines.push(`- Authority: ${item.authority}`);
  lines.push(`- Status: ${item.status}`);
  lines.push(
    `- Life stages: ${facetLine(item.lifeStages, (bands) => bands.join(", "))}`,
  );
  lines.push(
    `- Tags: ${item.tags.length > 0 ? item.tags.map((tag) => `\`${tag}\``).join(", ") : "none"}`,
  );
  lines.push(
    `- Source: \`${item.provenance.sourceModule}\` · \`${item.provenance.sourceSymbol}\``,
  );
  if (item.provenance.citation) {
    lines.push(`- Citation: ${item.provenance.citation}`);
  }
  if (item.provenance.sourceUrl) {
    lines.push(`- Source URL: ${item.provenance.sourceUrl}`);
  }
  if (item.provenance.retrievedAt) {
    lines.push(`- Retrieved: ${item.provenance.retrievedAt}`);
  }
  if (item.provenance.verification) {
    lines.push(`- Verification: ${item.provenance.verification}`);
  }
  if (item.provenance.note) {
    lines.push(`- Note: ${item.provenance.note}`);
  }
  for (const source of item.provenance.sources) {
    const url = source.sourceUrl ? ` (${source.sourceUrl})` : "";
    const retrieved = source.retrievedAt
      ? `, retrieved ${source.retrievedAt}`
      : "";
    lines.push(
      `- Cited source: ${source.sourceTitle}, ${source.citation}${url} — ${source.authority}, ${source.verification}${retrieved}.`,
    );
  }
  lines.push("");

  lines.push(
    ...facetBlock(
      "Speaker and role requirements",
      item.roles,
      (role) =>
        `\`${role.key}\`${role.required ? "" : " (optional)"} — ${role.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Prerequisites",
      item.prerequisites,
      (rule) => `\`${rule.key}\` — ${rule.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Required canonical facts",
      item.requiredFacts,
      (rule) => `\`${rule.key}\` — ${rule.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Variable and name slots",
      item.slots,
      (slot) => `\`${slot.key}\` — ${slot.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Options",
      item.options,
      (option) =>
        `\`${option.key}\` — **${option.label}** — ${option.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Follow-up hooks",
      item.followUps,
      (hook) => `\`${hook.key}\` — ${hook.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Declared structure",
      item.attributes,
      (attribute) =>
        `\`${attribute.key}\` — **${attribute.label}** — ${attribute.description}`,
    ),
  );
  lines.push(
    ...facetBlock(
      "Unresolved research",
      item.unresolvedResearch,
      (gap) => `\`${gap.key}\` — ${gap.description}`,
    ),
  );
  return lines;
}

function facetLine<T>(
  facet: ContentFacet<T>,
  write: (value: T) => string,
): string {
  return facet.kind === "declared"
    ? write(facet.value)
    : `_not declared by the source bank — ${facet.reason}_`;
}

function facetBlock<T>(
  heading: string,
  facet: ContentFacet<readonly T[]>,
  write: (value: T) => string,
): readonly string[] {
  const lines: string[] = [`**${heading}**`, ""];
  if (facet.kind === "undeclared") {
    lines.push(`_Not declared by the source bank — ${facet.reason}_`);
    lines.push("");
    return lines;
  }
  const values = declaredList(facet);
  if (values.length === 0) {
    lines.push("_None declared._");
    lines.push("");
    return lines;
  }
  for (const value of values) lines.push(`- ${write(value)}`);
  lines.push("");
  return lines;
}
