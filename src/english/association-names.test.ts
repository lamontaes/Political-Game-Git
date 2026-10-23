import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import bank from "../../data/english/parts/association-names.json" with { type: "json" };
import { organizationName } from "./association-names";

// A founded cause group is named from the bank (pool item
// people-stopgap-drives-player-text-gap): its place, and the organization it
// was founded over when it has one; never its structured key.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "association-names");
const where = `${place.name}, seed ${seed}`;

it(`a founded group is worded from the association bank (${where})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const employer = [...core.organizations.values()].find(
    (org) => org.kind !== "cause-group" && org.name && org.placeId,
  )!;
  const found = (id: string, topic?: string) => {
    api.addOrganization({
      id,
      placeId: employer.placeId,
      name: id,
      kind: "cause-group",
      ...(topic ? { topic } : {}),
      liquidMinor: 0,
      source: { tag: "SOURCED", asOf: core.date, citation: "test" },
    } as never);
    return organizationName(core, id)!;
  };
  found("organization:cause-group:test:one", employer.id);
  found("organization:cause-group:test:two");
  // The authored pieces stay held until the owner grades them
  // (shippable: false), so the engine words nothing yet and a founded group is
  // not shown under a hand-made name: the lookup returns nothing to show.
  expect(
    organizationName(core, "organization:cause-group:test:one"),
  ).toBeUndefined();
  expect(
    organizationName(core, "organization:cause-group:test:two"),
  ).toBeUndefined();
  // The bank holds pieces for both wordings, all held, none carrying a
  // structured key, so grading can release them.
  const parts = (
    bank as unknown as {
      parts: { move: string; text: string; shippable: boolean }[];
    }
  ).parts;
  for (const move of ["association-name-topic", "association-name-plain"]) {
    const group = parts.filter((part) => part.move === move);
    expect(group.length, move).toBeGreaterThan(0);
    for (const part of group) {
      expect(part.shippable, part.text).toBe(false);
      expect(part.text).not.toMatch(/organization:|cause-group/);
    }
  }
  // An employer keeps its own name.
  expect(organizationName(core, employer.id)).toBe(employer.name);
}, 3_600_000);
