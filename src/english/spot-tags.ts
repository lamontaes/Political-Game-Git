/**
 * Who says a scene line, to whom and where, read from the director's own
 * records (words machine, part 2: a line judged in its spot).
 *
 * A scene-talk use names its `purpose` and its `role` (asker or asked). The
 * situation types that play that purpose (`src/director/data/situation-types.json`,
 * and the arc variants of a family through `arc-variants.json`) say who fills
 * each role and where the scene is set. `spotTags` turns that into tags on the
 * use, so a rule's `applies.uses` can name the speaker, the listener or the
 * setting, and a reviewer's sheet shows them:
 *
 *   situation     the situation types that play the purpose
 *   speaker       the role key of whoever says the line (`you` is the player)
 *   speakerFill   how the director fills that role (household, press, members...)
 *   listener      the role key of whoever hears it
 *   listenerFill  how the director fills that role
 *   setting       where the scene can be set (the type's and its causes')
 *   stakes        the record facts the exchange turns on
 *   tie           how the two people stand, in the conversation engine's
 *                 own fact names (`stranger`, `acquainted`, `kin`) plus
 *                 `household`: the tie facts the use requires (or is only true when), and `household`
 *                 or `kin` where the director fills a side from the household
 *                 or the kin (`src/director/sitting-ties.ts`,
 *                 `src/director/purpose-scene.ts`); absent where the tie is
 *                 only known when the scene is cast
 *
 * Where a type says the player asks (`playerAsks`), the asker's moves are the
 * player's and the replies are the one asked's (`src/director/scene-talk.ts`,
 * "where the player asks, the replies are the answers of the one asked and
 * the asker move the player's"), so the roles swap. A purpose several types
 * play gives each tag as a list; a rule matches any entry. A use whose
 * purpose no type plays gets no tags. None of these is a spot field, so the
 * pickers' alternatives (`spotsOf`) are unchanged.
 *
 * Pure: reads the director's casting records (`situation-casting.ts`), no world.
 */
import {
  ARC_VARIANT_FAMILIES,
  SITUATION_TYPES,
} from "../director/situation-casting";

interface TypeRole {
  readonly key: string;
  readonly fill?: string;
}

interface SituationType {
  readonly key: string;
  readonly purpose?: string;
  readonly asker?: string;
  readonly asked?: string;
  readonly roles?: readonly TypeRole[];
  readonly setting?: readonly string[];
  readonly stakes?: readonly string[];
  readonly playerAsks?: boolean;
  readonly causes?: readonly { readonly setting?: readonly string[] }[];
}

interface VariantsFile {
  readonly families?: Readonly<
    Record<
      string,
      { readonly variants?: Readonly<Record<string, { purpose?: string }>> }
    >
  >;
}

/** The tag names `spotTags` writes, in the order a sheet shows them. */
export const SPOT_TAGS = [
  "situation",
  "speaker",
  "speakerFill",
  "listener",
  "listenerFill",
  "setting",
  "stakes",
  "tie",
] as const;

/** The tie facts the director gives a talk (`sitting-ties.ts`, `purpose-scene.ts`). */
const TIE_FACTS = new Set(["stranger", "acquainted", "kin"]);

/** Role fills that fix the tie: the director casts them from these people. */
const FILL_TIES: Readonly<Record<string, string>> = {
  household: "household",
  "household-stake": "household",
  kin: "kin",
  "kin-visiting": "kin",
};

export type SpotTag = (typeof SPOT_TAGS)[number];

/** The situation types by the purpose they play, a variant's purpose by its family's. */
export function typesByPurpose(
  types: readonly SituationType[],
  variants: VariantsFile,
): ReadonlyMap<string, readonly SituationType[]> {
  const byPurpose = new Map<string, SituationType[]>();
  for (const type of types)
    if (type.purpose) {
      const list = byPurpose.get(type.purpose) ?? [];
      list.push(type);
      byPurpose.set(type.purpose, list);
    }
  for (const [family, entry] of Object.entries(variants.families ?? {}))
    for (const variant of Object.values(entry.variants ?? {})) {
      const purpose = variant.purpose;
      if (!purpose || byPurpose.has(purpose)) continue;
      const played = byPurpose.get(family);
      if (played) byPurpose.set(purpose, played);
    }
  return byPurpose;
}

const unique = (values: readonly (string | undefined)[]): string[] => [
  ...new Set(values.filter((value): value is string => !!value)),
];

/**
 * The spot tags of one use, from the types that play its purpose. A use with
 * no purpose, or one no type plays, gets none. The speaker and listener are
 * named only for the asker and asked roles; another role (a narrator, a
 * guest) gets the situation, setting and stakes only.
 */
export function spotTagsOf(
  use: Readonly<Record<string, unknown>>,
  byPurpose: ReadonlyMap<string, readonly SituationType[]>,
): Partial<Record<SpotTag, readonly string[]>> {
  const purpose = typeof use.purpose === "string" ? use.purpose : "";
  const required = [use.requiresFacts, use.onlyWhen]
    .flatMap((list) => (Array.isArray(list) ? (list as unknown[]) : []))
    .filter(
      (fact): fact is string => typeof fact === "string" && TIE_FACTS.has(fact),
    );
  const types = byPurpose.get(purpose);
  if (!types?.length) return required.length ? { tie: unique(required) } : {};
  const role = use.role;
  const speakers: (string | undefined)[] = [];
  const listeners: (string | undefined)[] = [];
  const speakerFills: (string | undefined)[] = [];
  const listenerFills: (string | undefined)[] = [];
  const ties: (string | undefined)[] = [...required];
  for (const type of types) {
    const asker = type.playerAsks ? type.asked : type.asker;
    const asked = type.playerAsks ? type.asker : type.asked;
    const [speaker, listener] =
      role === "asker"
        ? [asker, asked]
        : role === "asked"
          ? [asked, asker]
          : [undefined, undefined];
    const fill = (key: string | undefined) =>
      type.roles?.find((row) => row.key === key)?.fill;
    for (const row of type.roles ?? [])
      if (row.key === type.asker || row.key === type.asked)
        ties.push(FILL_TIES[row.fill ?? ""]);
    speakers.push(speaker);
    listeners.push(listener);
    speakerFills.push(fill(speaker));
    listenerFills.push(fill(listener));
  }
  const tags: Partial<Record<SpotTag, readonly string[]>> = {
    situation: unique(types.map((type) => type.key)),
    setting: unique(
      types.flatMap((type) => [
        ...(type.setting ?? []),
        ...(type.causes ?? []).flatMap((cause) => cause.setting ?? []),
      ]),
    ),
    stakes: unique(types.flatMap((type) => type.stakes ?? [])),
  };
  const named: [SpotTag, (string | undefined)[]][] = [
    ["speaker", speakers],
    ["speakerFill", speakerFills],
    ["listener", listeners],
    ["listenerFill", listenerFills],
    ["tie", ties],
  ];
  for (const [tag, values] of named) {
    const list = unique(values);
    if (list.length) tags[tag] = list;
  }
  return Object.fromEntries(
    Object.entries(tags).filter(([, list]) => list && list.length),
  );
}

let played: ReadonlyMap<string, readonly SituationType[]> | undefined;

/** `spotTagsOf` over the game's own situation types and arc variants. */
export function spotTags(
  use: Readonly<Record<string, unknown>>,
): Partial<Record<SpotTag, readonly string[]>> {
  played ??= typesByPurpose(SITUATION_TYPES as readonly SituationType[], {
    families: ARC_VARIANT_FAMILIES as VariantsFile["families"],
  });
  return spotTagsOf(use, played);
}
