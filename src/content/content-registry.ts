import { canonicalJson } from "../simulation/canonical-json";
import { stableHash } from "../simulation/ids";
import {
  assertContentBank,
  declaredList,
  type ContentAuthority,
  type ContentBank,
  type ContentBankAdapter,
  type ContentBankId,
  type ContentItem,
  type ContentItemId,
  type ContentStatus,
} from "./content-bank";

/**
 * Every bank the game has, in one order, built the same way every time.
 *
 * The index is a read. It calls each registered adapter, checks that what
 * comes back is a well-formed bank, and sorts the result so two runs over the
 * same repository produce the same index — which is what makes the exports
 * downstream of it comparable across runs and across machines.
 *
 * Nothing here counts. There is no expected number of banks and no expected
 * number of items in one; a bank that grows, shrinks or arrives later is an
 * ordinary index, not a broken one.
 */

export interface ContentIndex {
  readonly banks: readonly ContentBank[];
  readonly items: readonly ContentItem[];
  /**
   * A hash of the whole index's content.
   *
   * Two identical repositories produce the same digest, and any authored
   * change to any indexed bank changes it. It is written into both exports so
   * a reviewer can tell at a glance whether two reports describe the same
   * content state.
   */
  readonly contentDigest: string;
}

export class ContentBankRegistry {
  private readonly adapters: ContentBankAdapter[] = [];

  register(adapter: ContentBankAdapter): this {
    this.adapters.push(adapter);
    return this;
  }

  registerAll(adapters: readonly ContentBankAdapter[]): this {
    for (const adapter of adapters) this.register(adapter);
    return this;
  }

  build(): ContentIndex {
    const banks = this.adapters.map((adapter) => adapter());
    for (const bank of banks) assertContentBank(bank);

    const seen = new Set<ContentBankId>();
    for (const bank of banks) {
      if (seen.has(bank.id)) {
        throw new Error(`Two content banks are registered as ${bank.id}.`);
      }
      seen.add(bank.id);
    }

    const orderedBanks = [...banks]
      .sort((left, right) => compare(left.id, right.id))
      .map((bank) => ({
        ...bank,
        items: [...bank.items].sort((left, right) =>
          compare(left.itemKey, right.itemKey),
        ),
      }));

    const items = orderedBanks.flatMap((bank) => bank.items);
    return {
      banks: orderedBanks,
      items,
      contentDigest: stableHash(canonicalJson(orderedBanks)),
    };
  }
}

/** Sorting is by UTF-16 code unit, the same rule `canonicalJson` uses. */
function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/* -------------------------------------------------------------------------- */
/* Finding things.                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What a reviewer can narrow by.
 *
 * Each dimension is optional and they combine with and. `text` is a
 * case-insensitive substring match over everything an item says about itself,
 * which is what someone actually reaches for when they half-remember a line.
 */
export interface ContentQuery {
  readonly text?: string;
  readonly bankIds?: readonly ContentBankId[];
  readonly domains?: readonly string[];
  readonly families?: readonly string[];
  readonly lifeStages?: readonly string[];
  readonly roles?: readonly string[];
  readonly authorities?: readonly ContentAuthority[];
  readonly statuses?: readonly ContentStatus[];
  readonly tags?: readonly string[];
  /** Only items that declare at least one prerequisite or required fact. */
  readonly hasPrerequisites?: boolean;
  /** Only items whose named dimensions the source bank does not declare. */
  readonly undeclaredDimensions?: readonly ContentDimension[];
}

export type ContentDimension =
  | "lifeStages"
  | "roles"
  | "prerequisites"
  | "requiredFacts"
  | "slots"
  | "options"
  | "followUps"
  | "attributes"
  | "unresolvedResearch";

export const CONTENT_DIMENSIONS: readonly ContentDimension[] = [
  "lifeStages",
  "roles",
  "prerequisites",
  "requiredFacts",
  "slots",
  "options",
  "followUps",
  "attributes",
  "unresolvedResearch",
];

export function queryContentItems(
  items: readonly ContentItem[],
  query: ContentQuery,
): readonly ContentItem[] {
  const text = query.text?.trim().toLowerCase() ?? "";
  return items.filter((item) => {
    if (text.length > 0 && !searchableText(item).includes(text)) return false;
    if (!matches(query.bankIds, [item.bankId])) return false;
    if (!matches(query.domains, [item.domain])) return false;
    if (!matches(query.families, [item.family])) return false;
    if (!matches(query.authorities, [item.authority])) return false;
    if (!matches(query.statuses, [item.status])) return false;
    if (!matches(query.tags, item.tags)) return false;
    // A banded item is discoverable under every band it declares, so an item
    // honest in two life stages is found by a filter on either of them.
    if (!matches(query.lifeStages, declaredList(item.lifeStages))) {
      return false;
    }
    if (
      !matches(
        query.roles,
        declaredList(item.roles).map((role) => role.key),
      )
    ) {
      return false;
    }
    if (query.hasPrerequisites !== undefined) {
      const count =
        declaredList(item.prerequisites).length +
        declaredList(item.requiredFacts).length;
      if (query.hasPrerequisites !== count > 0) return false;
    }
    for (const dimension of query.undeclaredDimensions ?? []) {
      if (item[dimension].kind !== "undeclared") return false;
    }
    return true;
  });
}

function matches(
  wanted: readonly string[] | undefined,
  present: readonly string[],
): boolean {
  if (!wanted || wanted.length === 0) return true;
  return wanted.some((value) => present.includes(value));
}

/** Everything an item says about itself, lowercased, for substring search. */
export function searchableText(item: ContentItem): string {
  const facetText = [
    ...declaredList(item.lifeStages),
    ...declaredList(item.roles).flatMap((role) => [role.key, role.description]),
    ...declaredList(item.prerequisites).flatMap((rule) => [
      rule.key,
      rule.description,
    ]),
    ...declaredList(item.requiredFacts).flatMap((rule) => [
      rule.key,
      rule.description,
    ]),
    ...declaredList(item.slots).flatMap((slot) => [slot.key, slot.description]),
    ...declaredList(item.options).flatMap((option) => [
      option.key,
      option.label,
      option.description,
    ]),
    ...declaredList(item.attributes).flatMap((attribute) => [
      attribute.key,
      attribute.label,
      attribute.description,
    ]),
    ...declaredList(item.unresolvedResearch).flatMap((gap) => [
      gap.key,
      gap.description,
    ]),
    ...declaredList(item.followUps).flatMap((hook) => [
      hook.key,
      hook.description,
    ]),
  ];
  return [
    item.id,
    item.itemKey,
    item.title,
    item.summary,
    item.domain,
    item.family,
    item.authority,
    item.status,
    ...item.tags,
    ...facetText,
    item.provenance.sourceModule,
    item.provenance.sourceSymbol,
    item.provenance.citation ?? "",
    item.provenance.note ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

/** The distinct values an index actually holds, for building filter controls. */
export interface ContentFacetOptions {
  readonly domains: readonly string[];
  readonly families: readonly string[];
  readonly lifeStages: readonly string[];
  readonly roles: readonly string[];
  readonly authorities: readonly ContentAuthority[];
  readonly statuses: readonly ContentStatus[];
  readonly tags: readonly string[];
}

export function contentFacetOptions(
  items: readonly ContentItem[],
): ContentFacetOptions {
  return {
    domains: distinct(items.map((item) => item.domain)),
    families: distinct(items.map((item) => item.family)),
    lifeStages: distinct(
      items.flatMap((item) => [...declaredList(item.lifeStages)]),
    ),
    roles: distinct(
      items.flatMap((item) => declaredList(item.roles).map((role) => role.key)),
    ),
    authorities: distinct(
      items.map((item) => item.authority),
    ) as readonly ContentAuthority[],
    statuses: distinct(
      items.map((item) => item.status),
    ) as readonly ContentStatus[],
    tags: distinct(items.flatMap((item) => item.tags)),
  };
}

function distinct(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compare);
}

export function contentItemById(
  index: ContentIndex,
  id: ContentItemId,
): ContentItem | null {
  return index.items.find((item) => item.id === id) ?? null;
}
