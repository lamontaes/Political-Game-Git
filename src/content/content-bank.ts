import { assertDottedContentKey } from "../simulation/taxonomy";

/**
 * What the game has written down, said once, in one shape.
 *
 * The banks already exist. Formative situations live in `character-history`,
 * conversation subjects in `conversation-subjects`, measures in
 * `legislation-scenarios`, procedure in `legislature-rule-packs`, and the
 * personality, incident and mortality definitions in their own catalogs. Each
 * of them is authored, each of them is stable, and each of them describes
 * itself in its own vocabulary — which is fine for the code that runs it and
 * useless for a person trying to answer "what content is in this game, where
 * did it come from, and what has to be true before a player ever sees it?"
 *
 * This file is the shape that question has an answer in. It is deliberately a
 * *description* of authored content and not a second place to author it: an
 * adapter reads a bank that already exists and reports what that bank actually
 * declares. Nothing here selects content, evaluates a prerequisite, or holds
 * simulation truth. The banks stay where they are and stay authoritative.
 *
 * The one rule that keeps it honest is that a dimension a bank does not
 * declare is reported as undeclared, with the reason, rather than filled in
 * from a guess. An index that quietly invents a prerequisite is worse than one
 * that admits it does not know, because the invented one reviews as fact.
 */

/** The bank an item came from. Always a stable dotted content key. */
export type ContentBankId = `${string}.${string}`;

/** A bank's item, addressed as `bank-id/item-key`. */
export type ContentItemId = string;

/**
 * Where an item's claim to be in the game comes from.
 *
 * Read from the repository rather than invented. `sourced` is what the
 * legislative rule packs are: compiled from a cited instrument, with the
 * citation, the retrieval date and a verification status attached.
 * `authored` is what a formative situation or a conversation subject is:
 * written for the game on purpose, and not claiming to describe anywhere real.
 * `synthetic-fixture` is what `createSynthetic*Catalog` builds: content that
 * exists to exercise the engine and that `assertProductionCatalogBoundary`
 * keeps out of a player's save. `unestablished` is the honest state of the
 * production catalogs, which are empty because no sourced content exists for
 * them yet — an empty bank saying "nothing has been established here" is a
 * fact about the game and belongs in the index like any other.
 */
export type ContentAuthority =
  "sourced" | "authored" | "synthetic-fixture" | "unestablished";

/**
 * Where an item can actually be reached.
 *
 * `production` means ordinary play can arrive at it. `development-only` means
 * a development route or a fixture is the only way in.
 * `excluded-from-production` means an invariant actively keeps it out of a
 * player's world.
 */
export type ContentStatus =
  "production" | "development-only" | "excluded-from-production";

export const CONTENT_AUTHORITIES: readonly ContentAuthority[] = [
  "sourced",
  "authored",
  "synthetic-fixture",
  "unestablished",
];

export const CONTENT_STATUSES: readonly ContentStatus[] = [
  "production",
  "development-only",
  "excluded-from-production",
];

/**
 * A dimension the source bank either declares or does not.
 *
 * There is no third state and no default. A bank that says nothing about
 * follow-up hooks reports `undeclared` with the reason it says nothing, and
 * the browser and both exports carry that reason through to the reader.
 */
export type ContentFacet<T> =
  | { readonly kind: "declared"; readonly value: T }
  | { readonly kind: "undeclared"; readonly reason: string };

export function declared<T>(value: T): ContentFacet<T> {
  return { kind: "declared", value };
}

export function undeclared<T>(reason: string): ContentFacet<T> {
  if (reason.trim().length === 0) {
    throw new Error("An undeclared content facet must say why it is unknown.");
  }
  return { kind: "undeclared", reason };
}

/** Something that has to hold before an item is offered. */
export interface ContentRequirement {
  readonly key: string;
  readonly description: string;
}

/** A named part somebody has to be playing for an item to make sense. */
export interface ContentRole {
  readonly key: string;
  readonly description: string;
  readonly required: boolean;
}

/** A variable an item's authored text expects to be filled in. */
export interface ContentSlot {
  readonly key: string;
  readonly description: string;
}

/** A bounded choice an item offers. */
export interface ContentOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

/** Somewhere an item can lead. */
export interface ContentFollowUp {
  readonly key: string;
  readonly description: string;
}

/**
 * Where the item is written down, and what the bank claims about its origin.
 *
 * `sourceModule` and `sourceSymbol` are the answer to "where did it come
 * from?" in the sense a reviewer means it: the file and the exported name, so
 * the reviewer can go and read it. The citation fields exist because one bank
 * — the legislative rule packs — genuinely carries them, and dropping them
 * would lose the only real provenance in the repository.
 */
export interface ContentProvenance {
  readonly sourceModule: string;
  readonly sourceSymbol: string;
  readonly citation: string | null;
  readonly sourceUrl: string | null;
  readonly retrievedAt: string | null;
  readonly verification: string | null;
  readonly note: string | null;
}

export interface ContentItem {
  /** `${bankId}/${itemKey}`. Derived, never authored separately. */
  readonly id: ContentItemId;
  readonly bankId: ContentBankId;
  /**
   * The bank's own identifier for this item, preserved exactly.
   *
   * `formative.lunch-table`, `household-obligation`, `kentucky-signage`,
   * `us-ky-general-assembly-v1`, an `EntityId` — whatever the bank already
   * calls it. This index does not rename existing content, so the key here is
   * the key a reviewer will find when they open the source module.
   */
  readonly itemKey: string;
  readonly title: string;
  readonly summary: string;
  /** The part of the game this belongs to: `life`, `conversation`, … */
  readonly domain: string;
  /** The thread or family within the domain. */
  readonly family: string;
  readonly authority: ContentAuthority;
  readonly status: ContentStatus;
  /** The life stage the item belongs to, where the bank bands its content. */
  readonly lifeStage: ContentFacet<string>;
  readonly roles: ContentFacet<readonly ContentRole[]>;
  readonly prerequisites: ContentFacet<readonly ContentRequirement[]>;
  readonly requiredFacts: ContentFacet<readonly ContentRequirement[]>;
  readonly slots: ContentFacet<readonly ContentSlot[]>;
  readonly options: ContentFacet<readonly ContentOption[]>;
  readonly followUps: ContentFacet<readonly ContentFollowUp[]>;
  readonly tags: readonly string[];
  readonly provenance: ContentProvenance;
}

export interface ContentBank {
  readonly id: ContentBankId;
  readonly title: string;
  readonly description: string;
  readonly domain: string;
  readonly authority: ContentAuthority;
  readonly status: ContentStatus;
  readonly sourceModule: string;
  readonly items: readonly ContentItem[];
}

/**
 * A bank, read.
 *
 * An adapter is a function because reading a bank is reading, not
 * configuration: some banks are module constants and some are built by a
 * factory, and both answer the same call. Registering a new bank later — from
 * legislative bargaining, from Packet 60, from anywhere — means writing one of
 * these and adding it to the registry. Nothing about the contract has to move.
 */
export type ContentBankAdapter = () => ContentBank;

export function contentItemId(
  bankId: ContentBankId,
  itemKey: string,
): ContentItemId {
  return `${bankId}/${itemKey}`;
}

/**
 * Everything a bank has to get right to be indexable.
 *
 * Bank ids go through the repository's existing dotted-content-key rule rather
 * than a second one written here. Item keys deliberately do not: they belong
 * to the banks, which already use several valid conventions — dotted keys,
 * plain slugs, pack ids, entity ids — and forcing them through one pattern
 * would mean renaming existing stable content, which this lane must not do.
 */
export function assertContentBank(bank: ContentBank): void {
  assertDottedContentKey(bank.id, "A content bank id");
  assertNonEmpty(bank.title, `Content bank ${bank.id} title`);
  assertNonEmpty(bank.description, `Content bank ${bank.id} description`);
  assertNonEmpty(bank.domain, `Content bank ${bank.id} domain`);
  assertNonEmpty(bank.sourceModule, `Content bank ${bank.id} source module`);

  const seen = new Set<string>();
  for (const item of bank.items) {
    if (item.bankId !== bank.id) {
      throw new Error(
        `Content item ${item.id} claims bank ${item.bankId} but is listed under ${bank.id}.`,
      );
    }
    assertNonEmpty(item.itemKey, `Content item key in ${bank.id}`);
    if (item.id !== contentItemId(bank.id, item.itemKey)) {
      throw new Error(
        `Content item id ${item.id} does not match ${contentItemId(bank.id, item.itemKey)}.`,
      );
    }
    if (seen.has(item.itemKey)) {
      throw new Error(
        `Content bank ${bank.id} lists the item key ${item.itemKey} twice.`,
      );
    }
    seen.add(item.itemKey);
    assertNonEmpty(item.title, `Content item ${item.id} title`);
    assertNonEmpty(item.summary, `Content item ${item.id} summary`);
    assertNonEmpty(item.domain, `Content item ${item.id} domain`);
    assertNonEmpty(item.family, `Content item ${item.id} family`);
    assertNonEmpty(
      item.provenance.sourceModule,
      `Content item ${item.id} source module`,
    );
    assertNonEmpty(
      item.provenance.sourceSymbol,
      `Content item ${item.id} source symbol`,
    );
    for (const tag of item.tags) {
      assertNonEmpty(tag, `Content item ${item.id} tag`);
    }
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

/** The declared value, or an empty list where the bank declares nothing. */
export function declaredList<T>(
  facet: ContentFacet<readonly T[]>,
): readonly T[] {
  return facet.kind === "declared" ? facet.value : [];
}
