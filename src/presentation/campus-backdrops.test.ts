import { describe, expect, it } from "vitest";
import manifest from "../../art/campuses/manifest.json";
import { campusPictureFor, campusRecords } from "./campus-backdrops";

describe("college campus pictures", () => {
  it("has a picture file for every painted campus", () => {
    expect(campusRecords().length).toBeGreaterThanOrEqual(50);
    for (const record of campusRecords()) {
      expect(
        campusPictureFor({
          campus: record.campus,
          name: record.name,
          state: record.state,
          kind: "flagship",
        })?.url,
      ).toBeTruthy();
    }
  });

  it("gives every state, D.C. and territory the same ground rules", () => {
    const states = Object.keys(manifest.states);
    expect(states).toHaveLength(56);
    for (const state of states) {
      const ground = manifest.states[state as keyof typeof manifest.states];
      expect(ground.region).toBeTruthy();
      expect(ground.climate).toBeTruthy();
      expect(ground.terrain).toBeTruthy();
    }
  });

  it("shows a college its own campus when it has one", () => {
    const picture = campusPictureFor({
      campus: "princeton",
      name: "Princeton University",
      state: "nj",
      kind: "ivy-league",
    });
    expect(picture?.match).toBe("own");
    expect(picture?.campus.campus).toBe("princeton");
  });

  it("lends a same-state campus first, as Washington State can for Western Washington", () => {
    const picture = campusPictureFor({
      name: "Western Washington University",
      state: "wa",
      kind: "regional-public",
    });
    expect(picture?.match).toBe("same-state");
    expect(picture?.campus.state).toBe("wa");
  });

  it("never lends a campus across climates or ground", () => {
    for (const state of Object.keys(manifest.states)) {
      const ground = manifest.states[state as keyof typeof manifest.states];
      for (const kind of [
        "regional-public",
        "private-college",
        "community-college",
      ] as const) {
        const picture = campusPictureFor({
          name: `A ${kind} in ${state}`,
          state,
          kind,
        });
        if (!picture || picture.match === "same-state") continue;
        expect(picture.campus.climate).toBe(ground.climate);
        expect(picture.campus.terrain).toBe(ground.terrain);
        expect(picture.campus.region).toBe(ground.region);
      }
    }
  });

  it("keeps the same stand-in for the same college", () => {
    const college = {
      name: "Lewis and Clark College",
      state: "or",
      kind: "private-college",
    } as const;
    expect(campusPictureFor(college)?.campus.campus).toBe(
      campusPictureFor(college)?.campus.campus,
    );
  });
});
