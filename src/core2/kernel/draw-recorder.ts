/**
 * Which lines of the game drew a seeded number, and how often (owner, Nov 16, 2026: "track
 * everything at open so that way you can ... finally eliminate all of these random draws or fixed
 * things"). Off in play: each draw primitive (the seeded generator, the world's seeded unit, the
 * stable hash, the officials' uniform and the bench's look hash) calls `recordDraw`, which returns
 * at once while no recording runs. Dev mode's "How this world opened" turns it on while it rebuilds
 * the world's twin from its recipe, and the opening-draws test turns it on while it opens a pinned
 * world; each reads the sites back by file and function. No imports, so the kernel can use it.
 */

/** One place in the code that drew: its file, its function and how many draws it took per stage. */
export interface DrawSite {
  readonly file: string;
  readonly fn: string;
  readonly primitive: string;
  readonly stage: string;
  readonly count: number;
}

interface Recording {
  stage: string;
  readonly sites: Map<string, DrawSite & { count: number }>;
}

let recording: Recording | null = null;

/** The files that hold the draw primitives themselves: a site is the first frame outside them. */
const PRIMITIVE_FILES = [
  "/core2/kernel/rng.ts",
  "/core2/seeded.ts",
  "/core2/kernel/ids.ts",
  "/core2/kernel/draw-recorder.ts",
  "/core2/world-draw.ts",
];
/** Helpers inside other files that only wrap a primitive (their caller is the site). */
const WRAPPERS = new Set(["uniform", "seededNormal", "hash"]);

/** Called by a draw primitive while a recording runs. */
export function recordDraw(primitive: string): void {
  if (!recording) return;
  // The call sites as V8 holds them: no text stack, and no source-map pass a test runner adds.
  const limit = Error.stackTraceLimit;
  const prepare = Error.prepareStackTrace;
  Error.stackTraceLimit = 12;
  Error.prepareStackTrace = (_error, sites) => sites;
  const holder: { stack?: unknown } = {};
  Error.captureStackTrace(holder, recordDraw);
  const frames = (holder.stack ?? []) as NodeJS.CallSite[];
  Error.stackTraceLimit = limit;
  Error.prepareStackTrace = prepare;
  let kind = primitive;
  for (const frame of frames) {
    const path = frame.getFileName() ?? "";
    const at = path.indexOf("src/");
    if (at < 0) continue;
    const file = path.slice(at);
    const fn = frame.getFunctionName() ?? "<anonymous>";
    // createStableId makes a record's id, not a draw.
    if (fn === "createStableId") return;
    if (file.endsWith("core2/world-draw.ts")) kind = "world offset";
    if (PRIMITIVE_FILES.some((f) => file.endsWith(f.slice(1)))) continue;
    if (WRAPPERS.has(fn)) continue;
    const key = `${recording.stage}|${file}#${fn}|${kind}`;
    const site = recording.sites.get(key);
    if (site) site.count += 1;
    else
      recording.sites.set(key, {
        file,
        fn,
        primitive: kind,
        stage: recording.stage,
        count: 1,
      });
    return;
  }
}

/** Starts a recording (a second start while one runs is refused: two would mix their sites). */
export function startDrawRecording(): void {
  if (recording) throw new Error("A draw recording is already running.");
  recording = { stage: "start", sites: new Map() };
}

/** Names the stage the draws from now on belong to (the bench's build stages). */
export function drawStage(name: string): void {
  if (recording) recording.stage = name;
}

/** Ends the recording and returns its sites. */
export function stopDrawRecording(): DrawSite[] {
  const done = recording;
  recording = null;
  return done ? [...done.sites.values()] : [];
}
