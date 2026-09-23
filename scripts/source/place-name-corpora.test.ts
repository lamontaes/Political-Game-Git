import { describe, expect, it } from "vitest";

import COMMITTED from "../../src/simulation/place-name-corpora.json" with { type: "json" };
import {
  honoreeFromSchoolName,
  measurePlaceNameCorpora,
} from "./place-name-corpora";

describe("the measured place-name corpora", () => {
  it("are what the script measures from the shipped directory", () => {
    expect(COMMITTED).toStrictEqual(
      JSON.parse(JSON.stringify(measurePlaceNameCorpora())),
    );
  }, 120_000);

  it("reads an honoree's own surnames, not a husband's or a town's", () => {
    expect(honoreeFromSchoolName("OSCAR RODRIGUEZ RIVERA", "MOROVIS")).toEqual({
      given: "OSCAR",
      surnames: ["RODRIGUEZ", "RIVERA"],
    });
    expect(
      honoreeFromSchoolName("ANGELICA GOMEZ DE BETANCOURT", "ARECIBO"),
    ).toEqual({ given: "ANGELICA", surnames: ["GOMEZ"] });
    expect(honoreeFromSchoolName("LUIS MUNOZ RIVERA UTUADO", "UTUADO")).toEqual(
      { given: "LUIS", surnames: ["MUNOZ", "RIVERA"] },
    );
    expect(honoreeFromSchoolName("RAFAEL DE JESUS", "CAYEY")).toEqual({
      given: "RAFAEL",
      surnames: ["DE JESUS"],
    });
    expect(
      honoreeFromSchoolName("CARMEN NOELIA PERAZA TOLEDO", "GUAYNABO"),
    ).toEqual({ given: "CARMEN", surnames: ["PERAZA", "TOLEDO"] });
    expect(honoreeFromSchoolName("JAGUAL ADENTRO", "SAN LORENZO")).toBeNull();
  });
});
