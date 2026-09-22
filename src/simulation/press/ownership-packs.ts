import {
  MEDIA_PRODUCTS,
  MEDIA_RESOURCE_TIERS,
  MEDIA_SCOPES,
  type MediaProduct,
  type MediaResourceTier,
  type MediaScope,
} from "./records";

/**
 * Who owns the news, as loaded data.
 *
 * An ownership pack names the owners a world can have, which outlets each may
 * hold, how often each reviews its holdings, and the coordinated practices it
 * may apply across everything it owns at once: one decision, many newsrooms.
 * A modder changes who owns what and what owners do by writing a pack; the
 * engine only knows how to carry out the effects listed in
 * `MEDIA_OWNER_EFFECTS`.
 *
 * Same shape as the policy and trait packs: rows reference rows by key, every
 * reference is resolved once at load, and a row that does not resolve is
 * reported by name with its reason and skipped, never thrown and never silent.
 * A later pack may redeclare an earlier row's key to replace it; the report
 * says so.
 */

export type OwnershipPackProvenance =
  | { readonly kind: "authored-fiction"; readonly note: string }
  | {
      readonly kind: "sourced";
      readonly sources: readonly string[];
      readonly note: string;
    };

/**
 * One coordinated practice: a decision an owner can take for every outlet it
 * holds. `effect` names the rule that carries it out.
 */
export interface OwnershipPracticeRow {
  readonly key: string;
  readonly effect: string;
  /** Chance, 0 to 1, that the owner takes this decision at one review. */
  readonly likelihoodPerReview: number;
  /**
   * What the decision is, in plain words. Recorded with the decision, so a
   * practice whose effect is not simulated still says what the owner did.
   */
  readonly description: string;
  readonly parameters?: {
    /** reduce-newsroom-staff: share of current newsroom jobs cut, 0 to 1. */
    readonly shareOfPositions?: number;
    /** reduce-newsroom-staff: jobs each outlet keeps, whatever the share. */
    readonly minimumPositionsKept?: number;
  };
}

export interface OwnershipOwnerRow {
  readonly key: string;
  /** Descriptive label only; what the owner does comes from its practices. */
  readonly ownerKind: string;
  /**
   * Candidate names; one is drawn per world. With `perOutlet`, `{outlet}` is
   * replaced by the outlet's name and each outlet gets its own owner.
   */
  readonly names: readonly string[];
  readonly perOutlet?: boolean;
  /** Which outlets this owner may hold. An omitted list admits every value. */
  readonly holds: {
    readonly products?: readonly MediaProduct[];
    readonly scopes?: readonly MediaScope[];
  };
  /** Relative chance of being an eligible outlet's founding owner. */
  readonly foundingWeight: number;
  readonly reviewEveryDays: number;
  /** Whether another owner's acquire-outlet practice may buy from this one. */
  readonly sellsOutlets: boolean;
  readonly practices: readonly string[];
}

export interface OwnershipPack {
  readonly id: string;
  readonly provenance: OwnershipPackProvenance;
  readonly practices?: readonly OwnershipPracticeRow[];
  readonly owners?: readonly OwnershipOwnerRow[];
  /**
   * What an outlet of each size costs a buyer, in whole US dollars. A later
   * pack's price for a size replaces an earlier one. A size no loaded pack
   * prices cannot be bought, and the purchase route says so.
   */
  readonly askingPriceDollars?: Partial<Record<MediaResourceTier, number>>;
}

/**
 * The effects the engine can carry out. A practice naming any other effect
 * still loads: the blanket rule records the owner's decision against every
 * outlet it holds and changes nothing downstream, and the load report lists
 * it as not yet simulated.
 *
 * Named in packs and NOT YET SIMULATED (blanket rule applies):
 * - `share-content-across-outlets` — one story run by every sibling outlet.
 *   Needs the press desk to accept a sibling's publication as its own story.
 * - `coordinate-editorial-line` — must-run segments, a common endorsement.
 *   Needs outlet editorial stance, which the desk does not model.
 * - `consolidate-newsrooms` — merging desks or closing an outlet. Needs an
 *   outlet lifecycle (closure, merger) that press records do not carry.
 * - Owner finances. There is no media revenue model, so no practice is
 *   triggered by an owner's balance sheet: every trigger is the blanket
 *   `likelihoodPerReview` draw until one exists.
 */
export const MEDIA_OWNER_EFFECTS = [
  "reduce-newsroom-staff",
  "acquire-outlet",
] as const;
export type SimulatedOwnerEffect = (typeof MEDIA_OWNER_EFFECTS)[number];

export function ownerEffectIsSimulated(
  effect: string,
): effect is SimulatedOwnerEffect {
  return (MEDIA_OWNER_EFFECTS as readonly string[]).includes(effect);
}

export interface OwnershipLoadRejection {
  readonly pack: string;
  readonly where: string;
  readonly reason: string;
}

export interface OwnershipLoadReport {
  readonly packs: readonly {
    readonly pack: string;
    readonly provenance: OwnershipPackProvenance["kind"];
    readonly owners: readonly string[];
    readonly practices: readonly string[];
  }[];
  /** Keys a later pack redeclared, with the pack that now supplies each. */
  readonly replaced: readonly { readonly key: string; readonly by: string }[];
  /** Practices whose effect the engine does not carry out yet. */
  readonly notYetSimulated: readonly {
    readonly practice: string;
    readonly effect: string;
  }[];
  readonly rejections: readonly OwnershipLoadRejection[];
}

export interface LoadedOwnershipOwner extends OwnershipOwnerRow {
  readonly packId: string;
}

export interface OwnershipRegistry {
  readonly owners: readonly LoadedOwnershipOwner[];
  readonly practices: ReadonlyMap<string, OwnershipPracticeRow>;
  readonly askingPriceDollars: Readonly<
    Partial<Record<MediaResourceTier, number>>
  >;
  readonly report: OwnershipLoadReport;
}

const KEY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;

function practiceProblem(row: OwnershipPracticeRow): string | null {
  if (typeof row.key !== "string" || !KEY.test(row.key))
    return "has no dotted key";
  if (typeof row.effect !== "string" || !row.effect.trim())
    return "names no effect";
  if (typeof row.description !== "string" || !row.description.trim())
    return "has no description";
  if (
    typeof row.likelihoodPerReview !== "number" ||
    !(row.likelihoodPerReview >= 0 && row.likelihoodPerReview <= 1)
  )
    return "has a likelihood outside 0 to 1";
  const share = row.parameters?.shareOfPositions;
  if (share !== undefined && !(share > 0 && share <= 1))
    return "has a share of positions outside 0 to 1";
  const kept = row.parameters?.minimumPositionsKept;
  if (kept !== undefined && !(Number.isSafeInteger(kept) && kept >= 0))
    return "keeps a negative or fractional number of positions";
  return null;
}

function ownerProblem(row: OwnershipOwnerRow): string | null {
  if (typeof row.key !== "string" || !KEY.test(row.key))
    return "has no dotted key";
  if (
    !Array.isArray(row.names) ||
    row.names.length === 0 ||
    row.names.some((name) => typeof name !== "string" || !name.trim())
  )
    return "has no names";
  if (row.perOutlet && row.names.some((name) => !name.includes("{outlet}")))
    return "is per-outlet and a name lacks {outlet}";
  if (!row.perOutlet && row.names.some((name) => name.includes("{outlet}")))
    return "names {outlet} but is not per-outlet, so one outlet's name would stick to every holding";
  if (typeof row.ownerKind !== "string" || !row.ownerKind.trim())
    return "has no owner kind";
  const products = row.holds?.products ?? [];
  const unknownProduct = products.find(
    (product) => !(MEDIA_PRODUCTS as readonly string[]).includes(product),
  );
  if (unknownProduct) return `holds the unknown product "${unknownProduct}"`;
  const scopes = row.holds?.scopes ?? [];
  const unknownScope = scopes.find(
    (scope) => !(MEDIA_SCOPES as readonly string[]).includes(scope),
  );
  if (unknownScope) return `holds the unknown scope "${unknownScope}"`;
  if (!(typeof row.foundingWeight === "number" && row.foundingWeight >= 0))
    return "has a negative founding weight";
  if (!(Number.isSafeInteger(row.reviewEveryDays) && row.reviewEveryDays >= 7))
    return "reviews more often than weekly";
  return null;
}

/** Loads packs in order. Never throws for bad content; it reports it. */
export function loadOwnershipPacks(
  packs: readonly OwnershipPack[],
): OwnershipRegistry {
  const practices = new Map<string, OwnershipPracticeRow>();
  const practiceSource = new Map<string, string>();
  const owners = new Map<string, LoadedOwnershipOwner>();
  const ownerSource = new Map<string, string>();
  const replaced: { key: string; by: string }[] = [];
  const rejections: OwnershipLoadRejection[] = [];
  const reports: OwnershipLoadReport["packs"][number][] = [];
  const askingPriceDollars: Partial<Record<MediaResourceTier, number>> = {};

  for (const pack of packs) {
    const provenance = pack.provenance;
    const provenanceOk =
      provenance?.kind === "authored-fiction"
        ? typeof provenance.note === "string" && provenance.note.trim() !== ""
        : provenance?.kind === "sourced"
          ? Array.isArray(provenance.sources) && provenance.sources.length > 0
          : false;
    if (!provenanceOk) {
      rejections.push({
        pack: pack.id,
        where: "provenance",
        reason:
          "the pack does not say whether it is authored fiction or sourced, so none of its rows load",
      });
      continue;
    }
    const loadedPractices: string[] = [];
    for (const [index, row] of (pack.practices ?? []).entries()) {
      const problem = practiceProblem(row);
      if (problem) {
        rejections.push({
          pack: pack.id,
          where: `practices[${index}] ${row?.key ?? ""}`.trim(),
          reason: problem,
        });
        continue;
      }
      if (practiceSource.has(row.key))
        replaced.push({ key: row.key, by: pack.id });
      practices.set(row.key, row);
      practiceSource.set(row.key, pack.id);
      loadedPractices.push(row.key);
    }
    const loadedOwners: string[] = [];
    for (const [index, row] of (pack.owners ?? []).entries()) {
      const problem = ownerProblem(row);
      if (problem) {
        rejections.push({
          pack: pack.id,
          where: `owners[${index}] ${row?.key ?? ""}`.trim(),
          reason: problem,
        });
        continue;
      }
      const unknownPractice = row.practices.find((key) => !practices.has(key));
      if (unknownPractice) {
        rejections.push({
          pack: pack.id,
          where: `owners[${index}] ${row.key}`,
          reason: `uses the practice "${unknownPractice}", which no pack loaded before it declares`,
        });
        continue;
      }
      if (ownerSource.has(row.key))
        replaced.push({ key: row.key, by: pack.id });
      owners.set(row.key, { ...row, packId: pack.id });
      ownerSource.set(row.key, pack.id);
      loadedOwners.push(row.key);
    }
    for (const [tier, price] of Object.entries(pack.askingPriceDollars ?? {})) {
      if (!(MEDIA_RESOURCE_TIERS as readonly string[]).includes(tier)) {
        rejections.push({
          pack: pack.id,
          where: `askingPriceDollars.${tier}`,
          reason: "prices an outlet size the game does not have",
        });
      } else if (!(Number.isSafeInteger(price) && price > 0)) {
        rejections.push({
          pack: pack.id,
          where: `askingPriceDollars.${tier}`,
          reason: "is not a positive whole number of dollars",
        });
      } else {
        askingPriceDollars[tier as MediaResourceTier] = price;
      }
    }
    reports.push({
      pack: pack.id,
      provenance: provenance.kind,
      owners: loadedOwners,
      practices: loadedPractices,
    });
  }

  const notYetSimulated = [...practices.values()]
    .filter((row) => !ownerEffectIsSimulated(row.effect))
    .map((row) => ({ practice: row.key, effect: row.effect }));
  return {
    owners: [...owners.values()],
    practices,
    askingPriceDollars,
    report: { packs: reports, replaced, notYetSimulated, rejections },
  };
}

/** The load report as a person would read it in a log or failing test. */
export function describeOwnershipLoad(report: OwnershipLoadReport): string {
  const lines: string[] = [];
  for (const pack of report.packs) {
    lines.push(
      `${pack.pack} (${pack.provenance}): ${pack.owners.length} owner(s), ${pack.practices.length} practice(s)`,
    );
  }
  for (const entry of report.replaced) {
    lines.push(`  ${entry.key} — replaced by ${entry.by}`);
  }
  for (const entry of report.notYetSimulated) {
    lines.push(
      `  ${entry.practice} — effect "${entry.effect}" is not simulated yet; the decision is recorded and changes nothing else`,
    );
  }
  for (const rejection of report.rejections) {
    lines.push(
      `REJECTED ${rejection.pack} ${rejection.where}: ${rejection.reason}`,
    );
  }
  if (lines.length === 0) lines.push("No ownership packs loaded.");
  return lines.join("\n");
}
