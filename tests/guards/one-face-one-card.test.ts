import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * One face part and one person card (play-one-person-shows-two-faces; Fable
 * audit, Nov 9: "There are six ways to draw a person card and three ways to
 * draw a face"; owner, Oct 28: "It's just different ways of displaying the
 * same information"). A person's face is drawn only by src/bench/ui/face.mjs,
 * from the one face record the server gives for that person (scene.ts
 * faceOf), and a person shown by face and name is built only by
 * src/bench/ui/person-card.mjs.
 *
 * A second way to draw a face is caught by its marks: building the face
 * frames (`headshot`, `mxbust`, `mxglow`) or cropping by a face record's head
 * box anywhere else. A second person card is caught by who imports the face
 * part: a new screen part that draws faces its own way fails here; show the
 * person through personCard (or add its layout there) instead.
 */

const ROOT = path.resolve(__dirname, "../..");
const FACE_PART = "src/bench/ui/face.mjs";

/** Shipped bench code: browser checks and tests are not screens. */
function shipped(): string[] {
  return execFileSync("git", ["ls-files", "src/bench"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        /\.(mjs|js|ts)$/.test(file) &&
        !/\.(test|spec)\.(mjs|js|ts)$/.test(file) &&
        !/\.browser\.mjs$/.test(file),
    );
}

/**
 * The parts that may draw with the face part, each for its reason. The person
 * card; the strip screen's own bust (You, the person card's screen, Budgets);
 * the play screen's single face slots (the talk box's speaker, the title's
 * Continue, New game, the creator); a ballot's candidate rows and a meeting's
 * member ring, which show a face in a mark of their own beside a vote, not a
 * person card; and the strip of busts along a room, which is who is here, not
 * a card.
 */
const MAY_DRAW_FACES = new Set([
  "src/bench/ui/person-card.mjs",
  "src/bench/ui/bust-strip.mjs",
  "src/bench/ui/strips.mjs",
  "src/bench/play.mjs",
  "src/bench/ui/ballot-paper.mjs",
  "src/bench/ui/meeting-item.mjs",
]);

/**
 * Marks of drawing a face: building its frames, stacking or placing a bust
 * (ui/bust.mjs's two calls), or cropping by a face record's head box. The
 * bust part itself (ui/bust.mjs) stacks and places; only face.mjs calls it.
 */
const BUST_PART = "src/bench/ui/bust.mjs";
const FACE_MARKS: readonly RegExp[] = [
  /\bbust(?:Stack|Place)\(/,
  /className:\s*["'`](?:headshot|mxbust|mxglow)\b/,
  /\[\s*top\s*,\s*middle\s*,\s*width\s*\]\s*=/,
  /\.head\s*\[\s*[012]\s*\]/,
];

describe("one face part and one person card", () => {
  const files = shipped();

  it("draws a face only in ui/face.mjs", () => {
    const drawn = files.filter(
      (file) =>
        file !== FACE_PART &&
        file !== BUST_PART &&
        FACE_MARKS.some((mark) =>
          mark.test(readFileSync(path.join(ROOT, file), "utf8")),
        ),
    );
    expect(
      drawn,
      "draw a face with face() from src/bench/ui/face.mjs, never its own crop",
    ).toEqual([]);
  });

  it("builds person cards only through ui/person-card.mjs", () => {
    const importers = files.filter((file) =>
      /from\s+["'](?:\.\/|\.\/ui\/)face\.mjs["']/.test(
        readFileSync(path.join(ROOT, file), "utf8"),
      ),
    );
    expect(
      importers.filter((file) => !MAY_DRAW_FACES.has(file)),
      "show a person with personCard from src/bench/ui/person-card.mjs (add a layout there), not a card of its own",
    ).toEqual([]);
  });

  it("leaves none of the deleted face parts and cards", () => {
    const gone = [
      "src/bench/ui/headshot.mjs",
      "src/bench/ui/member-card.mjs",
    ].filter((file) => files.includes(file));
    expect(gone).toEqual([]);
    const names =
      /\b(?:headshot|memberCard|leaderBlock|savedLifeRow|bust|candidate)\(/;
    const callers = files.filter(
      (file) =>
        file !== "src/bench/ui/person-card.mjs" &&
        /\.mjs$/.test(file) &&
        names.test(readFileSync(path.join(ROOT, file), "utf8")),
    );
    expect(callers, "a deleted face part or card is called").toEqual([]);
  });
});
