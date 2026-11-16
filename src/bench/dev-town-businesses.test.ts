// @vitest-environment node
/**
 * Dev mode's Businesses section reads the town's businesses by kind and why
 * the town opened with as many as it did. Pinned place and seed: Edgar,
 * Wisconsin (5522550, edgar-petition-1), a small town opened at its Census
 * size, before any day is played.
 */
import { describe, expect, it } from "vitest";
import controls from "./data/controls.json" with { type: "json" };
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import { townBusinesses } from "./dev-town-businesses";
import { businessReason } from "./ui/dev-businesses.mjs";
import { buildBenchWorld } from "./world";

setBookkeeping(false);

describe("dev mode's Businesses section (Edgar, Wisconsin, 5522550, seed edgar-petition-1)", () => {
  it("lists every business of the town by kind with the opening's reason for its count", () => {
    const world = buildBenchWorld("edgar-petition-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "5522550",
    });
    const town = lawChain(coreAPI(world.core)).townPlaceId;
    const view = townBusinesses(world.core, town);
    const retail = view.kinds.find((row) => row.kind === "retail")!;
    // Before any day is played, the town has the businesses it opened with.
    expect(retail.opening).not.toBeNull();
    expect(retail.open).toBe(retail.opening!.count);
    expect(retail.openedSince).toBe(0);
    expect(retail.businesses.every((row) => row.workers > 0)).toBe(true);
    const listed = view.kinds.reduce((n, row) => n + row.businesses.length, 0);
    const books = [...world.core.finance.businesses.keys()].filter((id) => {
      const org = world.core.organizations.get(id);
      return org?.placeId === town && !org.outsideFlow;
    });
    expect(listed).toBe(books.length);
    // The reason names the town's workers, the county's usual size and the count.
    const reason = businessReason(retail, controls.devBusinesses);
    expect(reason).toContain("county");
    expect(reason).toContain(`so ${retail.opening!.count}.`);
    expect(reason).not.toMatch(/\{[a-z]+\}/);
    const police = view.kinds.find((row) => row.kind === "police");
    if (police)
      expect(businessReason(police, controls.devBusinesses)).toBe(
        controls.devBusinesses.publicEmployer,
      );
  }, 90_000);
});
