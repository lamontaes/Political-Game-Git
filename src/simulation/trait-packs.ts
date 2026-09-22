import { createPersonalityTendencyDefinition } from "./mind-catalog";
import type { MindStrength, PersonalityTendencyDefinition } from "./types";

/**
 * Traits as loaded data.
 *
 * A trait is a fictional behaviour tendency: a recurring pattern in how a
 * character tends to act. It is not a measurement of a real person, not
 * inferred from anybody's name or place, and never shown to the player as a
 * number. Nothing here changes that.
 *
 * What it changes is where a trait comes from. Five traits used to be a tuple
 * in this directory, and adding one meant editing a union, a shape record and
 * whatever switched on them. Here a trait is a row in a pack, an effect is a
 * row in a pack, and the game loads packs rather than importing traits. See
 * `docs/systems/traits.md` for the design and for what it deliberately does
 * not do.
 *
 * Two rules run through the whole file:
 *
 * Every reference resolves once, at load, against declarations that exist. A
 * lean naming a trait nothing declares, a decision this build does not have,
 * or an option a decision does not publish, is rejected here — not ignored at
 * play time, where a row that matches nothing is indistinguishable from a row
 * doing its job.
 *
 * A rejection names its row and its reason, and does not take the pack down
 * with it. A pack written for a later build says so; it does not crash.
 */

/** Where a trait may be read. Not where a record came from — see the doc. */
export type TraitScope = string;

export interface TraitPole {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

/**
 * How this pack's values round-trip through the mind store.
 *
 * The store holds an expression key and a `MindStrength`. Turning that into a
 * number is a property of the pack, not of the store: a pack may use two steps
 * or five, and symmetry is its business. A pack declares every strength it
 * uses, which is what makes a record carrying some other strength a rejection
 * rather than a silent coincidence — `defining` used to decode to the same
 * value as `strong` with nothing saying so.
 */
export interface TraitScale {
  /** The expression written when a trait is established with no lean. */
  readonly balancedKey: string;
  readonly balancedLabel: string;
  readonly balancedDescription: string;
  /** Magnitudes above zero, each with the strength that stores it. */
  readonly steps: readonly {
    readonly magnitude: number;
    readonly strength: MindStrength;
  }[];
}

/**
 * The strengths a record may carry, in order. Declared here because
 * `TraitMovability` names a resistance for each one and a pack that forgot a
 * strength has to be refused by name.
 */
export const MIND_STRENGTHS: readonly MindStrength[] = [
  "subtle",
  "moderate",
  "strong",
  "defining",
];

/** How a person comes to have this trait at all. */
export type TraitConferral = "seeded" | "conferred-only" | "player";

export interface TraitDeclaration {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly poles: { readonly low: TraitPole; readonly high: TraitPole };
  /** The decisions that may read it. A consumer outside these is refused. */
  readonly scopes: readonly TraitScope[];
  readonly conferredBy: TraitConferral;
  readonly scale: TraitScale;
  /**
   * The spread a seeded trait is drawn from, as magnitudes the scale declares,
   * signed. Required for `seeded` and refused for anything else, because a
   * trait nobody is born with has nothing to draw.
   */
  readonly seed: { readonly spread: readonly number[] } | null;
  /** How movable this kind of trait is at all. See `TraitMovability`. */
  readonly movability: TraitMovability;
  /**
   * Whether the trait has two ends or one. Two, when left out.
   *
   * A two-ended trait runs between opposites: patient and impatient. A
   * one-sided trait is a marked pattern and its absence: somebody is cocky, or
   * shows no marked cockiness, and the absence is not humility. Its low pole is
   * declared only so the store has an expression for it; it is never drawn,
   * never written as a lean and never read as one, because a negative value on
   * a one-sided trait would be an invented opposite.
   */
  readonly sides?: "one" | "two";
}

/** Whether a trait is a marked pattern and its absence rather than a scale. */
export function isOneSided(trait: TraitDeclaration): boolean {
  return trait.sides === "one";
}

/**
 * How movable a kind of trait is at all, which is the declaring pack's
 * judgement rather than the engine's. A pack adding a nearly immovable
 * disposition does it here, without touching code.
 *
 * Every number a change is weighed against lives in this shape. The engine
 * holds none of them, so a pack that wants a temperament which settles over a
 * lifetime and one that wants a manner which settles over a term are both
 * authored here rather than argued about in `trait-resistance.ts`.
 *
 * Resistance is otherwise read from the person's own record chain, so these
 * numbers say only what is true of the trait for everybody who has one.
 */
export interface TraitMovability {
  /**
   * What a settled value resists, per how strongly the person holds it.
   *
   * This is the shape the owner asked for: how hard somebody is to change
   * depends on how strongly the trait is theirs, and nothing else about them
   * is invented to say so. The strength is already on the record — it is what
   * the store writes to say whether a lean is subtle or defining — so a
   * strongly held value resists more than a faint one on the same day of the
   * same life, read from the record rather than from a hidden stubbornness
   * number. Every entry is at or above zero.
   */
  readonly settledByStrength: Readonly<Record<MindStrength, number>>;
  /** Years a freshly written value takes to settle fully. Above zero. */
  readonly settlesOver: number;
  /**
   * The share of its settled resistance a value carries the day it is written,
   * between zero and one.
   *
   * Above zero on purpose. A value that resisted nothing while it was fresh
   * would let a character swing back the week after they moved, and the old
   * guard against that — a permanent cost added for every move ever made —
   * was retired, because it made a person who had lived through things
   * progressively unreachable, which is the opposite of the owner's
   * requirement that everybody can change.
   */
  readonly unsettledFloor: number;
  /**
   * Days that must separate two experiences before the second one counts as a
   * second experience. Above zero.
   *
   * This is what makes repetition mean something rather than mean everything.
   * The same argument twice in an afternoon is one argument; the same argument
   * a season later is a second one.
   */
  readonly experienceSpacingDays: number;
  /**
   * The most that accumulated experience can ever add to a force. At or above
   * zero.
   *
   * Bounded on purpose, and it is the part that decides whether a player can
   * grind somebody down by repeating themselves. With a cap, a settled value
   * whose resistance is above the strongest single force plus this number
   * cannot be moved by persistence at all — only by something that argues
   * harder.
   */
  readonly pressureCap: number;
}

/** One way a trait bears on one option of one decision. */
export interface TraitLeanRow {
  readonly option: string;
  /** Qualified: `pack:key`. A bare key is rejected, because two packs may
   * both call something "reliability" and mean different things. */
  readonly trait: string;
  readonly pole: "low" | "high";
  readonly explanation: string;
  /**
   * Whose trait this is: the person deciding, or the person they are deciding
   * about. Defaults to the decider.
   *
   * `subject` is how a character is portrayed to other people. Somebody
   * weighing an ask from a person who has let plans slide before is reading
   * that person's temperament, not their own, and that reading is the only way
   * the played character's own traits ever reach anybody — the player's
   * temperament never decides anything for them, and this is not that. A
   * decision that names no subject simply drops these rows.
   */
  readonly about?: "actor" | "subject";
}

export interface TraitEffectDeclaration {
  readonly decision: string;
  readonly leans: readonly TraitLeanRow[];
}

export interface TraitPack {
  /** Also the namespace of every stable key this pack owns. */
  readonly pack: string;
  readonly traits: readonly TraitDeclaration[];
  readonly effects: readonly TraitEffectDeclaration[];
}

/**
 * A decision publishing itself.
 *
 * This is the one piece that stays code, and it is what makes a pack
 * authorable by somebody who cannot read the codebase: "what can a trait pack
 * affect" is this list, not a wiki page. A decision that does not declare
 * itself cannot be leaned on, which is the intended failure — a lean on an
 * unknown decision is rejected by name.
 */
export interface DecisionDeclaration {
  readonly id: string;
  readonly scope: TraitScope;
  /**
   * Every option key this decision offers. Where a trait's meaning depends on
   * the situation, the situation belongs here rather than in a lean; see
   * "Where a trait's meaning depends on the situation" in the doc.
   */
  readonly options: readonly string[];
}

/** A row that did not load, and why. Never thrown, always reported. */
export interface TraitLoadRejection {
  readonly pack: string;
  /** The row, as a reader of the pack file would find it. */
  readonly where: string;
  readonly reason: string;
}

/**
 * What a pack actually did, not merely that it parsed.
 *
 * `traitsRegistered` without any `consumedBy` is a pack that loaded and
 * affects nothing, which is a state worth being able to see: elsewhere in this
 * repository a request pipeline validated its input for weeks while sending it
 * precisely nowhere, and "it validated" was the claim that hid it.
 */
export interface TraitPackReport {
  readonly pack: string;
  readonly traitsRegistered: readonly string[];
  readonly leansRegistered: number;
  /** Per qualified trait key, the decisions that lean on it. */
  readonly consumedBy: Readonly<Record<string, readonly string[]>>;
  /** Registered and leaned on by nothing. Not an error; worth seeing. */
  readonly registeredButUnused: readonly string[];
}

export interface TraitLoadReport {
  readonly packs: readonly TraitPackReport[];
  readonly rejections: readonly TraitLoadRejection[];
}

export interface RegisteredTrait extends TraitDeclaration {
  readonly pack: string;
  /** `pack:key`, and the namespace of every record the trait ever writes. */
  readonly qualifiedKey: string;
}

export interface TraitRegistry {
  readonly traits: ReadonlyMap<string, RegisteredTrait>;
  readonly decisions: ReadonlyMap<string, DecisionDeclaration>;
  /** Leans that resolved, by decision id, in pack then row order. */
  readonly leans: ReadonlyMap<string, readonly TraitLeanRow[]>;
  readonly report: TraitLoadReport;
}

export function qualifiedTraitKey(pack: string, key: string): string {
  return `${pack}:${key}`;
}

/** The pack that owns a qualified key, or null when it is not one. */
export function packOfQualifiedKey(qualified: string): string | null {
  const colon = qualified.indexOf(":");
  return colon <= 0 || colon === qualified.length - 1
    ? null
    : qualified.slice(0, colon);
}

/** The strength that stores this magnitude, or null when undeclared. */
export function strengthForMagnitude(
  scale: TraitScale,
  magnitude: number,
): MindStrength | null {
  return (
    scale.steps.find((step) => step.magnitude === magnitude)?.strength ?? null
  );
}

/** The magnitude a stored strength decodes to, or null when undeclared. */
export function magnitudeForStrength(
  scale: TraitScale,
  strength: MindStrength,
): number | null {
  const steps = scale.steps.filter((step) => step.strength === strength);
  return steps.length === 1 ? steps[0]!.magnitude : null;
}

function checkTrait(trait: TraitDeclaration, seen: Set<string>): string | null {
  if (!trait.key.trim()) return "a trait has no key";
  if (trait.key.includes(":")) {
    return `trait key "${trait.key}" contains a colon, which separates a pack from its key`;
  }
  if (seen.has(trait.key)) return `trait "${trait.key}" is declared twice`;
  if (!trait.label.trim() || !trait.description.trim()) {
    return `trait "${trait.key}" needs a label and a description`;
  }
  for (const pole of [trait.poles.low, trait.poles.high]) {
    if (!pole.key.trim() || !pole.label.trim() || !pole.description.trim()) {
      return `trait "${trait.key}" has a pole missing its key, label or description`;
    }
  }
  if (
    !trait.scale.balancedKey.trim() ||
    !trait.scale.balancedLabel.trim() ||
    !trait.scale.balancedDescription.trim()
  ) {
    return `trait "${trait.key}" declares a balanced expression missing its key, label or description`;
  }
  if (trait.poles.low.key === trait.poles.high.key) {
    return `trait "${trait.key}" gives both poles the key "${trait.poles.low.key}"`;
  }
  if (
    trait.poles.low.key === trait.scale.balancedKey ||
    trait.poles.high.key === trait.scale.balancedKey
  ) {
    return `trait "${trait.key}" gives a pole the same key as its balanced expression`;
  }
  if (trait.scopes.length === 0) {
    return `trait "${trait.key}" declares no scope, so nothing could ever read it`;
  }
  if (trait.scale.steps.length === 0) {
    return `trait "${trait.key}" declares a scale with no steps`;
  }
  for (const step of trait.scale.steps) {
    if (!Number.isInteger(step.magnitude) || step.magnitude <= 0) {
      return `trait "${trait.key}" declares a scale step at magnitude ${step.magnitude}; steps are whole numbers above zero`;
    }
  }
  const magnitudes = trait.scale.steps.map((step) => step.magnitude);
  if (new Set(magnitudes).size !== magnitudes.length) {
    return `trait "${trait.key}" declares the same magnitude twice`;
  }
  const strengths = trait.scale.steps.map((step) => step.strength);
  if (new Set(strengths).size !== strengths.length) {
    // Two magnitudes storing one strength cannot be told apart on the way back.
    return `trait "${trait.key}" stores two magnitudes as the same strength, so a record could not be decoded`;
  }
  if (trait.conferredBy === "seeded") {
    if (!trait.seed || trait.seed.spread.length === 0) {
      return `trait "${trait.key}" is seeded but declares no spread to draw from`;
    }
    const allowed = new Set(magnitudes);
    for (const value of trait.seed.spread) {
      if (value < 0 && isOneSided(trait)) {
        return `trait "${trait.key}" is one-sided but seeds the value ${value}; a one-sided trait has no opposite to draw`;
      }
      if (value !== 0 && !allowed.has(Math.abs(value))) {
        return `trait "${trait.key}" seeds the value ${value}, which its scale does not declare`;
      }
    }
  } else if (trait.seed) {
    return `trait "${trait.key}" is ${trait.conferredBy} but declares a seed spread; only a seeded trait is drawn`;
  }
  const {
    settledByStrength,
    settlesOver,
    unsettledFloor,
    experienceSpacingDays,
    pressureCap,
  } = trait.movability;
  for (const strength of MIND_STRENGTHS) {
    const declared = settledByStrength[strength];
    if (!Number.isFinite(declared) || declared < 0) {
      return `trait "${trait.key}" declares a settled resistance of ${declared} for a ${strength} hold; every strength is a number at or above zero`;
    }
  }
  if (!Number.isFinite(settlesOver) || settlesOver <= 0) {
    return `trait "${trait.key}" declares that it settles over ${settlesOver} years; it is above zero`;
  }
  if (
    !Number.isFinite(unsettledFloor) ||
    unsettledFloor <= 0 ||
    unsettledFloor > 1
  ) {
    return `trait "${trait.key}" declares an unsettled floor of ${unsettledFloor}; it is above zero and at most one, because a value that resists nothing the week it is written swings straight back`;
  }
  if (!Number.isFinite(experienceSpacingDays) || experienceSpacingDays <= 0) {
    return `trait "${trait.key}" declares that experiences count ${experienceSpacingDays} days apart; it is above zero, because otherwise the same afternoon counts twice`;
  }
  if (!Number.isFinite(pressureCap) || pressureCap < 0) {
    return `trait "${trait.key}" declares a pressure cap of ${pressureCap}; it is a number at or above zero, because unbounded pressure means persistence alone eventually moves anybody`;
  }
  return null;
}

/**
 * Loads packs against the decisions this build declares.
 *
 * Never throws for content: a bad row is rejected by name and the rest of the
 * pack loads. It throws only for a caller error — two packs claiming one name,
 * or two decisions claiming one id — because those are this build's mistakes
 * rather than a pack author's.
 */
export function loadTraitPacks(
  packs: readonly TraitPack[],
  decisions: readonly DecisionDeclaration[],
): TraitRegistry {
  const decisionsById = new Map<string, DecisionDeclaration>();
  for (const decision of decisions) {
    if (decisionsById.has(decision.id)) {
      throw new Error(`Two decisions declare the id "${decision.id}".`);
    }
    decisionsById.set(decision.id, decision);
  }

  const traits = new Map<string, RegisteredTrait>();
  const leans = new Map<string, TraitLeanRow[]>();
  const rejections: TraitLoadRejection[] = [];
  const reports: TraitPackReport[] = [];
  const packNames = new Set<string>();

  for (const pack of packs) {
    if (!pack.pack.trim() || pack.pack.includes(":")) {
      throw new Error(
        `A pack name may not be empty or contain a colon: "${pack.pack}".`,
      );
    }
    if (packNames.has(pack.pack)) {
      throw new Error(`Two packs claim the name "${pack.pack}".`);
    }
    packNames.add(pack.pack);

    const registered: string[] = [];
    const consumedBy: Record<string, string[]> = {};
    const seenKeys = new Set<string>();

    for (const trait of pack.traits) {
      const problem = checkTrait(trait, seenKeys);
      if (problem) {
        rejections.push({
          pack: pack.pack,
          where: `trait "${trait.key}"`,
          reason: problem,
        });
        continue;
      }
      seenKeys.add(trait.key);
      const qualifiedKey = qualifiedTraitKey(pack.pack, trait.key);
      if (traits.has(qualifiedKey)) {
        rejections.push({
          pack: pack.pack,
          where: `trait "${trait.key}"`,
          reason: `another pack already registered ${qualifiedKey}`,
        });
        continue;
      }
      traits.set(qualifiedKey, { ...trait, pack: pack.pack, qualifiedKey });
      registered.push(qualifiedKey);
      consumedBy[qualifiedKey] = [];
    }

    reports.push({
      pack: pack.pack,
      traitsRegistered: registered,
      leansRegistered: 0,
      consumedBy,
      registeredButUnused: [],
    });
  }

  // Effects resolve after every pack's traits, so a pack may lean on a trait
  // another pack declares regardless of the order they were handed over in.
  for (const [index, pack] of packs.entries()) {
    const report = reports[index];
    if (!report) continue;
    let leansRegistered = 0;

    for (const effect of pack.effects) {
      const decision = decisionsById.get(effect.decision);
      if (!decision) {
        rejections.push({
          pack: pack.pack,
          where: `effect on "${effect.decision}"`,
          // The forward-compatibility case: a pack for a later build.
          reason: `no decision "${effect.decision}" is declared in this build`,
        });
        continue;
      }
      const options = new Set(decision.options);
      const resolved = leans.get(effect.decision) ?? [];
      for (const [row, lean] of effect.leans.entries()) {
        const where = `effect on "${effect.decision}", lean ${row + 1} (${lean.trait} → ${lean.option})`;
        const trait = traits.get(lean.trait);
        if (!trait) {
          rejections.push({
            pack: pack.pack,
            where,
            reason:
              packOfQualifiedKey(lean.trait) === null
                ? `"${lean.trait}" is not a qualified trait key; write it as pack:key`
                : `no pack declares the trait "${lean.trait}"`,
          });
          continue;
        }
        if (!options.has(lean.option)) {
          rejections.push({
            pack: pack.pack,
            where,
            // A well-formed key matching nothing is the failure a shape check
            // passes. It is caught here or never.
            reason: `"${effect.decision}" does not offer the option "${lean.option}"`,
          });
          continue;
        }
        if (!trait.scopes.includes(decision.scope)) {
          rejections.push({
            pack: pack.pack,
            where,
            reason: `"${lean.trait}" may be read in ${trait.scopes.join(", ")}, and "${effect.decision}" is ${decision.scope}`,
          });
          continue;
        }
        if (!lean.explanation.trim()) {
          rejections.push({
            pack: pack.pack,
            where,
            reason: "a lean must say why, because it is shown as a reason",
          });
          continue;
        }
        resolved.push(lean);
        leansRegistered += 1;
        const owner = reports.find(
          (candidate) => candidate.pack === trait.pack,
        );
        const owned = owner?.consumedBy as Record<string, string[]> | undefined;
        const list = owned?.[lean.trait];
        if (list && !list.includes(effect.decision)) list.push(effect.decision);
      }
      leans.set(effect.decision, resolved);
    }
    reports[index] = { ...report, leansRegistered };
  }

  for (const [index, report] of reports.entries()) {
    reports[index] = {
      ...report,
      registeredButUnused: report.traitsRegistered.filter(
        (key) => (report.consumedBy[key] ?? []).length === 0,
      ),
    };
  }

  return {
    traits,
    decisions: decisionsById,
    leans: new Map(
      [...leans].map(([id, rows]) => [id, rows as readonly TraitLeanRow[]]),
    ),
    report: { packs: reports, rejections },
  };
}

/** The resolved leans for one decision, or none. Pure. */
export function leansForDecision(
  registry: TraitRegistry,
  decisionId: string,
): readonly TraitLeanRow[] {
  return registry.leans.get(decisionId) ?? [];
}

/** A report a person can read, for the load log and for a failing test. */
export function describeTraitLoad(report: TraitLoadReport): string {
  const lines: string[] = [];
  for (const pack of report.packs) {
    lines.push(
      `${pack.pack}: ${pack.traitsRegistered.length} trait(s), ${pack.leansRegistered} lean(s) registered`,
    );
    for (const key of pack.traitsRegistered) {
      const consumers = pack.consumedBy[key] ?? [];
      lines.push(
        consumers.length === 0
          ? `  ${key} — registered, read by nothing`
          : `  ${key} — read by ${consumers.join(", ")}`,
      );
    }
  }
  for (const rejection of report.rejections) {
    lines.push(
      `REJECTED ${rejection.pack} ${rejection.where}: ${rejection.reason}`,
    );
  }
  return lines.join("\n");
}

/**
 * The catalog definition a pack declares for one trait.
 *
 * This is the whole of the reshaped content check. The old
 * `assertLifeMindContent` asked whether a definition was one of the built-ins;
 * it now asks whether a definition matches what the pack owning its stable key
 * declares. Same tamper guarantee — a save cannot redefine what a stored
 * expression means — while admitting any trait any loaded pack declares.
 *
 * The expression order is low, balanced, high, and the stable key is the
 * qualified key, because that is what every record written so far already
 * carries. `people-trait-pack.test.ts` holds that byte-identity to the
 * definitions this replaces; it is the reason no save needs converting.
 */
export function traitDefinitionFromPack(
  trait: RegisteredTrait,
): PersonalityTendencyDefinition {
  return createPersonalityTendencyDefinition(
    trait.qualifiedKey,
    trait.label,
    trait.description,
    [
      {
        key: trait.poles.low.key,
        label: trait.poles.low.label,
        description: trait.poles.low.description,
      },
      {
        key: trait.scale.balancedKey,
        label: trait.scale.balancedLabel,
        description: trait.scale.balancedDescription,
      },
      {
        key: trait.poles.high.key,
        label: trait.poles.high.label,
        description: trait.poles.high.description,
      },
    ],
  );
}

/** Every definition the loaded packs declare, in pack then declaration order. */
export function traitDefinitions(
  registry: TraitRegistry,
): readonly PersonalityTendencyDefinition[] {
  return [...registry.traits.values()].map(traitDefinitionFromPack);
}
