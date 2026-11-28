import { describe, expect, it } from "vitest";
import { NoPlayerHereError } from "../../src/bench/world";
import { drawPlace, type DrawnPlace } from "../core2-year/place";
import { openFirstPlace } from "./pass-over";

/** A draw's place as the draw makes it, so the test names no town and no seed. */
const drawn = (seed: string) => drawPlace(seed, "speed-year");

describe("a speed run passes over a drawn place the world refuses", () => {
  it("tries the run's own draw first, then the next draws, naming each place passed over", () => {
    const seen: string[] = [];
    const said: string[] = [];
    const refused = new Set([drawn("run").key, drawn("run:1").key]);
    const opened = openFirstPlace(
      "run",
      "speed-year",
      (place: DrawnPlace) => {
        seen.push(place.key);
        if (refused.has(place.key)) throw new NoPlayerHereError(place.key, 8);
        return `world of ${place.key}`;
      },
      { say: (line) => said.push(line) },
    );
    expect(seen[0]).toBe(drawn("run").key);
    expect(opened.drawSeed).toBe("run:2");
    expect(opened.place.key).toBe(drawn("run:2").key);
    expect(opened.world).toBe(`world of ${drawn("run:2").key}`);
    expect(opened.passed).toHaveLength(2);
    expect(said).toHaveLength(2);
    expect(said[0]).toContain(drawn("run").name);
    expect(said[0]).toContain("seed run");
    expect(said[1]).toContain("seed run:1");
    expect(said[0]).toContain("group quarters");
  });

  it("opens the first draw unchanged where it is accepted", () => {
    const opened = openFirstPlace("quiet", "speed-year", (place) => place.key);
    expect(opened.passed).toEqual([]);
    expect(opened.drawSeed).toBe("quiet");
    expect(opened.world).toBe(drawn("quiet").key);
  });

  it("passes over nothing else: any other error stops the run, and so do too many refusals", () => {
    expect(() =>
      openFirstPlace("boom", "speed-year", () => {
        throw new Error("a real fault");
      }),
    ).toThrow("a real fault");
    expect(() =>
      openFirstPlace(
        "never",
        "speed-year",
        (place) => {
          throw new NoPlayerHereError(place.key, 3);
        },
        { tries: 3, say: () => undefined },
      ),
    ).toThrow(/no place opened in 3 draws of seed never/);
  });
});
