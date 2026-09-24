import type {
  ExecutiveSuccessionEffect,
  ExecutiveSuccessionLine,
  ExecutiveSuccessionWorldRule,
  ExecutiveSuccessionWorldRuleStore,
  IsoDate,
} from "../types";
import { makeIsoDate } from "../dates";
import { SeededRng } from "../rng";
import {
  EXECUTIVE_SUCCESSION_PROFILES,
  type SuccessionRule,
} from "./executive-succession-profiles";

export const EXECUTIVE_SUCCESSION_GAME_PROFILE = {
  id: "ocd-executive-succession-game-profile/v1",
  handoffDays: { min: 45, max: 120 },
} as const;

const LINE_BY_TITLE: Readonly<Record<string, ExecutiveSuccessionLine>> = {
  "lieutenant governor": "lieutenant-governor",
  "president of the senate": "senate-president",
  "president pro tempore of the senate": "senate-president",
  "speaker of the senate": "senate-president",
  "senate president": "senate-president",
  "secretary of state": "secretary-of-state",
};

function lineForTitle(title: string): ExecutiveSuccessionLine | null {
  const normalized = title
    .trim()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return LINE_BY_TITLE[normalized] ?? null;
}

/** Only conditions explicitly satisfied by the death-vacancy writer use law. */
function conditionFitsDeathVacancy(condition: string | undefined): boolean {
  if (!condition) return true;
  const normalized = condition.trim().toLowerCase();
  return (
    normalized.startsWith("first line only; deeper fallback") ||
    normalized.startsWith("permanent vacancy") ||
    normalized.startsWith("single governor vacancy") ||
    normalized.startsWith("ordinary governor vacancy") ||
    (normalized.startsWith("death,") && normalized.includes("vacancy"))
  );
}

function sourceFirstStep(rule: SuccessionRule): {
  readonly line: ExecutiveSuccessionLine;
  readonly office: string;
  readonly effect: ExecutiveSuccessionEffect;
} | null {
  if (rule.status !== "verified") return null;
  const step = rule.steps[0];
  if (!step || !conditionFitsDeathVacancy(step.condition)) return null;
  const line = lineForTitle(step.office);
  const effect =
    step.disposition === "acts"
      ? "acting"
      : step.disposition === "succeeds"
        ? "permanent"
        : null;
  return line && effect ? { line, office: step.office, effect } : null;
}

function displayOffice(line: ExecutiveSuccessionLine): string {
  switch (line) {
    case "lieutenant-governor":
      return "Lieutenant Governor";
    case "senate-president":
      return "President of the State Senate";
    case "secretary-of-state":
      return "Secretary of State";
  }
}

function sourceOf(rule: SuccessionRule) {
  return rule.status === "verified" ? rule.source : null;
}

/**
 * Makes an explicit, seed-stable opening choice for every jurisdiction in the
 * admitted identity set. Sourced first-line law is used only when its condition
 * matches this death-vacancy route; otherwise the active rule is a disclosed
 * representative game profile and the source stays context only.
 */
export function createExecutiveSuccessionWorldRuleStore(
  seed: string,
  selectedAt: IsoDate,
): ExecutiveSuccessionWorldRuleStore {
  const rules: Record<string, ExecutiveSuccessionWorldRule> = {};
  for (const jurisdictionKey of Object.keys(
    EXECUTIVE_SUCCESSION_PROFILES,
  ).sort()) {
    const profile = EXECUTIVE_SUCCESSION_PROFILES[jurisdictionKey]!;
    const rng = new SeededRng(seed).fork(
      `${EXECUTIVE_SUCCESSION_GAME_PROFILE.id}:${jurisdictionKey}`,
    );
    const source = sourceFirstStep(profile.permanentVacancy);
    const lines: readonly ExecutiveSuccessionLine[] = [
      "lieutenant-governor",
      "senate-president",
      "secretary-of-state",
    ];
    const sourceOrder =
      profile.permanentVacancy.status === "verified"
        ? profile.permanentVacancy.afterOrder
        : undefined;
    const handoff = sourceOrder ? "special-election" : "regular-election";
    const sourceEffect = source?.effect;
    // A source saying someone "succeeds" while also requiring a special
    // election describes a temporary route for this bounded runtime. The
    // active simulated capacity is explicitly an acting game-profile rule.
    const effect =
      handoff === "special-election"
        ? "acting"
        : (sourceEffect ?? (rng.integer(0, 1) === 0 ? "acting" : "permanent"));
    const line = source
      ? source.line
      : lines[rng.integer(0, lines.length - 1)]!;
    const lineEffectBasis =
      source && !(handoff === "special-election" && source.effect !== "acting")
        ? "source-backed"
        : "game-profile";
    rules[profile.usps] = {
      stateUsps: profile.usps,
      line,
      lineOffice:
        lineEffectBasis === "source-backed" && source
          ? source.office
          : displayOffice(line),
      effect,
      duration: effect === "acting" ? "until-successor-takes-office" : null,
      handoff,
      handoffDelayDays:
        handoff === "special-election"
          ? rng.integer(
              EXECUTIVE_SUCCESSION_GAME_PROFILE.handoffDays.min,
              EXECUTIVE_SUCCESSION_GAME_PROFILE.handoffDays.max,
            )
          : null,
      lineEffectBasis,
      durationBasis: effect === "acting" ? "game-profile" : lineEffectBasis,
      handoffBasis: "game-profile",
      gameProfileId: EXECUTIVE_SUCCESSION_GAME_PROFILE.id,
      source: sourceOf(profile.permanentVacancy),
    };
  }
  return {
    version: "executive-succession-world-rules/v1",
    selectedAt,
    rules,
  };
}

export function assertExecutiveSuccessionWorldRuleStore(
  store: ExecutiveSuccessionWorldRuleStore,
): void {
  if (store.version !== "executive-succession-world-rules/v1")
    throw new Error("Unsupported executive succession world-rule version.");
  makeIsoDate(store.selectedAt);
  const expected = Object.keys(EXECUTIVE_SUCCESSION_PROFILES).sort();
  const actual = Object.keys(store.rules)
    .map((usps) => `US-${usps}`)
    .sort();
  if (
    expected.length !== actual.length ||
    expected.some((key, index) => key !== actual[index])
  )
    throw new Error(
      "Executive succession world rules must cover the opening jurisdiction set.",
    );
  for (const [usps, rule] of Object.entries(store.rules)) {
    if (
      rule.stateUsps !== usps ||
      rule.gameProfileId !== EXECUTIVE_SUCCESSION_GAME_PROFILE.id
    )
      throw new Error(
        `Executive succession world rule has an invalid identity: ${usps}`,
      );
    if (
      (rule.effect === "acting" && rule.duration === null) ||
      (rule.effect === "permanent" && rule.duration !== null)
    )
      throw new Error(
        `Executive succession duration does not match its effect: ${usps}`,
      );
    if (
      rule.handoff === "special-election"
        ? !Number.isSafeInteger(rule.handoffDelayDays) ||
          rule.handoffDelayDays! < 1 ||
          rule.handoffDelayDays! > 365
        : rule.handoffDelayDays !== null
    )
      throw new Error(`Executive succession handoff date is invalid: ${usps}`);
    if (rule.lineEffectBasis === "source-backed" && !rule.source)
      throw new Error(
        `Source-backed succession rule is missing its source: ${usps}`,
      );
    if (
      rule.source &&
      (!rule.source.citation ||
        !rule.source.url ||
        !rule.source.pinpoint ||
        !rule.source.effectiveAsOf)
    )
      throw new Error(`Executive succession source is incomplete: ${usps}`);
  }
}
