import { describe, expect, it } from "vitest";
import manifest from "../../art/campuses/manifest.json" with { type: "json" };
import { campusPictureFor, campusRecords } from "./campus-backdrops";

describe("college campus pictures", () => {
  it("has a picture file for every painted campus", () => {
    expect(campusRecords()).toHaveLength(52);
    expect(manifest.selection.requiredMatch).toEqual([
      "region",
      "climate",
      "terrain",
      "size",
    ]);
    for (const record of campusRecords()) {
      for (const key of manifest.selection.requiredMatch)
        expect(
          record[key as "region" | "climate" | "terrain" | "size"],
        ).toBeTruthy();
    }
    for (const record of campusRecords()) {
      expect(
        campusPictureFor({
          campus: record.campus,
          name: record.name,
          state: record.state,
          kind: "flagship",
          region: record.region,
          climate: record.climate,
          terrain: record.terrain,
          size: record.size,
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
      ...manifest.states.nj,
      size: "medium",
    });
    expect(picture?.match).toBe("own");
    expect(picture?.campus.campus).toBe("princeton");
  });

  it("lends a same-state campus first, as Washington State can for Western Washington", () => {
    const picture = campusPictureFor({
      name: "Western Washington University",
      state: "wa",
      kind: "regional-public",
      ...manifest.states.wa,
      size: "large",
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
          ...ground,
          size: "large",
        });
        if (!picture) continue;
        expect(picture.campus.size).toBe("large");
        expect(picture.campus.climate).toBe(ground.climate);
        expect(picture.campus.terrain).toBe(ground.terrain);
        expect(picture.campus.region).toBe(ground.region);
      }
    }
  });

  it("rejects incompatible tags even for exact identities and same-state choices", () => {
    for (const record of campusRecords()) {
      const target = {
        campus: record.campus,
        name: record.name,
        state: record.state,
        kind: "flagship" as const,
        region: record.region,
        climate: record.climate,
        terrain: record.terrain,
        size: record.size,
      };
      for (const key of manifest.selection.requiredMatch) {
        expect(
          campusPictureFor({ ...target, [key]: "incompatible" }),
        ).toBeNull();
        expect(
          campusPictureFor({
            ...target,
            campus: undefined,
            [key]: "incompatible",
          }),
        ).toBeNull();
      }
      expect(campusPictureFor({ ...target, state: "zz" })).toBeNull();
    }
  });

  it("never lends a wooded ridge to a place with different terrain", () => {
    for (const state of Object.keys(manifest.states)) {
      const ground = manifest.states[state as keyof typeof manifest.states];
      const picture = campusPictureFor({
        name: state,
        state,
        kind: "regional-public",
        ...ground,
        terrain: "wooded-ridge",
        size: "large",
      });
      expect(picture?.campus.terrain ?? "wooded-ridge").toBe("wooded-ridge");
    }
  });

  it("keeps the same stand-in for the same college", () => {
    const college = {
      name: "Lewis and Clark College",
      state: "or",
      kind: "private-college",
      ...manifest.states.or,
      size: "large",
    } as const;
    expect(campusPictureFor(college)?.campus.campus).toBe(
      campusPictureFor(college)?.campus.campus,
    );
  });
});
