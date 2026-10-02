// Controlled canonical opening/source-absence fixtures; not owner-save observations.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createExplicitGeographyLife } from "./new-game-geography";
import { openOrdinaryLife } from "./ordinary-life";
import { openJobListings } from "../simulation/job-market";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
import { projectJobMarket } from "./job-listings-view";
import { JobListingsPanel } from "../player/JobListingsPanel";

const sourceControl = vi.hoisted(() => ({
  omitDescription: false,
  omitWage: false,
}));
vi.mock("./career-path7-provider", async (importOriginal) => {
  const real = await importOriginal<typeof import("./career-path7-provider")>();
  return {
    ...real,
    CAREER_SOURCE_CONTEXT: real.CAREER_SOURCE_CONTEXT.map((row) => ({
      ...row,
      get description() {
        return sourceControl.omitDescription ? undefined : row.description;
      },
      get wage() {
        return sourceControl.omitWage ? null : row.wage;
      },
    })),
  };
});

let officeDescription: string;
let officeTitle: string;
function panel(world: World) {
  return renderToStaticMarkup(
    createElement(JobListingsPanel, {
      world,
      onWorldChange: () => {
        throw new Error("Reading Jobs wrote to the world.");
      },
    }),
  );
}

describe("Jobs describes the recorded occupation from its source", () => {
  let world: World;
  let personId: EntityId;
  let openingId: EntityId;
  beforeAll(async () => {
    const source = await vi.importActual<
      typeof import("./career-path7-provider")
    >("./career-path7-provider");
    const office = source.CAREER_SOURCE_CONTEXT.find(
      (row) => row.id === "43-9061.00",
    )!;
    officeDescription = office.description;
    officeTitle = office.title;
    const seed = "overflow1-job-description-recorded-occupation";
    const place = drawRandomPlace(seed, (row) => row.scope === "locality");
    const life = createExplicitGeographyLife({
      placeKey: place.key,
      seed,
      startAge: 30,
    });
    personId = life.game.playerPersonId;
    world = openOrdinaryLife(life.game.world, personId);
    const opening = openJobListings(world, personId).find(
      (row) => row.occupationClassification === "occupation:office-clerk",
    );
    expect(
      opening,
      "Canonical opening writer must supply the recorded occupation",
    ).toBeDefined();
    openingId = opening!.id;
  }, 60_000);
  afterEach(() => {
    sourceControl.omitDescription = false;
    sourceControl.omitWage = false;
  });

  it("projects and renders the named source description without pay boilerplate or a write", () => {
    const before = serializeWorld(world);
    const listing = projectJobMarket(world, personId).listings.find(
      (row) => row.openingId === openingId,
    )!;
    expect(officeTitle).toBe("Office Clerks, General");
    expect(listing.occupationDescription).toBe(officeDescription);
    const html = panel(world);
    expect(html).toContain(
      renderToStaticMarkup(createElement("p", null, officeDescription)),
    );
    expect(html).not.toMatch(
      /Nationally, this work pays|median of|lowest legal pay|minimum wage/i,
    );
    expect(serializeWorld(world)).toBe(before);
    const continued = deserializeWorld(before);
    expect(
      projectJobMarket(continued, personId).listings.find(
        (row) => row.openingId === openingId,
      )!.occupationDescription,
    ).toBe(officeDescription);
    expect(panel(continued)).toContain(
      renderToStaticMarkup(createElement("p", null, officeDescription)),
    );
    expect(serializeWorld(continued)).toBe(before);
  });

  it("omits an absent source description without inventing duties or a pay substitute", () => {
    sourceControl.omitDescription = true;
    const before = serializeWorld(world);
    const listing = projectJobMarket(world, personId).listings.find(
      (row) => row.openingId === openingId,
    )!;
    expect(listing.occupationDescription).toBeNull();
    const html = panel(world);
    expect(html).not.toContain(officeDescription);
    expect(html).not.toMatch(
      /Nationally, this work pays|median of|lowest legal pay|minimum wage/i,
    );
    expect(serializeWorld(world)).toBe(before);
  });

  it("retains the description when the source has no wage observation", () => {
    sourceControl.omitWage = true;
    const before = serializeWorld(world);
    const listing = projectJobMarket(world, personId).listings.find(
      (row) => row.openingId === openingId,
    )!;
    expect(listing.occupationDescription).toBe(officeDescription);
    expect(panel(world)).toContain(
      renderToStaticMarkup(createElement("p", null, officeDescription)),
    );
    expect(serializeWorld(world)).toBe(before);
  });
});
