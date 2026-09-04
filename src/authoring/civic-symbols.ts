/**
 * OFFICIAL CIVIC SYMBOLS — identity, placement and the rules for using them.
 *
 * A flag on a standard and a seal on a rostrum are the two objects in a civic
 * scene that a generative model will cheerfully invent and get wrong. They are
 * also the two whose misuse is a statutory offence in most states. So they are
 * not art assets here at all: they are IDENTITIES the world resolves, with a
 * citation attached, and the bytes arrive from the issuing authority or not at
 * all.
 *
 * Three rules follow from that, and all three are enforced rather than advised:
 *
 * 1. **Never generated.** A model asked for a state seal produces something
 *    that looks like one and is not one. `assetProvenance` has no value that
 *    means "generated", and the validator rejects any record claiming one.
 * 2. **Never assumed present.** Every entry declares `asset_status`, and the
 *    honest answer for all 188 of them today is `not-acquired`. A slot bound to
 *    an unacquired symbol paints its fallback; it does not paint a guess.
 * 3. **Only where a symbol belongs.** A seal goes on a rostrum, a wall, a
 *    document or a letterhead. It does not go on campaign literature or a
 *    political action committee's mailer, and `slotPermitsSymbol` says so in
 *    code rather than in a document nobody reads at render time.
 *
 * The registry is deliberately identity-only. Acquiring 188 vector files is a
 * separate, per-jurisdiction task with its own rights checks, and doing it
 * speculatively would mean downloading a few hundred images this project cannot
 * currently show anyone.
 */

import manifest from "../../art/manifest/civic_symbols.json";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** What the symbol IS. A flag and a seal are not interchangeable. */
export type CivicSymbolKind =
  | "flag"
  | "great-seal"
  | "coat-of-arms"
  | "executive-seal"
  | "institutional-seal";

export const CIVIC_SYMBOL_KINDS: readonly CivicSymbolKind[] = [
  "flag",
  "great-seal",
  "coat-of-arms",
  "executive-seal",
  "institutional-seal",
];

/** The level of government the symbol belongs to. */
export type CivicSymbolLevel =
  "national" | "state" | "district" | "territory" | "county";

export const CIVIC_SYMBOL_LEVELS: readonly CivicSymbolLevel[] = [
  "national",
  "state",
  "district",
  "territory",
  "county",
];

/**
 * Whether the artwork exists here, and where it came from.
 *
 * There is no `generated`. That is the point: an AI-drawn seal is a plausible
 * forgery of a legal instrument, and leaving the value unrepresentable is
 * stronger than a rule saying not to.
 */
export type CivicSymbolAssetStatus =
  /** Identity recorded; no bytes in this repository. The current answer. */
  | "not-acquired"
  /** Bytes acquired from the issuing authority or an equivalent source. */
  | "acquired-official"
  /** Bytes from a third party whose rights path is verified. */
  | "acquired-third-party"
  /** Acquisition attempted and refused; the reason is recorded. */
  | "unavailable";

export const CIVIC_SYMBOL_ASSET_STATUSES: readonly CivicSymbolAssetStatus[] = [
  "not-acquired",
  "acquired-official",
  "acquired-third-party",
  "unavailable",
];

export interface CivicSymbol {
  readonly symbol_id: string;
  readonly kind: CivicSymbolKind;
  readonly level: CivicSymbolLevel;
  /** Canonical geography key the world resolves a jurisdiction to. */
  readonly geography_id: string;
  readonly name: string;
  readonly jurisdiction: string;
  readonly aspect_ratio?: string;
  /**
   * Present when the statutory ratio and the manufactured one differ, which is
   * common enough that recording only one of them would be wrong.
   */
  readonly aspect_ratio_notes?: string;
  readonly statutory_authority?: string;
  /** The statute restricting reproduction, where one was found. */
  readonly legal_restrictions?: string;
  readonly adoption_date?: string;
  readonly custodian?: string;
  readonly colors?: readonly string[];
  readonly asset_status: CivicSymbolAssetStatus;
  /** Repository-relative path. Only ever present for an acquired symbol. */
  readonly asset_path?: string;
  readonly acquisition_note?: string;
}

export interface CivicSymbolManifest {
  readonly version: number;
  readonly authority: string;
  readonly note: string;
  readonly symbols: readonly CivicSymbol[];
}

export const CIVIC_SYMBOLS = manifest as CivicSymbolManifest;

const BY_ID = new Map(
  CIVIC_SYMBOLS.symbols.map((symbol) => [symbol.symbol_id, symbol]),
);

export function civicSymbol(symbolId: string): CivicSymbol | undefined {
  return BY_ID.get(symbolId);
}

export function civicSymbolsFor(geographyId: string): readonly CivicSymbol[] {
  return CIVIC_SYMBOLS.symbols.filter(
    (symbol) => symbol.geography_id === geographyId,
  );
}

/** Symbols whose artwork this repository actually has. */
export function acquiredCivicSymbols(): readonly CivicSymbol[] {
  return CIVIC_SYMBOLS.symbols.filter(
    (symbol) =>
      symbol.asset_status === "acquired-official" ||
      symbol.asset_status === "acquired-third-party",
  );
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

/**
 * Where in a scene a civic symbol may be mounted.
 *
 * Each is a real physical fixture with its own geometry and material, and the
 * distinction matters to the renderer as much as to the lawyer: a flag on an
 * indoor standard hangs in folds and must not be painted as a flat rectangle,
 * while a seal on a rostrum is a relief catching the room's own light.
 */
export type CivicSymbolSlotType =
  /** Indoor ceremonial standard: cloth drape, usually fringed. */
  | "flag-pole-draped"
  /** Wall-mounted flat display of a flag. */
  | "flag-wall-flat"
  /** Circular medallion on the front of a podium or dais. */
  | "seal-rostrum-plaque"
  /** Cast or carved relief seal on a chamber wall. */
  | "seal-wall-medallion"
  /** Debossed into a blotter, or a watermark on a document. */
  | "seal-desk-deboss"
  /** The header of a formal document. */
  | "seal-letterhead";

export const CIVIC_SYMBOL_SLOT_TYPES: readonly CivicSymbolSlotType[] = [
  "flag-pole-draped",
  "flag-wall-flat",
  "seal-rostrum-plaque",
  "seal-wall-medallion",
  "seal-desk-deboss",
  "seal-letterhead",
];

/** Which kinds of symbol each mounting can honestly carry. */
const SLOT_ACCEPTS: Readonly<
  Record<CivicSymbolSlotType, readonly CivicSymbolKind[]>
> = {
  "flag-pole-draped": ["flag"],
  "flag-wall-flat": ["flag"],
  "seal-rostrum-plaque": [
    "great-seal",
    "executive-seal",
    "institutional-seal",
    "coat-of-arms",
  ],
  "seal-wall-medallion": [
    "great-seal",
    "executive-seal",
    "institutional-seal",
    "coat-of-arms",
  ],
  "seal-desk-deboss": ["great-seal", "executive-seal", "institutional-seal"],
  "seal-letterhead": ["great-seal", "executive-seal", "institutional-seal"],
};

export function slotAcceptsKind(
  slotType: CivicSymbolSlotType,
  kind: CivicSymbolKind,
): boolean {
  return (SLOT_ACCEPTS[slotType] ?? []).includes(kind);
}

/** The surface finish a mounting implies, for whoever writes the renderer. */
export type CivicSymbolFinish =
  "fabric-draped" | "cast-relief" | "carved-relief" | "flat-matte";

export const SLOT_FINISH: Readonly<
  Record<CivicSymbolSlotType, CivicSymbolFinish>
> = {
  "flag-pole-draped": "fabric-draped",
  "flag-wall-flat": "flat-matte",
  "seal-rostrum-plaque": "cast-relief",
  "seal-wall-medallion": "carved-relief",
  "seal-desk-deboss": "flat-matte",
  "seal-letterhead": "flat-matte",
};

// ---------------------------------------------------------------------------
// Usage policy
// ---------------------------------------------------------------------------

/**
 * Contexts a symbol might be asked to appear in.
 *
 * The split is between institutional use, which is what these objects are for,
 * and campaign or commercial use, which is what statute after statute
 * specifically prohibits. A simulation that hangs a state seal on a candidate's
 * yard sign has reproduced the exact misuse the law names.
 */
export type CivicSymbolUseContext =
  /** A government room, document, rostrum or wall inside the fiction. */
  | "institutional-scene"
  /** Campaign signage, literature, advertising or committee material. */
  | "campaign-material"
  /** Anything sold or promoted outside the software. */
  | "commercial-merchandise";

export const CIVIC_SYMBOL_USE_CONTEXTS: readonly CivicSymbolUseContext[] = [
  "institutional-scene",
  "campaign-material",
  "commercial-merchandise",
];

export interface UsageDecision {
  readonly permitted: boolean;
  readonly reason: string;
}

/**
 * Whether a symbol may be drawn in a context.
 *
 * Only one context ever permits it. The other two are refused unconditionally
 * and without reference to the symbol, because the prohibition is about the
 * use, not about which seal is being misused.
 */
export function symbolUsePermitted(
  context: CivicSymbolUseContext,
): UsageDecision {
  switch (context) {
    case "institutional-scene":
      return {
        permitted: true,
        reason:
          "Official symbols render on institutionally appropriate virtual surfaces: rostrum medallions, chamber walls, standards, official documents.",
      };
    case "campaign-material":
      return {
        permitted: false,
        reason:
          "A jurisdiction's seal on campaign or committee material is the misuse most state statutes name specifically. Campaign surfaces carry campaign branding.",
      };
    case "commercial-merchandise":
      return {
        permitted: false,
        reason:
          "Official symbols are never reproduced on merchandise sold or promoted outside the software.",
      };
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CivicSymbolFindingCode =
  | "unknown-kind"
  | "unknown-level"
  | "unknown-asset-status"
  | "duplicate-symbol-id"
  | "missing-geography"
  | "acquired-without-path"
  | "path-without-acquisition"
  | "unavailable-without-note"
  | "generated-artwork-claimed"
  | "asset-path-outside-art";

export interface CivicSymbolFinding {
  readonly code: CivicSymbolFindingCode;
  readonly severity: "error" | "warning";
  readonly symbolId: string;
  readonly message: string;
}

export interface CivicSymbolValidation {
  readonly valid: boolean;
  readonly findings: readonly CivicSymbolFinding[];
}

/**
 * Checks the registry's internal honesty.
 *
 * The rules are all about the gap between "we know this symbol exists" and "we
 * have this symbol's artwork", which is the gap a civic-symbol library
 * habitually closes by accident.
 */
export function validateCivicSymbols(
  symbols: readonly CivicSymbol[],
): CivicSymbolValidation {
  const findings: CivicSymbolFinding[] = [];
  const seen = new Set<string>();
  const finding = (
    code: CivicSymbolFindingCode,
    symbolId: string,
    message: string,
    severity: "error" | "warning" = "error",
  ) => findings.push({ code, severity, symbolId, message });

  for (const symbol of symbols) {
    const id = symbol.symbol_id;
    if (seen.has(id)) {
      finding("duplicate-symbol-id", id, "Two entries share this identity.");
    }
    seen.add(id);

    if (!CIVIC_SYMBOL_KINDS.includes(symbol.kind)) {
      finding("unknown-kind", id, `Kind '${symbol.kind}' is not recognised.`);
    }
    if (!CIVIC_SYMBOL_LEVELS.includes(symbol.level)) {
      finding(
        "unknown-level",
        id,
        `Level '${symbol.level}' is not recognised.`,
      );
    }
    if (!CIVIC_SYMBOL_ASSET_STATUSES.includes(symbol.asset_status)) {
      finding(
        "unknown-asset-status",
        id,
        `Asset status '${symbol.asset_status}' is not recognised. There is deliberately no status meaning the artwork was generated.`,
      );
    }
    if (!symbol.geography_id || !symbol.geography_id.startsWith("geo:")) {
      finding(
        "missing-geography",
        id,
        "A symbol needs the canonical geography key the world will resolve it by.",
      );
    }

    const acquired =
      symbol.asset_status === "acquired-official" ||
      symbol.asset_status === "acquired-third-party";
    if (acquired && !symbol.asset_path) {
      finding(
        "acquired-without-path",
        id,
        "An acquired symbol must say where its artwork is.",
      );
    }
    if (!acquired && symbol.asset_path) {
      finding(
        "path-without-acquisition",
        id,
        "A symbol that has not been acquired cannot have artwork on disk.",
      );
    }
    if (symbol.asset_path && !symbol.asset_path.startsWith("art/")) {
      finding(
        "asset-path-outside-art",
        id,
        `'${symbol.asset_path}' is outside art/, where provenance lives.`,
      );
    }
    if (symbol.asset_status === "unavailable" && !symbol.acquisition_note) {
      finding(
        "unavailable-without-note",
        id,
        "An acquisition that failed has to say why, or the next person repeats it.",
      );
    }
    if (/generat/i.test(symbol.acquisition_note ?? "")) {
      finding(
        "generated-artwork-claimed",
        id,
        "Civic symbols are never generated. Acquire the artwork from the issuing authority or record it as unavailable.",
      );
    }
  }

  return {
    valid: findings.every((entry) => entry.severity !== "error"),
    findings,
  };
}

export interface CivicSymbolSummary {
  readonly total: number;
  readonly jurisdictions: number;
  readonly acquired: number;
  readonly notAcquired: number;
  readonly unavailable: number;
  readonly byLevel: Readonly<Record<string, number>>;
}

export function summarizeCivicSymbols(
  symbols: readonly CivicSymbol[] = CIVIC_SYMBOLS.symbols,
): CivicSymbolSummary {
  const byLevel: Record<string, number> = {};
  for (const symbol of symbols) {
    byLevel[symbol.level] = (byLevel[symbol.level] ?? 0) + 1;
  }
  return {
    total: symbols.length,
    jurisdictions: new Set(symbols.map((symbol) => symbol.geography_id)).size,
    acquired: symbols.filter(
      (symbol) =>
        symbol.asset_status === "acquired-official" ||
        symbol.asset_status === "acquired-third-party",
    ).length,
    notAcquired: symbols.filter(
      (symbol) => symbol.asset_status === "not-acquired",
    ).length,
    unavailable: symbols.filter(
      (symbol) => symbol.asset_status === "unavailable",
    ).length,
    byLevel,
  };
}
