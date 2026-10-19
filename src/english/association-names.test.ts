import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
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
  const withTopic = found("organization:cause-group:test:one", employer.id);
  const plain = found("organization:cause-group:test:two");
  for (const name of [withTopic, plain]) {
    expect(name, where).not.toMatch(/organization:|cause-group/);
    expect(name.length, where).toBeGreaterThan(0);
    expect(name, where).not.toMatch(/[{}]/);
  }
  expect(withTopic, where).toContain(employer.name);
  // The same group is always worded the same way.
  expect(organizationName(core, "organization:cause-group:test:one")).toBe(
    withTopic,
  );
  // An employer keeps its own name.
  expect(organizationName(core, employer.id)).toBe(employer.name);
}, 3_600_000);
