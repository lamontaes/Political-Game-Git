// The people pack is swapped by one setting and grown by manifest rows
// (owner, Oct 29: "make it to where these can be updated very easily").
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  PEOPLE_PACK,
  figureAtPath,
  figurePng,
  figureUrl,
  packFigures,
  packPeople,
} from "./people-pack";
import { plates } from "./mannequin-plates";
import { fitOn } from "./whole-figures";

const ROOT = new URL("../../", import.meta.url);
const tracked = execFileSync("git", ["ls-files"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);
/** Code, checks and packaging: where a reference would load or ship a file. */
const code = tracked.filter(
  (file) =>
    /^(src|scripts|desktop|tests|\.github)\//.test(file) ||
    file === "package.json",
);
const text = (file: string) => readFileSync(new URL(file, ROOT), "utf8");

describe("the people pack", () => {
  it("is named in one place: the loader's setting", () => {
    expect(PEOPLE_PACK).toBeTruthy();
    const naming = code.filter(
      (file) =>
        // The skill-ops test checks the skills' links to the pack's README.
        file !== "scripts/skill-ops/skill-ops.test.ts" &&
        file !== "src/bench/people-pack.test.ts" &&
        /people-engine\/v\d|PEOPLE_PACK\s*=/.test(text(file)),
    );
    expect(naming).toEqual(["src/bench/people-pack.ts"]);
    // Nothing else reads a pack file by its path: only the loader opens the folder.
    const opening = code.filter(
      (file) =>
        /\.(ts|mjs|js)$/.test(file) &&
        !file.endsWith(".test.ts") &&
        file !== "src/bench/people-pack.ts" &&
        /people-engine\//.test(text(file)) &&
        // The packager's comment names the loader's folder by its setting.
        !/people-engine\/\$\{PEOPLE_PACK\}/.test(text(file)),
    );
    expect(opening).toEqual([]);
  });

  it("leaves no v1, v2 or whole-figure file to reference or package", () => {
    for (const gone of [
      "art/people-engine/v1",
      "art/people-engine/v2",
      "art/people-whole",
      "art/people-rooms/poses",
    ]) {
      expect(existsSync(new URL(gone, ROOT)), gone).toBe(false);
      expect(
        tracked.filter((file) => file.startsWith(`${gone}/`)),
        gone,
      ).toEqual([]);
      expect(
        code.filter(
          (file) =>
            file !== "src/bench/people-pack.test.ts" &&
            text(file).includes(gone),
        ),
        gone,
      ).toEqual([]);
    }
    // The desktop build copies the folder the loader opens; only the pack in use is in it.
    expect(readdirSync(new URL("art/people-engine/", ROOT))).toEqual([
      PEOPLE_PACK,
    ]);
  });

  it("serves every figure by its own path, a kit in its palette colors", () => {
    for (const figure of packFigures())
      expect(figureAtPath(figureUrl(figure).split("?")[0]!), figure.id).toBe(
        figure,
      );
    const kit = packFigures().find((row) => row.kind === "kit")!;
    const person = packPeople().find((row) => row.id === kit.person)!;
    const [top] = Object.keys(person.palettes.top!);
    const plain = figurePng(kit);
    const painted = figurePng(kit, { top: top! });
    expect(painted.subarray(1, 4).toString()).toBe("PNG");
    expect(painted.equals(plain)).toBe(false);
    // A color not in the palette is not painted.
    expect(figurePng(kit, { top: "no such color" }).equals(plain)).toBe(true);
  });

  it("has a figure for every mannequin on every plate, fitted head and feet to the mannequin", () => {
    for (const plate of plates())
      for (const spot of plate.spots) {
        const figure = packFigures().find((row) => row.pose === spot.pose);
        expect(figure, `${plate.scene} ${spot.id} ${spot.pose}`).toBeTruthy();
        const box = fitOn(figure!, plate, spot);
        const [width, height] = plate.size;
        const scale = ((box.widthPercent / 100) * width) / figure!.size[0];
        const headX = (box.leftPercent / 100) * width + figure!.head.x * scale;
        const headTop =
          (box.topPercent / 100) * height + figure!.head.top * scale;
        const bottom = ((box.topPercent + box.heightPercent) / 100) * height;
        expect(headX).toBeCloseTo(spot.head.x, 3);
        expect(headTop).toBeCloseTo(spot.head.top, 3);
        if (spot.feet !== undefined) {
          // Standing or seated: the feet on the mannequin's feet.
          expect(
            (box.topPercent / 100) * height + figure!.feet.y * scale,
          ).toBeCloseTo(spot.feet, 3);
        } else {
          // Behind a desk: head top to hands where the figure's hands row is
          // in the manifest, else the mannequin's head width; cut off at the hands.
          expect(bottom).toBeCloseTo(spot.hands!, 3);
          if (figure!.hands === undefined)
            expect(figure!.head.width * scale).toBeCloseTo(spot.head.width, 3);
          const withHands = fitOn(
            { ...figure!, hands: figure!.feet.y / 2 },
            plate,
            spot,
          );
          const handScale =
            ((withHands.widthPercent / 100) * width) / figure!.size[0];
          expect(
            (withHands.topPercent / 100) * height +
              (figure!.feet.y / 2) * handScale,
          ).toBeCloseTo(spot.hands!, 3);
        }
      }
  });

  it("offers a new manifest row in the creator with no code change", async () => {
    // A seventh person, added the way the art session adds one: a row in the
    // manifest (here a copy of a painted person under a new id and build).
    const manifestPath = new URL(
      `art/people-engine/${PEOPLE_PACK}/manifest.json`,
      ROOT,
    ).pathname;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const model = manifest.people.find(
      (row: { sex: string }) => row.sex === "woman",
    );
    manifest.people.push({ ...model, id: "woman-tall", build: "tall" });
    manifest.figures.push(
      ...manifest.figures
        .filter((row: { person: string }) => row.person === model.id)
        .map((row: { id: string }) => ({
          ...row,
          id: row.id.replace(model.id, "woman-tall"),
          person: "woman-tall",
        })),
    );
    vi.resetModules();
    vi.doMock("node:fs", async () => {
      const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
      const readFileSync = ((path: unknown, ...rest: unknown[]) =>
        String(path instanceof URL ? path.pathname : path) === manifestPath
          ? JSON.stringify(manifest)
          : (fs.readFileSync as (...args: unknown[]) => unknown)(
              path,
              ...rest,
            )) as typeof fs.readFileSync;
      return { ...fs, default: { ...fs, readFileSync }, readFileSync };
    });
    const creator = await import("./appearance");
    let look = creator.drawnAppearance("female", "new-row", 0);
    const seen = new Set<string>();
    for (let n = 0; n < 8; n++) {
      seen.add(
        creator
          .appearanceRows(look, "female")
          .find((row) => row.id === "build")!.value,
      );
      look = creator.moveAppearance(look, "female", "build", 1);
    }
    expect(seen).toContain("Tall");
    vi.doUnmock("node:fs");
    vi.resetModules();
  });
});
