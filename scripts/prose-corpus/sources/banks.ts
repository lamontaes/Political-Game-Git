import { adultSituationBank } from "../../../src/simulation/adult-situations";
import { lifeSituationCatalog } from "../../../src/simulation/character-history";
import {
  ALL_AUTHORED_SETUP_ITEMS,
  SETUP_QUESTIONNAIRE_BANK,
  WITHDRAWN_SETUP_ITEMS,
} from "../../../src/simulation/setup-questionnaire-bank";
import { ORDINARY_LIFE_WORK_ITEMS } from "../../../src/presentation/ordinary-life";
import { contextRevisionOf, revisionOf } from "../anchors";
import { proseId, templateSlots } from "../ids";
import type { ProseGroundingRef, ProseRecord, ProseSurface } from "../types";

/**
 * The banks that declare their prose as data with a stable key of their own.
 *
 * Each adapter reads the same array the running game selects from, so the
 * reviewed bank and the played bank cannot drift. Where a bank declares
 * nothing about a dimension, the record says so with the bank's reason rather
 * than filling it in.
 */

function make(input: {
  readonly domain: ProseRecord["domain"];
  readonly bank: string;
  readonly stableKey: string;
  readonly field: string;
  readonly surface: ProseSurface;
  readonly text: string;
  readonly sourcePath: string;
  readonly sourceSymbol: string;
  readonly reachability: ProseRecord["reachability"];
  readonly reachabilityReason: string;
  readonly grounding: readonly ProseGroundingRef[];
  readonly provenance?: Readonly<Record<string, string>> | null;
  readonly tags?: readonly string[];
}): ProseRecord {
  const slots = templateSlots(input.text);
  return {
    id: proseId({
      domain: input.domain,
      bank: input.bank,
      stableKey: input.stableKey,
      field: input.field,
    }),
    domain: input.domain,
    bank: input.bank,
    stableKey: input.stableKey,
    field: input.field,
    surface: input.surface,
    sourcePath: input.sourcePath,
    sourceSymbol: input.sourceSymbol,
    text: input.text,
    realization: slots.length > 0 ? "templated" : "static",
    slots,
    reachability: input.reachability,
    reachabilityReason: input.reachabilityReason,
    grounding: input.grounding,
    provenance: input.provenance ?? null,
    tags: input.tags ?? [],
    textRevision: revisionOf(input.text),
    contextRevision: contextRevisionOf(input.grounding),
  };
}

/* -------------------------------------------------------------------------- */
/* Formative childhood and adolescent situations                               */
/* -------------------------------------------------------------------------- */

const FORMATIVE_MODULE = "src/simulation/character-history.ts";

export function formativeProseRecords(): readonly ProseRecord[] {
  const records: ProseRecord[] = [];
  for (const situation of lifeSituationCatalog()) {
    const grounding: ProseGroundingRef[] = [
      {
        key: `band:${situation.band}`,
        description: `The character is in the ${situation.band} band.`,
        kind: "eligibility",
      },
    ];
    if (situation.needsCompanion) {
      grounding.push({
        key: "role:companion",
        description:
          "A canonical other person is in the scene; the situation is withheld without one.",
        kind: "role",
      });
    }
    const common = {
      domain: "life" as const,
      bank: "formative",
      stableKey: situation.key,
      sourcePath: FORMATIVE_MODULE,
      sourceSymbol: `lifeSituationCatalog/${situation.key}`,
      reachability: "PLAYER_REACHABLE" as const,
      reachabilityReason:
        "The formative catalog offers this situation to a character in its band.",
      grounding,
      tags: [`band:${situation.band}`],
    };
    records.push(
      make({
        ...common,
        field: "prose",
        surface: "scene-line",
        text: situation.prose,
      }),
    );
    for (const option of situation.options) {
      records.push(
        make({
          ...common,
          field: `option:${option.key}:label`,
          surface: "option-label",
          text: option.label,
        }),
        make({
          ...common,
          field: `option:${option.key}:description`,
          surface: "option-description",
          text: option.description,
        }),
        make({
          ...common,
          field: `option:${option.key}:memory`,
          surface: "option-memory",
          text: option.memory,
        }),
      );
      if (option.witnessed) {
        records.push(
          make({
            ...common,
            field: `option:${option.key}:witnessed`,
            surface: "option-witnessed",
            text: option.witnessed,
          }),
        );
      }
    }
  }
  return records;
}

/* -------------------------------------------------------------------------- */
/* Adult situations                                                            */
/* -------------------------------------------------------------------------- */

const ADULT_MODULE = "src/simulation/adult-situations.ts";

export function adultProseRecords(): readonly ProseRecord[] {
  const records: ProseRecord[] = [];
  for (const situation of adultSituationBank()) {
    const grounding: ProseGroundingRef[] = [
      {
        key: "available",
        description:
          "The situation declares an `available` predicate over world state; the corpus reports the gate exists without evaluating it.",
        kind: "requirement",
      },
    ];
    if (situation.companion !== null) {
      grounding.push({
        key: `role:${situation.companion}`,
        description: `A canonical ${situation.companion} is bound before the scene composes.`,
        kind: "role",
      });
    }
    // Withholding is read, never inferred: a situation that declares its own
    // `withheld` reason is reported with that exact reason, the same way the
    // episode banks are.
    if (situation.withheld !== undefined) {
      grounding.push({
        key: "withheld",
        description: situation.withheld,
        kind: "withheld",
      });
    }
    const common = {
      domain: "life" as const,
      bank: "adult",
      stableKey: situation.key,
      sourcePath: ADULT_MODULE,
      sourceSymbol: `adultSituationBank/${situation.key}`,
      reachability:
        situation.withheld !== undefined
          ? ("WITHHELD_BY_GROUNDING" as const)
          : ("PLAYER_REACHABLE" as const),
      reachabilityReason:
        situation.withheld ??
        "The adult bank offers this situation when its availability predicate holds.",
      grounding,
      tags: [
        `stakes:${situation.stakes}`,
        `companion:${situation.companion ?? "none"}`,
      ],
    };
    records.push(
      make({
        ...common,
        field: "prose",
        surface: "scene-line",
        text: situation.prose,
      }),
    );
    for (const option of situation.options) {
      records.push(
        make({
          ...common,
          field: `option:${option.key}:label`,
          surface: "option-label",
          text: option.label,
        }),
        make({
          ...common,
          field: `option:${option.key}:description`,
          surface: "option-description",
          text: option.description,
        }),
        make({
          ...common,
          field: `option:${option.key}:memory`,
          surface: "option-memory",
          text: option.memory,
        }),
      );
      if (option.witnessed) {
        records.push(
          make({
            ...common,
            field: `option:${option.key}:witnessed`,
            surface: "option-witnessed",
            text: option.witnessed,
          }),
        );
      }
    }
  }
  return records;
}

/* -------------------------------------------------------------------------- */
/* Setup calibration                                                           */
/* -------------------------------------------------------------------------- */

const SETUP_MODULE = "src/simulation/setup-questionnaire-bank.ts";

export function setupProseRecords(): readonly ProseRecord[] {
  const selectable = new Set(SETUP_QUESTIONNAIRE_BANK.map((item) => item.key));
  const withdrawn = new Set(WITHDRAWN_SETUP_ITEMS.map((item) => item.key));
  const seen = new Set<string>();
  const records: ProseRecord[] = [];
  for (const item of [
    ...SETUP_QUESTIONNAIRE_BANK,
    ...ALL_AUTHORED_SETUP_ITEMS,
  ]) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    const isSelectable = selectable.has(item.key);
    const reachability = isSelectable
      ? ("PLAYER_REACHABLE" as const)
      : withdrawn.has(item.key)
        ? ("LEGACY_OR_WITHDRAWN" as const)
        : ("CURRENTLY_UNREACHABLE" as const);
    const reachabilityReason = isSelectable
      ? "The item is in SETUP_QUESTIONNAIRE_BANK, which selection reads."
      : withdrawn.has(item.key)
        ? "Withdrawn from selection and kept only so existing saves naming it stay readable."
        : "Authored but absent from the selectable bank.";
    const common = {
      domain: "setup" as const,
      bank: "questionnaire",
      stableKey: item.key,
      sourcePath: SETUP_MODULE,
      sourceSymbol: `SETUP_QUESTIONNAIRE_BANK/${item.key}`,
      reachability,
      reachabilityReason,
      grounding: [
        {
          key: `bands:${item.eligibility.bands.join("+") || "none"}`,
          description: `Offered in the ${item.eligibility.bands.join(", ") || "no"} band(s).`,
          kind: "eligibility" as const,
        },
      ],
      provenance: {
        sourceDocument: item.source.sourceDocument,
        reference: item.source.reference,
        register: item.register,
        reviewVerdict: String(item.review.verdict),
      },
      tags: [
        `register:${item.register}`,
        ...item.eligibility.bands.map((band) => `band:${band}`),
      ],
    };
    records.push(
      make({
        ...common,
        field: "prompt",
        surface: "prompt",
        text: item.prompt,
      }),
    );
    for (const option of item.options) {
      records.push(
        make({
          ...common,
          field: `option:${option.key}:text`,
          surface: "answer",
          text: option.text,
        }),
      );
    }
  }
  return records;
}

/* -------------------------------------------------------------------------- */
/* Ordinary life                                                               */
/* -------------------------------------------------------------------------- */

export function ordinaryProseRecords(): readonly ProseRecord[] {
  const records: ProseRecord[] = [];
  for (const item of ORDINARY_LIFE_WORK_ITEMS) {
    const common = {
      domain: "ordinary" as const,
      bank: "work-item",
      stableKey: item.key,
      sourcePath: "src/presentation/ordinary-life.ts",
      sourceSymbol: `ORDINARY_LIFE_WORK_ITEMS/${item.key}`,
      reachability: "PLAYER_REACHABLE" as const,
      reachabilityReason:
        "An ordinary day lists this pending thing when the world holds it open.",
      grounding: [
        {
          key: "ordinary-day",
          description:
            "The item is offered from an open ordinary-life day; the bank declares no further fact requirement.",
          kind: "undeclared" as const,
        },
      ],
    };
    records.push(
      make({ ...common, field: "title", surface: "status", text: item.title }),
      make({
        ...common,
        field: "summary",
        surface: "status",
        text: item.summary,
      }),
    );
  }
  return records;
}
