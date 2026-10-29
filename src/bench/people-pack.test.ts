// The people pack is swapped by one setting and grown by manifest rows
// (owner, Oct 29: "make it to where these can be updated very easily").
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type * as NodeFs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  PEOPLE_PACK,
  figureAtPath,
  figurePng,
  figureUrl,
  packFigures,
  packPeople,
} from "./people-pack";
import { depthOf, plates } from "./mannequin-plates";
import {
  appearanceRows,
  drawnAppearance,
  figureFor,
  moveAppearance,
} from "./appearance";
import type { CoreState } from "../core2/types";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { stagePeople } from "./scene";
import {
  figureForSpot,
  fitOn,
  packPersonOf,
  portraitPose,
} from "./whole-figures";

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

  it("leaves no v1, v2, v3 or whole-figure file to reference or package", () => {
    for (const gone of [
      "art/people-engine/v1",
      "art/people-engine/v2",
      "art/people-whole",
      "art/people-rooms/poses",
      "art/people-engine/v3",
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

  it("fits every plate to a backdrop the game has, with the retired Oval rooms gone", () => {
    const manifest = JSON.parse(text("art/backdrops/manifest.json")) as {
      backdrops: { file: string; place: string }[];
    };
    const files = new Set(manifest.backdrops.map((row) => row.file));
    for (const plate of plates())
      expect(files.has(plate.backdrop), plate.scene).toBe(true);
    // The standard Oval Office and address replaced these (people-pack-v4, step 2).
    expect(plates().map((plate) => plate.scene)).not.toContain("oval-briefing");
    expect(plates().map((plate) => plate.scene)).not.toContain("oval-address");
    for (const place of ["oval-office-resolute", "oval-address-close"]) {
      expect(
        manifest.backdrops.filter((row) => row.place === place),
        place,
      ).toEqual([]);
      expect(
        existsSync(new URL(`art/backdrops/occluders/${place}`, ROOT)),
        place,
      ).toBe(false);
    }
    // The President's office is the standard wide shot.
    expect(
      (
        JSON.parse(text("src/bench/data/scene-places.json")) as {
          officeWorkplaces: Record<string, string[]>;
        }
      ).officeWorkplaces.president,
    ).toEqual(["oval-office-standard"]);
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

  it("draws the same person the same in one world and differently across worlds", () => {
    // The scene seeds an official known only by their term with the world's
    // seed and their id (scene.ts whoOf), so the President is not the same
    // painted person in every world.
    const id = "official:term:seat:US:president:2025-01-20";
    const who = (world: string) => ({
      id,
      birthDate: "1960-01-01",
      official: true,
      gender: "male",
      seed: `${world}:${id}`,
    });
    expect(packPersonOf(who("world-a"))).toBe(packPersonOf(who("world-a")));
    const drawn = new Set(
      Array.from({ length: 24 }, (_, n) => packPersonOf(who(`world-${n}`))!.id),
    );
    expect(drawn.size).toBeGreaterThan(1);
  });

  it("never puts a phone or paper in someone's hand at home, and does at a rally", () => {
    // A world with no records but its date: nobody holds office or works here.
    const core = {
      date: "2026-01-01",
      people: new Map(),
      jobs: new Map(),
    } as unknown as CoreState;
    const someone = (n: number) => ({
      id: `person-${n}`,
      birthDate: "1980-01-01",
      official: false,
      seed: `props:${n}`,
    });
    const poses = [...new Set(packFigures().map((row) => row.pose))];
    let held = 0;
    for (const pose of poses)
      for (let n = 0; n < 24; n++) {
        const spot = { ...plates()[0]!.spots[0]!, pose, facing: 0 };
        const home = figureForSpot(
          core,
          someone(n),
          "house-suburban-living",
          spot,
        );
        expect(home?.prop, `${pose} ${home?.id}`).toBeUndefined();
        if (figureForSpot(core, someone(n), "rally-stage", spot)?.prop) held++;
      }
    // Where a phone belongs, someone painted only with one is drawn holding it.
    expect(held).toBeGreaterThan(0);
  });

  it("gives every desk figure the row its hands rest on", () => {
    // Measured by scripts/people/measure-hands.ts, or the art's own where it
    // was drawn behind a table; without it a desk figure's lap shows.
    const missing = packFigures()
      .filter((row) => row.handsRestOnDesk && row.hands === undefined)
      .map((row) => row.id);
    expect(missing).toEqual([]);
  });

  it("draws a figure painted at a missing desk only where a desk stands", () => {
    // Owner, Oct 29: "she has a pen in her hand and she's writing on her green pants".
    const core = {
      date: "2026-01-01",
      people: new Map(),
      jobs: new Map(),
    } as unknown as CoreState;
    const desked = packFigures().filter((row) => row.needsDesk);
    expect(desked.length).toBeGreaterThan(0);
    for (const plate of plates())
      for (const spot of plate.spots)
        for (let n = 0; n < 12; n++) {
          const someone = {
            id: `writer-${n}`,
            birthDate: "1975-01-01",
            official: n % 2 === 0,
            seed: `desk:${n}`,
          };
          const desk = { ...spot, deskEdge: undefined };
          const figure = figureForSpot(
            core,
            someone,
            "oval-office-standard",
            desk,
          );
          expect(figure?.needsDesk, `${spot.id} ${figure?.id}`).toBeFalsy();
        }
    for (const row of desked) expect(portraitPose(row), row.id).toBe(false);
  });

  it("draws farther spots first: the desk before anyone standing in front of it", () => {
    // The Oval Office wide shot: a desk spot and people standing before it.
    const office = plates().find(
      (plate) =>
        plate.spots.some((spot) => spot.hands !== undefined) &&
        plate.spots.some((spot) => spot.feet !== undefined),
    )!;
    const desk = office.spots.find((spot) => spot.hands !== undefined)!;
    const front = office.spots.filter(
      (spot) => spot.feet !== undefined && spot.feet > desk.hands!,
    );
    expect(front.length).toBeGreaterThan(0);
    for (const spot of front) expect(depthOf(desk)).toBeLessThan(depthOf(spot));
  });

  it("shows everyone standing in the creator and in their portrait", () => {
    // Owner, Oct 29: "people shouldn't be sitting in their image creator".
    for (const person of packPeople()) {
      const gender = person.sex === "woman" ? "female" : "male";
      let look = drawnAppearance(gender, person.id, 0);
      for (let n = 0; n < 12; n++) {
        for (const clothes of ["everyday", "work"] as const) {
          const figure = figureFor(look, clothes)!;
          expect(figure.seat, `${look.person} ${clothes}`).toBe("none");
        }
        look = moveAppearance(look, gender, "work", 1);
      }
    }
  });

  it("lists every work look a person has in the creator, three or more, none of them everyday clothes", () => {
    let look = drawnAppearance("male", "looks", 0);
    const seen = new Set<string>();
    for (let n = 0; n < 12; n++) {
      seen.add(
        appearanceRows(look, "male").find((row) => row.id === "work")!.value,
      );
      expect(figureFor(look, "work")!.dress).not.toBe("casual");
      look = moveAppearance(look, "male", "work", 1);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it("dresses an official at a government place in work clothes only", () => {
    // Owner, Oct 29: the President renders in work clothes, not everyday ones.
    const core = {
      date: "2026-01-01",
      people: new Map(),
      jobs: new Map(),
    } as unknown as CoreState;
    for (const plate of plates())
      for (const spot of plate.spots)
        for (let n = 0; n < 12; n++) {
          const official = {
            id: `official-${n}`,
            birthDate: "1970-01-01",
            official: true,
            seed: `work:${n}`,
          };
          const figure = figureForSpot(
            core,
            official,
            "oval-office-standard",
            spot,
          );
          if (figure) expect(figure.dress, figure.id).not.toBe("casual");
        }
  });

  it(
    "seats an office holder by default and stands them when the occasion calls for it",
    { timeout: 600_000 },
    () => {
      const seed =
        process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
      const place = drawPlace(seed, "people-pack-occasion");
      const where = `${place.name} (${place.key}), seed ${seed}`;
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const president = world.director.ledger.opening!.president;
      const office = plates().find((plate) =>
        plate.spots.some((spot) => spot.role === "president" && spot.feet),
      )!;
      const stage = (occasion?: string) =>
        stagePeople(
          world.core,
          office.backdrop,
          [{ id: president.id, name: president.name, reason: "official" }],
          undefined,
          occasion,
        ).people[0];
      const spotOf = (id: string | undefined) =>
        office.spots.find((spot) => spot.id === id);
      const seated = stage();
      if (seated) expect(spotOf(seated.spotId)!.seat, where).not.toBe("none");
      const standing = stage("ceremony");
      if (standing) expect(spotOf(standing.spotId)!.seat, where).toBe("none");
      // Somewhere in the room either way: the President is painted sitting or standing.
      expect(seated ?? standing, where).toBeTruthy();
    },
  );

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
      const fs = await vi.importActual<typeof NodeFs>("node:fs");
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
