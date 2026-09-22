import { canonicalJson } from "./canonical-json";
import { stableHash } from "./ids";
import type { LifeSceneDefinition } from "./opening-life-content";
import type { World } from "./types";

/** Data only. The version names the supported commands and validation contract. */
export const CONTENT_PACK_API = "ordinary-scenes-v1";
export const CONTENT_PACK_MAX_CHARACTERS = 128 * 1024;
export interface RuntimeContentPack {
  readonly kind: "our-civic-duty-content-pack";
  readonly api: typeof CONTENT_PACK_API;
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly authority: "authored-fiction";
  readonly dependencies: readonly {
    readonly id: string;
    readonly version: string;
  }[];
  readonly durations: readonly {
    readonly key: string;
    readonly minutes: number;
  }[];
  readonly scenes: readonly (LifeSceneDefinition & {
    readonly durationRef?: string;
  })[];
  /**
   * Traits this pack adds, in the shape `trait-packs.ts` declares. Optional,
   * so every pack written before traits could travel reads exactly as it did.
   *
   * Only the container is checked here. Each row is read by
   * `installed-trait-packs.ts`, which skips a malformed row with its reason
   * rather than refusing the pack: a bad trait must not take a good encounter
   * down with it.
   */
  readonly traits?: {
    readonly traits: readonly unknown[];
    readonly effects: readonly unknown[];
  };
}
export interface SavedContentPack {
  readonly pack: RuntimeContentPack;
  /** Reproducible identity, not a signature or trust assertion. */
  readonly digest: string;
}
export interface WorldContentPacks {
  readonly api: typeof CONTENT_PACK_API;
  /** Dependencies precede consumers; unrelated packages are sorted by id. */
  readonly installed: readonly SavedContentPack[];
}

function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Content pack requires an object.");
}
function shape(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
  )
    throw new Error("Content pack has missing or unsupported fields.");
}
function text(value: unknown, maximum = 2000): asserts value is string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maximum ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    })
  )
    throw new Error(
      "Content pack text is empty, too long, or contains control characters.",
    );
}
function key(value: unknown): asserts value is string {
  text(value, 160);
  if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u.test(value))
    throw new Error("Content pack keys require a dotted namespace.");
}
function version(value: unknown): asserts value is string {
  text(value, 40);
  if (!/^\d+\.\d+\.\d+$/u.test(value))
    throw new Error(
      "Content pack versions must be exact major.minor.patch versions.",
    );
}
function list(value: unknown, maximum: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > maximum)
    throw new Error("Content pack list is invalid or too large.");
}
function minutes(value: unknown): asserts value is number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 1 ||
    (value as number) > 120
  )
    throw new Error("Authored scene duration must be 1–120 whole minutes.");
}
function unique(values: readonly string[]) {
  if (new Set(values).size !== values.length)
    throw new Error("Content pack has duplicate identities.");
}

export function assertRuntimeContentPack(
  value: unknown,
): asserts value is RuntimeContentPack {
  record(value);
  shape(
    value,
    [
      "kind",
      "api",
      "id",
      "version",
      "title",
      "authority",
      "dependencies",
      "durations",
      "scenes",
    ],
    ["traits"],
  );
  if (
    value.kind !== "our-civic-duty-content-pack" ||
    value.api !== CONTENT_PACK_API ||
    value.authority !== "authored-fiction"
  )
    throw new Error(
      "Unsupported content pack kind, API or authority. This API admits authored fiction only.",
    );
  key(value.id);
  if (!value.id.startsWith("mod."))
    throw new Error(
      "External content uses the reserved mod. namespace; built-in identities cannot be overridden.",
    );
  version(value.version);
  text(value.title, 160);
  list(value.dependencies, 16);
  list(value.durations, 32);
  list(value.scenes, 32);
  if (value.traits !== undefined) {
    record(value.traits);
    shape(value.traits, ["traits", "effects"]);
    list(value.traits.traits, 64);
    list(value.traits.effects, 64);
  }
  for (const dependency of value.dependencies) {
    record(dependency);
    shape(dependency, ["id", "version"]);
    key(dependency.id);
    version(dependency.version);
    if (dependency.id === value.id)
      throw new Error("A content pack cannot depend on itself.");
  }
  unique(
    value.dependencies.map((dependency) => (dependency as { id: string }).id),
  );
  for (const duration of value.durations) {
    record(duration);
    shape(duration, ["key", "minutes"]);
    key(duration.key);
    minutes(duration.minutes);
    if (!duration.key.startsWith(`${value.id}.`))
      throw new Error("Duration must belong to its pack namespace.");
  }
  for (const scene of value.scenes) {
    record(scene);
    shape(
      scene,
      [
        "key",
        "ages",
        "setting",
        "cast",
        "minutes",
        "premise",
        "choices",
        "source",
      ],
      ["recurrence", "durationRef"],
    );
    key(scene.key);
    if (!scene.key.startsWith(`${value.id}.`))
      throw new Error("Scene must belong to its pack namespace.");
    list(scene.ages, 2);
    if (
      scene.ages.length !== 2 ||
      scene.ages.some(
        (age) =>
          !Number.isSafeInteger(age) ||
          (age as number) < 0 ||
          (age as number) > 120,
      ) ||
      (scene.ages[0] as number) > (scene.ages[1] as number)
    )
      throw new Error("Scene age range is invalid.");
    if (
      !["home", "school", "neighborhood"].includes(scene.setting as string) ||
      !["alone", "guardian", "sibling", "peer", "housemate"].includes(
        scene.cast as string,
      )
    )
      throw new Error("Scene setting or cast is unsupported.");
    if (scene.recurrence !== undefined && scene.recurrence !== "daily")
      throw new Error("Scene recurrence is unsupported.");
    minutes(scene.minutes);
    text(scene.premise);
    text(scene.source);
    if (scene.durationRef !== undefined) key(scene.durationRef);
    list(scene.choices, 8);
    if (scene.choices.length < 2)
      throw new Error("An encounter needs at least two explicit choices.");
    for (const choice of scene.choices) {
      record(choice);
      shape(choice, ["key", "label", "aftermath"], ["approach"]);
      text(choice.key, 80);
      if (!/^[a-z][a-z0-9-]*$/u.test(choice.key))
        throw new Error("Choice key is malformed.");
      text(choice.label, 240);
      text(choice.aftermath);
      if (
        choice.approach !== undefined &&
        !["ask", "listen", "direct"].includes(choice.approach as string)
      )
        throw new Error("Choice approach is unsupported.");
    }
    unique(scene.choices.map((choice) => (choice as { key: string }).key));
    const prose = [
      scene.premise,
      ...scene.choices.flatMap((choice) => [
        (choice as { label: string }).label,
        (choice as { aftermath: string }).aftermath,
      ]),
    ].join("\n");
    if (
      /[{}]/u.test(prose.replaceAll("{person}", "").replaceAll("{who}", "")) ||
      (scene.cast === "alone" && /\{(?:person|who)\}/u.test(prose))
    )
      throw new Error("Scene has an unsupported or unbound person reference.");
  }
  unique(
    [...value.durations, ...value.scenes].map(
      (entry) => (entry as { key: string }).key,
    ),
  );
  if (canonicalJson(value).length > CONTENT_PACK_MAX_CHARACTERS)
    throw new Error("Content pack is too large.");
}

export function parseRuntimeContentPack(input: string): RuntimeContentPack {
  if (input.length > CONTENT_PACK_MAX_CHARACTERS)
    throw new Error("Content pack is too large.");
  const value: unknown = JSON.parse(input);
  assertRuntimeContentPack(value);
  return value;
}

/** One registration path for JSON and trusted first-party definitions. No callbacks. */
export function registerRuntimeContentPacks(
  packs: readonly RuntimeContentPack[],
): WorldContentPacks {
  if (packs.length > 32)
    throw new Error("At most 32 content packs can be attached to one life.");
  packs.forEach(assertRuntimeContentPack);
  unique(packs.map((pack) => pack.id));
  unique(
    packs.flatMap((pack) =>
      [...pack.scenes, ...pack.durations].map((entry) => entry.key),
    ),
  );
  const remaining = [...packs].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const ordered: RuntimeContentPack[] = [];
  while (remaining.length) {
    const index = remaining.findIndex((pack) =>
      pack.dependencies.every((dependency) =>
        ordered.some(
          (prior) =>
            prior.id === dependency.id && prior.version === dependency.version,
        ),
      ),
    );
    if (index < 0)
      throw new Error(
        "Content pack dependencies are missing, incompatible or cyclic.",
      );
    ordered.push(remaining.splice(index, 1)[0]!);
  }
  for (const pack of ordered)
    for (const scene of pack.scenes) {
      if (!scene.durationRef) continue;
      const owner = ordered.find((candidate) =>
        candidate.durations.some(
          (duration) => duration.key === scene.durationRef,
        ),
      );
      if (
        !owner ||
        (owner.id !== pack.id &&
          !pack.dependencies.some(
            (dependency) =>
              dependency.id === owner.id &&
              dependency.version === owner.version,
          ))
      )
        throw new Error(
          "Scene duration reference requires an exact declared dependency.",
        );
      const duration = owner.durations.find(
        (entry) => entry.key === scene.durationRef,
      )!;
      if (scene.minutes !== duration.minutes)
        throw new Error(
          "Scene duration disagrees with its pinned settings definition.",
        );
    }
  return {
    api: CONTENT_PACK_API,
    installed: ordered.map((pack) => ({
      pack: structuredClone(pack),
      digest: stableHash(canonicalJson(pack)),
    })),
  };
}

export function assertWorldContentPacks(
  value: unknown,
): asserts value is WorldContentPacks {
  record(value);
  shape(value, ["api", "installed"]);
  if (value.api !== CONTENT_PACK_API)
    throw new Error("Unsupported saved content API.");
  list(value.installed, 32);
  const packs = value.installed.map((entry) => {
    record(entry);
    shape(entry, ["pack", "digest"]);
    assertRuntimeContentPack(entry.pack);
    return entry.pack;
  });
  // Canonical bytes establish equality; the compact digest is only a name.
  if (
    canonicalJson(registerRuntimeContentPacks(packs)) !== canonicalJson(value)
  )
    throw new Error(
      "Saved content identity, dependency order or digest is inconsistent.",
    );
}

export function installRuntimeContentPack(
  world: World,
  pack: RuntimeContentPack,
): World {
  if (world.contentPacks) assertWorldContentPacks(world.contentPacks);
  return {
    ...world,
    contentPacks: registerRuntimeContentPacks([
      ...(world.contentPacks?.installed.map((entry) => entry.pack) ?? []),
      pack,
    ]),
  };
}

export function runtimeLifeScenes(
  world: World,
): readonly LifeSceneDefinition[] {
  return (
    world.contentPacks?.installed.flatMap((entry) => entry.pack.scenes) ?? []
  );
}
