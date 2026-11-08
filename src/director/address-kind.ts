/**
 * The kind of address a speaker gives (owner, Nov 8: "It's still very
 * robotic... it's always good news. It's never bad news... Sometimes you
 * could have a Jimmy Carter, a crisis of confidence kind of thing. Sometimes
 * it could just be a hopeful speech, or it could be like Trump just railing
 * on people... it needs to work off of effects or in-laws and people around
 * them and their temperament and their personality"). The kind is picked
 * from the world's records and the speaker's recorded traits: the term read
 * by area (src/core2/term-read.ts), the economy's year, a recent disaster
 * and the speaker's open priorities. Each kind's score is what the world
 * gives it to say times one plus the speaker's pull toward it; the highest
 * score wins and a tie goes to the name first in the alphabet. No roll
 * picks it. It holds no sentence: the English engine's bank writes the
 * address in the chosen kind's manner.
 */
import type { CoreState, PersonState } from "../core2/types";
import type { AreaRead } from "../core2/term-read";
import kindData from "./data/address-kinds.json" with { type: "json" };

export const ADDRESS_KINDS = [
  "combative",
  "crisis",
  "hopeful",
  "mourning",
  "policy",
  "victory",
] as const;
export type AddressKind = (typeof ADDRESS_KINDS)[number];

interface KindData {
  kinds: Readonly<Record<AddressKind, { pull: readonly string[] }>>;
  parameters: Record<
    | "worstAreaShare"
    | "hopefulBase"
    | "hopefulGoodShare"
    | "policyBase"
    | "griefDays",
    { value: number }
  >;
}
const DATA = kindData as unknown as KindData;
const PAR = DATA.parameters;

/** What the world gives an address to say, each between 0 and 1 except the year's slide. */
export interface AddressSituation {
  /** The year in the macro engine's measures and the areas the web reads, between -1 and 1. */
  readonly slide: number;
  /** The worst single area's slide, between -1 and 0 (0 when no area is worse than flat). */
  readonly worstArea: number;
  /** A recent disaster's severity, falling to nothing as the days pass. */
  readonly grief: number;
  /** The disaster's news event the grief came from, when there is one. */
  readonly griefId?: string;
  /** How many of the speaker's open priorities the address may lead with, as a share of its limit. */
  readonly workShare: number;
}

export interface KindScore {
  readonly kind: AddressKind;
  readonly score: number;
}

/** The mean of a speaker's recorded values on a kind's facets, between -1 and 1. */
function pullOf(speaker: PersonState, kind: AddressKind): number {
  const facets = DATA.kinds[kind].pull;
  const sum = facets.reduce(
    (total, key) => total + (speaker.traits[key] ?? 0),
    0,
  );
  return Math.max(-1, Math.min(1, sum / facets.length));
}

/**
 * Read the situation the address is given in: the year's macro slide (the
 * claims the director already holds), the areas of the term and a disaster.
 */
export function addressSituation(
  core: Readonly<CoreState>,
  input: {
    /** The macro year: measures better minus measures worse, over both, from -1 to 1. */
    readonly macroSlide: number;
    readonly areas: readonly AreaRead[];
    readonly priorities: number;
    readonly prioritiesMax: number;
  },
): AddressSituation {
  const slides = [input.macroSlide, ...input.areas.map((read) => read.slide)];
  const slide = slides.reduce((sum, row) => sum + row, 0) / slides.length;
  const worstArea = Math.min(0, ...input.areas.map((read) => read.slide));
  const grief = griefOf(core);
  return {
    slide,
    worstArea,
    grief: grief.value,
    ...(grief.id ? { griefId: grief.id } : {}),
    workShare: Math.min(1, input.priorities / Math.max(1, input.prioritiesMax)),
  };
}

/** The strongest recent disaster's severity, weighted down a straight line over the grief days. */
function griefOf(core: Readonly<CoreState>): {
  value: number;
  id?: string;
} {
  const today = Date.parse(core.date);
  let grief = 0,
    griefId: string | undefined;
  for (const id of core.logByKind.get("hazard.disaster") ?? []) {
    const event = core.durableLog.get(id);
    const severity = Number(event?.facts?.severity);
    if (!event || !Number.isFinite(severity)) continue;
    const age = (today - Date.parse(event.date)) / 86_400_000;
    const weight = Math.max(0, 1 - age / PAR.griefDays.value);
    if (severity * weight > grief) {
      grief = severity * weight;
      griefId = event.id;
    }
  }
  return { value: grief, ...(griefId ? { id: griefId } : {}) };
}

/** Every kind's score for this speaker in this situation, highest first. */
export function scoreKinds(
  speaker: PersonState,
  situation: AddressSituation,
  /** Kinds this occasion cannot take: a President sworn in today takes no lap for a record they did not make. */
  excluding: readonly AddressKind[] = [],
): KindScore[] {
  const need = Math.max(0, -situation.slide);
  const good = Math.max(0, situation.slide);
  const hurt = Math.min(
    1,
    need + PAR.worstAreaShare.value * Math.max(0, -situation.worstArea),
  );
  const world: Readonly<Record<AddressKind, number>> = {
    crisis: hurt,
    combative: hurt,
    hopeful:
      (PAR.hopefulBase.value * (1 - good) + PAR.hopefulGoodShare.value * good) *
      (1 - hurt),
    victory: good,
    mourning: situation.grief,
    policy: PAR.policyBase.value * situation.workShare,
  };
  return ADDRESS_KINDS.filter((kind) => !excluding.includes(kind))
    .map((kind) => ({
      kind,
      score: world[kind] * (1 + pullOf(speaker, kind)),
    }))
    .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind));
}

/** The kind of address this speaker gives in this situation. */
export function chooseAddressKind(
  speaker: PersonState,
  situation: AddressSituation,
  excluding: readonly AddressKind[] = [],
): AddressKind {
  return scoreKinds(speaker, situation, excluding)[0]!.kind;
}
