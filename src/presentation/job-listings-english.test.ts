import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { drawRandomPlace } from "../../tests/support/random-place";
import { deserializeWorld, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation/types";
import { openJobListings } from "../simulation/job-market";
import { openOrdinaryLife } from "./ordinary-life";
import { createExplicitGeographyLife } from "./new-game-geography";
import { JobListingsPanel } from "../player/JobListingsPanel";
import { renderGroundedEnglish } from "./grounded-english";
import {
  EMPTY_JOB_LISTINGS_BANK,
  emptyJobListingsLine,
  emptyJobListingsPacket,
} from "./job-listings-english";

describe("the Jobs sentence comes from saved listing facts", () => {
  let world: World;
  let personId: EntityId;
  beforeAll(() => {
    const seed = "team8-jobs-english";
    const place = drawRandomPlace(seed, (row) => row.scope === "locality");
    const life = createExplicitGeographyLife({
      placeKey: place.key,
      seed,
      startAge: 24,
    } as Parameters<typeof createExplicitGeographyLife>[0]);
    world = life.game.world;
    personId = life.game.playerPersonId;
  }, 60_000);

  it("renders the engine sentence on the actual panel without changing the world", () => {
    const before = serializeWorld(world);
    const packet = emptyJobListingsPacket(world, personId);
    expect(packet).not.toBeNull();
    const result = renderGroundedEnglish(packet!, EMPTY_JOB_LISTINGS_BANK);
    expect(result.kind).toBe("rendered");
    if (result.kind !== "rendered") throw new Error(result.reasons.join(", "));
    expect(result.usedFactKeys).toEqual(["empty-listings"]);
    expect(result.sourceRecordIds).toContain(world.id);
    const html = renderToStaticMarkup(
      createElement(JobListingsPanel, {
        world,
        onWorldChange: () => {
          throw new Error("Reading Jobs wrote to the world.");
        },
      }),
    );
    expect(html).toContain(result.text);
    expect(html).not.toContain(
      "Nobody here is advertising an opening right now.",
    );
    expect(serializeWorld(world)).toBe(before);
    expect(emptyJobListingsLine(deserializeWorld(before), personId)).toBe(
      result.text,
    );
  });

  it("refuses an empty-list assertion whose saved fact support is missing", () => {
    const packet = emptyJobListingsPacket(world, personId)!;
    const result = renderGroundedEnglish(
      { ...packet, facts: {} },
      EMPTY_JOB_LISTINGS_BANK,
    );
    expect(result.kind).toBe("missing-context");
    expect(
      emptyJobListingsPacket(world, "missing-person" as EntityId),
    ).toBeNull();
    expect(
      emptyJobListingsPacket(
        { ...world, control: { kind: "observer" } },
        personId,
      ),
    ).toBeNull();
  });

  it("omits the empty sentence when the canonical writer posts an opening", () => {
    const posted = openOrdinaryLife(world, personId);
    expect(openJobListings(posted, personId).length).toBeGreaterThan(0);
    expect(emptyJobListingsPacket(posted, personId)).toBeNull();
    expect(emptyJobListingsLine(posted, personId)).toBeNull();
  });
});
