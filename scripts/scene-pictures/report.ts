/**
 * The scene picture report: for every situation type and every setting it can
 * be staged in, the picture it resolves to and the gaps (a name nobody has
 * painted, a stand-in, no night light), plus the pictures wanted and the rows
 * that name something that does not exist. It reads the same lookup the game
 * does (src/bench/scene-picture-steps.ts), so it cannot drift from play.
 * Run by `npm run scene-pictures`; the guard (tests/guards/scene-pictures.test.ts)
 * fails only on `dead` rows, never on today's gaps.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pictureSteps } from "../../src/bench/scene-picture-steps.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(join(ROOT, file), "utf8")) as T;

interface SituationType {
  key: string;
  purpose?: string;
  setting: string[];
  causes?: { setting?: string[] }[];
}
const situations = read<{
  types: SituationType[];
  settings: Record<string, string>;
}>("src/director/data/situation-types.json");
const places = read<Record<string, unknown>>(
  "src/bench/data/scene-places.json",
);
const manifest = read<{ backdrops: { place: string; variant: string }[] }>(
  "art/backdrops/manifest.json",
);
interface Category {
  group: string;
  subject: string;
  serves: string[];
  offices?: string[];
  scenes?: string[];
}
const categories = read<{
  groups: string[];
  serves: string[];
  places: Record<string, Category>;
}>("art/backdrops/categories.json");
const variantData = readFileSync(
  join(ROOT, "src/director/data/arc-variants.json"),
  "utf8",
);

const variantsOf = new Map<string, Set<string>>();
for (const row of manifest.backdrops) {
  if (!variantsOf.has(row.place)) variantsOf.set(row.place, new Set());
  variantsOf.get(row.place)!.add(row.variant);
}
const painted = (name: string) => variantsOf.get(name)?.has("midday") ?? false;
const hasNight = (name: string) => variantsOf.get(name)?.has("night") ?? false;
const isToken = (name: string) => name.startsWith("@");
const generic = new Set((places.genericPlaces as { places: string[] }).places);
const wantedText = places.wantedPictures as Record<string, string>;

/** Every list of picture names under a section of scene-places.json. */
function listsOf(value: unknown): string[][] {
  if (Array.isArray(value))
    return value.every((row) => typeof row === "string")
      ? [value as string[]]
      : value.flatMap(listsOf);
  return value && typeof value === "object"
    ? Object.values(value).flatMap(listsOf)
    : [];
}

/** The settings a type is staged in: its own and each cause's. */
function settingsOf(type: SituationType): string[] {
  return [
    ...new Set([
      ...type.setting,
      ...(type.causes ?? []).flatMap((cause) => cause.setting ?? []),
    ]),
  ];
}

export interface Resolved {
  type: string;
  setting: string;
  /** The name it resolves to: a painted place, or a token the records fill in. */
  picture: string;
  /** Which row named it. */
  from: "variant row" | "own row" | "school list" | "setting default";
  gaps: string[];
}

const FROM = {
  variant: "variant row",
  type: "own row",
  school: "school list",
  setting: "setting default",
} as const;

function resolve(type: SituationType, setting: string): Resolved {
  const seat = setting === "seat";
  const steps = pictureSteps({
    typeKey: type.key,
    setting: seat ? "venue" : setting,
    seat,
    age: 30,
  });
  const gaps: string[] = [];
  let win: (typeof steps)[number] | undefined;
  for (const step of steps) {
    if (isToken(step.name) || painted(step.name)) {
      win = step;
      break;
    }
    // A name ahead of the winner that is not painted: wanted, and skipped.
    gaps.push(`unpainted: ${step.name}`);
  }
  if (!win) {
    gaps.push("nothing painted: falls back to the player's own home");
    return {
      type: type.key,
      setting,
      picture: "@home (fallback)",
      from: "setting default",
      gaps,
    };
  }
  if (win.row === "setting" && !isToken(win.name) && generic.has(win.name)) {
    const fits = Object.entries(categories.places)
      .filter(
        ([, row]) =>
          row.scenes?.includes(type.key) && row.serves.includes(setting),
      )
      .map(([name]) => name)
      .slice(0, 3);
    gaps.push(
      `stand-in: the generic ${win.name}` +
        (fits.length ? ` (possible painted pictures: ${fits.join(", ")})` : ""),
    );
  }
  if (win.row === "setting" && win.name === "@home" && setting === "other-home")
    gaps.push("no row of its own: the host's home, not a place made for it");
  if (!isToken(win.name) && !hasNight(win.name))
    gaps.push(`no night picture of ${win.name}`);
  return {
    type: type.key,
    setting,
    picture: win.name,
    from: FROM[win.row],
    gaps,
  };
}

/** Purpose ids a row key may name: a type key, a type's purpose or an arc variant's purpose. */
const purposeIds = new Set<string>([
  ...situations.types.flatMap((type) =>
    type.purpose ? [type.key, type.purpose] : [type.key],
  ),
  ...[...variantData.matchAll(/"purpose":\s*"([^"]+)"/g)].map((m) => m[1]!),
]);
const knownSettings = new Set([...Object.keys(situations.settings), "seat"]);
const typeByKey = new Map(situations.types.map((type) => [type.key, type]));

export interface Report {
  rows: Resolved[];
  /** Rows in situationPlaces that name a type, a variant or a setting that does not exist. */
  dead: string[];
  /** Unpainted names, with what they should show and every list that names them. */
  wanted: { name: string; wants: string; usedBy: string[] }[];
  /** Scene type and setting pairs on a setting default, with no row of their own. */
  unmapped: string[];
  /** Painted places the scenes use that have no night picture. */
  nightWanted: string[];
  markdown: string;
  wantedMarkdown: string;
}

export function buildReport(): Report {
  const rows = situations.types.flatMap((type) =>
    settingsOf(type).map((setting) => resolve(type, setting)),
  );

  const dead: string[] = [];
  for (const key of Object.keys(
    places.situationPlaces as Record<string, string[]>,
  )) {
    const at = key.lastIndexOf(":");
    const id = key.slice(0, at);
    const setting = key.slice(at + 1);
    const type = typeByKey.get(id);
    if (!purposeIds.has(id))
      dead.push(`${key}: no situation type or variant "${id}"`);
    else if (!knownSettings.has(setting))
      dead.push(`${key}: no setting "${setting}"`);
    else if (type && !settingsOf(type).includes(setting))
      dead.push(`${key}: type "${id}" is never staged at "${setting}"`);
  }

  // The categories file and the manifest name the same places; its scene types exist.
  for (const name of variantsOf.keys())
    if (!categories.places[name])
      dead.push(
        `art/backdrops/categories.json: no row for the painted place "${name}"`,
      );
  for (const [name, row] of Object.entries(categories.places)) {
    if (!variantsOf.has(name))
      dead.push(
        `art/backdrops/categories.json: "${name}" is not in the manifest`,
      );
    if (!categories.groups.includes(row.group))
      dead.push(
        `art/backdrops/categories.json: "${name}" has no group "${row.group}"`,
      );
    for (const kind of row.serves)
      if (!categories.serves.includes(kind))
        dead.push(
          `art/backdrops/categories.json: "${name}" serves no setting "${kind}"`,
        );
    for (const type of row.scenes ?? [])
      if (!typeByKey.has(type))
        dead.push(
          `art/backdrops/categories.json: "${name}" names no situation type "${type}"`,
        );
  }

  // A scene type that is not grandfathered maps every setting it is staged in:
  // a row of its own, or a line in wantedScenes saying what picture it wants.
  const wantedScenes = (places.wantedScenes ?? {}) as Record<string, string>;
  const unmappedToday = new Set(places.unmappedToday as string[]);
  const unmapped = rows
    .filter((row) => row.from === "setting default")
    .map((row) => `${row.type}:${row.setting}`);
  for (const key of unmapped) {
    const type = key.slice(0, key.lastIndexOf(":"));
    if (!unmappedToday.has(type) && !wantedScenes[key])
      dead.push(
        `${key}: a scene type with no picture row and no wantedScenes entry (add situationPlaces["${key}"], or wantedScenes["${key}"] saying what picture it wants; missing pictures never hold work back)`,
      );
  }
  // A wanted line names a pair that exists, or a variant the door-scenes
  // thread has not built yet (its id has a dot): then only its setting must exist.
  for (const key of Object.keys(wantedScenes)) {
    const id = key.slice(0, key.lastIndexOf(":"));
    const setting = key.slice(key.lastIndexOf(":") + 1);
    const pair = rows.some((row) => `${row.type}:${row.setting}` === key);
    const futureVariant =
      id.includes(".") && !purposeIds.has(id) && knownSettings.has(setting);
    if (!pair && !futureVariant && !purposeIds.has(id))
      dead.push(`wantedScenes "${key}": no such type and setting`);
  }

  const sections = Object.entries(places).filter(
    ([key]) =>
      ![
        "wantedPictures",
        "wantedScenes",
        "unmappedToday",
        "genericPlaces",
        "note",
      ].includes(key),
  );
  const usedBy = new Map<string, Set<string>>();
  const used = (name: string, section: string) => {
    if (!usedBy.has(name)) usedBy.set(name, new Set());
    usedBy.get(name)!.add(section);
  };
  for (const [section, value] of sections) {
    if (section === "situationPlaces" || section === "sceneSettings") {
      for (const [key, list] of Object.entries(
        value as Record<string, string[]>,
      ))
        for (const name of list) used(name, `${section}.${key}`);
    } else
      for (const list of listsOf(value))
        for (const name of list) used(name, section);
  }
  const wanted = [...usedBy]
    .filter(
      // Lists of state codes (courthouseByState, regionalHouses) are not pictures.
      ([name]) => !isToken(name) && !painted(name) && !/^[A-Z]{2}$/.test(name),
    )
    .map(([name, by]) => ({
      name,
      wants:
        wantedText[name] ?? "(no description yet: add one to wantedPictures)",
      usedBy: [...by].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Painted places a scene may be drawn in (a scene row, a setting default or
  // the school list) that have only midday light.
  const sceneNames = new Set<string>();
  for (const section of ["situationPlaces", "sceneSettings"])
    for (const list of Object.values(
      places[section] as Record<string, string[]>,
    ))
      for (const name of list) sceneNames.add(name);
  for (const row of places.schoolPlacesByAge as { places: string[] }[])
    for (const name of row.places) sceneNames.add(name);
  const nightWanted = [...sceneNames]
    .filter((name) => !isToken(name) && painted(name) && !hasNight(name))
    .sort();

  const gapCount = rows.filter((row) => row.gaps.length).length;
  const own = rows.filter((row) => row.from !== "setting default").length;
  const md = [
    "# Scene pictures",
    "",
    'Generated by `npm run scene-pictures` from `src/bench/data/scene-places.json`, `art/backdrops/manifest.json` and the situation types. Do not edit. To give a scene its own picture, add one row to `situationPlaces` (`"<type>:<setting>"`, or `"<variant purpose>:<setting>"` for an arc variant); a name nobody has painted yet is skipped and listed under Wanted.',
    "",
    "## Counts",
    "",
    `- Situation types: ${situations.types.length}; type and setting pairs: ${rows.length}.`,
    `- Pairs with a row of their own (type or variant): ${own}. Pairs on a setting default: ${rows.length - own}.`,
    `- Pairs with at least one gap: ${gapCount}.`,
    `- Rows naming a type, variant or setting that does not exist (the guard fails on these): ${dead.length}.`,
    `- Pictures wanted (named in a list, not painted): ${wanted.length}.`,
    `- Painted places the scenes use with no night picture: ${nightWanted.length}.`,
    `- Pairs still on a setting default with no row of their own: ${unmapped.length} (types not grandfathered in \`unmappedToday\` must have a row or a wantedScenes line).`,
    `- Painted places: ${variantsOf.size}, sorted into ${categories.groups.length} groups in art/backdrops/categories.json.`,
    "",
    "## Rows that name something that does not exist",
    "",
    ...(dead.length ? dead.map((row) => `- ${row}`) : ["None."]),
    "",
    "## Wanted",
    "",
    ...(wanted.length
      ? wanted.map(
          (row) =>
            `- \`${row.name}\`: ${row.wants} Named in: ${row.usedBy.join(", ")}.`,
        )
      : ["None."]),
    "",
    "## Scene pictures wanted (wantedScenes)",
    "",
    ...(Object.keys(wantedScenes).length
      ? Object.entries(wantedScenes).map(
          ([key, text]) => `- \`${key}\`: ${text}`,
        )
      : ["None."]),
    "",
    "## What exists, by group",
    "",
    "| Group | Places | Serves (settings) |",
    "| --- | --- | --- |",
    ...categories.groups.map((group) => {
      const inGroup = Object.values(categories.places).filter(
        (row) => row.group === group,
      );
      const serves = [...new Set(inGroup.flatMap((row) => row.serves))].sort();
      return `| ${group} | ${inGroup.length} | ${serves.join(", ")} |`;
    }),
    "",
    "## Night picture wanted",
    "",
    nightWanted.length
      ? nightWanted.map((n) => `\`${n}\``).join(", ") + "."
      : "None.",
    "",
    "## Every scene type and setting",
    "",
    "| Type | Setting | Picture | From | Gaps |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.type} | ${row.setting} | ${row.picture} | ${row.from} | ${row.gaps.join("; ") || "none"} |`,
    ),
    "",
  ].join("\n");

  const wantedMarkdown = [
    "Generated by `npm run scene-pictures` (docs/art/SCENE-PICTURES.md has the full table). Edit the descriptions in `wantedPictures` in `src/bench/data/scene-places.json`, not here.",
    "",
    `Unpainted names the scenes name (${wanted.length}):`,
    "",
    ...(wanted.length
      ? wanted.map(
          (row) =>
            `- \`${row.name}\`: ${row.wants} Named in: ${row.usedBy.join(", ")}.`,
        )
      : ["None."]),
    "",
    `Painted places the scenes use that have only midday light (${nightWanted.length}): ${nightWanted.map((n) => `\`${n}\``).join(", ") || "none"}.`,
    "",
  ].join("\n");

  return {
    rows,
    dead,
    wanted,
    unmapped,
    nightWanted,
    markdown: md,
    wantedMarkdown,
  };
}
