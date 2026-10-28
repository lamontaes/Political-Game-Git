/* global process, console */
// A place's spots from its mannequin plate (owner, Oct 27): the art session
// paints the room again with a mannequin at every natural spot, measures each
// one (art/people-rooms/spots/<scene>.json: head top, middle and width, pose,
// facing, and for each column the lowest row where the mannequin still
// showed) and tags it. This writes those spots into art/backdrops/staging.json
// in place of the hand-typed ones, and bakes each spot's front line into its
// occluder mask (art/backdrops/occluders), the same mask the bench lays the
// painting through: below the front line the furniture is in front. The
// plate is data and is never drawn.
// Usage: node --import tsx scripts/people/room-spots.ts [scene ...]
// With no scenes, every scene with a spots file.
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";

interface PlateSpot {
  box: [number, number, number, number];
  headTop: number;
  headX: number;
  headWidth: number;
  pose: "stand" | "sit" | "lectern";
  frontLine: number[];
  frontLineX0: number;
  touching: boolean;
  tags: {
    facing: number;
    pose?: "stand" | "sit" | "lectern";
    coveredBy: string;
    role?: string;
    seat?: string;
    size: { headWidth: number; height: number };
  };
}
interface PlateFile {
  empty: string;
  plate: string;
  size: [number, number];
  spots: PlateSpot[];
}

// A seated adult's body as shares of their standing height (ESTIMATED,
// anthropometric tables: sitting height about 0.52 of stature, knee height
// about 0.28; spread a few hundredths).
const SITTING = 0.52;
const KNEE = 0.28;
/** A column whose mannequin ends this many pixels above where its feet would be is cut by furniture. */
const CUT_PX = 3;
/** How far below a front line the furniture is taken to cover, as a share of the standing height. */
const COVER_REACH = 0.6;
/** How far past the mannequin's sides a cut front line carries on, as a share of its box width (a heavier body is wider). */
const CARRY = 0.15;
/** How close (in the plate's head widths) an old spot is to a plate spot to be the same place (TUNABLE by eye, 1.5 to 3). */
const NEAR_HEADS = 2;
/** At least this many of the mannequin's head widths, past each side. */
const CARRY_HEADS = 1.2;

/** A head's width as a share of standing height in this plate: the median over its standing mannequins seen whole. */
function headShare(spots: readonly PlateSpot[]): number {
  const whole = spots
    .filter(
      (s) => s.pose === "stand" && s.tags.coveredBy === "none" && !s.touching,
    )
    .map((s) => s.headWidth / (s.box[3] - s.headTop))
    .sort((a, b) => a - b);
  // ESTIMATED from the owner's mockup and the Oval Office plate (61 / 638).
  return whole.length ? whole[Math.floor(whole.length / 2)]! : 0.096;
}

const facingOf = (angle: number) =>
  Math.abs(angle) >= 135
    ? "away"
    : Math.abs(angle) < 22.5
      ? "viewer"
      : angle < 0
        ? "left"
        : "right";

const pct = (value: number, of: number, places = 2) =>
  Math.round((value / of) * 100 * 10 ** places) / 10 ** places;

/** The mask of what covers the person below the front line, or null where nothing does. */
function frontMask(
  spot: PlateSpot,
  /** Where the body would end with nothing in front: the feet. */
  foot: number,
  tall: number,
  width: number,
  height: number,
): { png: PNG; left: number; top: number } | null {
  const span = spot.box[2] - spot.box[0] + 1;
  // The figure drawn here can be wider than the mannequin: its sides reach
  // past the mannequin's by up to about a head width and more.
  const carry = Math.round(
    Math.max(span * CARRY, spot.headWidth * CARRY_HEADS),
  );
  // Only where the art says something covers this person: elsewhere a column
  // ending early is the edge of a hand or a shoulder, not furniture.
  if (spot.tags.coveredBy === "none") return null;
  const cut = spot.frontLine.map((row) => (row < foot - CUT_PX ? row : null));
  if (!cut.some((row) => row !== null)) return null;
  // Carry a cut edge past the mannequin's sides, where a wider body would be.
  const first = cut.find((row) => row !== null) ?? null;
  const last = [...cut].reverse().find((row) => row !== null) ?? null;
  const columns: { x: number; row: number }[] = [];
  for (let i = -carry; i < cut.length + carry; i++) {
    const row =
      i < 0
        ? cut[0] !== null
          ? first
          : null
        : i >= cut.length
          ? cut.at(-1) !== null
            ? last
            : null
          : cut[i]!;
    const x = spot.frontLineX0 + i;
    if (row !== null && x >= 0 && x < width) columns.push({ x, row });
  }
  if (!columns.length) return null;
  const reach = Math.round(tall * COVER_REACH);
  const left = columns[0]!.x;
  const right = columns.at(-1)!.x;
  const top = Math.min(...columns.map((c) => c.row)) + 1;
  const end = Math.min(height, Math.max(...columns.map((c) => c.row)) + reach);
  const png = new PNG({
    width: right - left + 1,
    height: Math.max(end - top, 1),
  });
  for (const { x, row } of columns)
    for (let y = row + 1; y < end; y++)
      png.data[((y - top) * png.width + (x - left)) * 4 + 3] = 255;
  return { png, left, top };
}

const STAGING = "art/backdrops/staging.json";
const OCCLUDERS = "art/backdrops/occluders";

const scenes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync("art/people-rooms/spots").map((f) => f.replace(/\.json$/, ""));
const staging = JSON.parse(readFileSync(STAGING, "utf8"));
const occluders = JSON.parse(readFileSync(`${OCCLUDERS}/index.json`, "utf8"));
for (const scene of scenes) {
  const stage = staging.places[scene];
  if (!stage) {
    console.log(`${scene}: not a staged place, skipped`);
    continue;
  }
  const source = `art/people-rooms/spots/${scene}.json`;
  const plate = JSON.parse(readFileSync(source, "utf8")) as PlateFile;
  const [width, height] = plate.size;
  const share = headShare(plate.spots);
  const parent = plate.empty.split("/").pop()!;
  // The old spots and their masks, read before the scene's masks are rewritten.
  const before = (stage.spots as { id: string; x: number; y: number }[]).map(
    (spot) => {
      const mask = (
        occluders.places[scene]?.spots as Record<
          string,
          {
            file: string;
            leftPercent: number;
            topPercent: number;
            widthPercent: number;
            heightPercent: number;
          }
        >
      )?.[spot.id];
      return {
        spot,
        mask: mask && {
          ...mask,
          png: readFileSync(`${OCCLUDERS}/${mask.file}`),
        },
      };
    },
  );
  rmSync(`${OCCLUDERS}/${scene}`, { recursive: true, force: true });
  const masks: Record<string, unknown> = {};
  // The art session's tag is its own call on the pose; the measured one
  // reads only the mannequin's visible height.
  for (const s of plate.spots) s.pose = s.tags.pose ?? s.pose;
  const spots = plate.spots.map((s, n) => {
    const tall = s.headWidth / share;
    const id = `${scene}:spot:${n}`;
    const sits = s.pose === "sit";
    const seat = s.headTop + SITTING * tall;
    const foot = sits ? seat + KNEE * tall : s.headTop + tall;
    const covered = s.tags.coveredBy !== "none";
    const mask = frontMask(s, foot, tall, width, height);
    if (mask) {
      mkdirSync(`${OCCLUDERS}/${scene}`, { recursive: true });
      writeFileSync(`${OCCLUDERS}/${scene}/${n}.png`, PNG.sync.write(mask.png));
      masks[id] = {
        file: `${scene}/${n}.png`,
        leftPercent: pct(mask.left, width, 3),
        topPercent: pct(mask.top, height, 3),
        widthPercent: pct(mask.png.width, width, 3),
        heightPercent: pct(mask.png.height, height, 3),
      };
    }
    const lowest = Math.min(...s.frontLine);
    return {
      x: pct(s.headX, width),
      y: Math.min(pct(foot, height), 100),
      // A lectern, or the speaker's place on a stage: the podium, where the
      // one giving a speech stands.
      pose:
        s.pose === "lectern" || (s.tags.role === "speaker" && !sits)
          ? "podium"
          : s.pose,
      facing: facingOf(s.tags.facing),
      depth: Math.min(pct(foot, height), 100),
      ...(sits ? { seatY: pct(seat, height) } : {}),
      // Where furniture covers the lower body, its edge: the floor at the feet is hidden.
      ...(covered && lowest < s.box[3] - CUT_PX
        ? { behindY: pct(lowest, height) }
        : {}),
      head: {
        top: pct(s.headTop, height),
        x: pct(s.headX, width),
        width: pct(s.headWidth, width, 3),
      },
      role: s.tags.role ?? "general",
      id,
    };
  });
  // Where the room holds more people than the plate painted (a council's
  // gallery, an election-night crowd, a big household), the old spots the
  // plate doesn't cover stay, each with its own mask, after the plate's own
  // spots; one within two head widths of a plate spot is that spot, except
  // a podium the plate doesn't paint.
  // stopgapId: SG-PLAY-plate-overflow-spots
  const near = Math.max(...spots.map((s) => s.head.width)) * NEAR_HEADS;
  const kept = before
    // On a room already measured, only the spots past the plate's own.
    .filter(({ spot }) => {
      const n = /:spot:(\d+)$/.exec(spot.id)?.[1];
      return !stage.spotsFrom || n === undefined || Number(n) >= spots.length;
    })
    .filter(
      ({ spot }) =>
        // A podium the plate doesn't paint stays wherever it stands.
        ((spot as { pose?: string }).pose === "podium" &&
          !spots.some((s) => s.pose === "podium")) ||
        spots.every(
          (s) =>
            Math.abs(s.x - spot.x) > near || Math.abs(s.y - spot.y) > near * 2,
        ),
    )
    .map(({ spot, mask }, i) => {
      const n = spots.length + i;
      const id = `${scene}:spot:${n}`;
      if (mask) {
        mkdirSync(`${OCCLUDERS}/${scene}`, { recursive: true });
        writeFileSync(`${OCCLUDERS}/${scene}/${n}.png`, mask.png);
        masks[id] = {
          leftPercent: mask.leftPercent,
          topPercent: mask.topPercent,
          widthPercent: mask.widthPercent,
          heightPercent: mask.heightPercent,
          file: `${scene}/${n}.png`,
        };
      }
      const rest: Record<string, unknown> = { ...spot };
      delete rest.hero;
      return { ...rest, id };
    });
  // The hero stands on the standing spot nearest the old hero's place.
  const oldHero =
    (stage.spots as { hero?: boolean; x: number; y: number }[]).find(
      (s) => s.hero,
    ) ?? stage.spots[0];
  const standing = spots.filter((s) => s.pose === "stand");
  const hero = (standing.length ? standing : spots).reduce((a, b) =>
    Math.hypot(a.x - oldHero.x, a.y - oldHero.y) <=
    Math.hypot(b.x - oldHero.x, b.y - oldHero.y)
      ? a
      : b,
  );
  stage.spots = [
    ...spots.map((s) => (s === hero ? { ...s, hero: true } : s)),
    ...kept,
  ];
  stage.spotsFrom = source;
  stage.measuredFrom = `mannequin plate ${plate.plate} over ${plate.empty}, measured by the art session (art/people-rooms/tools/slots.py); head share ${share.toFixed(3)}`;
  occluders.places[scene] = {
    parent,
    parentSha256: createHash("sha256")
      .update(readFileSync(`art/backdrops/${parent}`))
      .digest("hex"),
    from: source,
    spots: masks,
  };
  console.log(
    `${scene}: ${spots.length} spots, ${Object.keys(masks).length} front-line masks${kept.length ? `, ${kept.length} kept from the old staging` : ""}`,
  );
}
writeFileSync(STAGING, JSON.stringify(staging, null, 2) + "\n");
writeFileSync(
  `${OCCLUDERS}/index.json`,
  JSON.stringify(occluders, null, 2) + "\n",
);
