import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";

// Owner's Oct 8 playtest, defect 12: a stranger's person card must not show
// their job or their age. Only what the viewer could know shows: family,
// housemates and coworkers carry their work; the rest are known by sight.
it("shows a stranger without work or age, and a housemate or relative with them", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const place = drawPlace(seed, "card-stranger");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const viewer = core.people.get(world.playerId!)!;
  const viewerOrg = viewer.jobId
    ? core.jobs.get(viewer.jobId)?.organizationId
    : undefined;
  const near = new Set<string>([
    ...viewer.familyIds,
    ...(core.households.get(viewer.householdId)?.memberIds ?? []),
  ]);
  for (const fact of viewer.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      near.add(fact.facts.otherPersonId);
  const employed = [...core.people.values()].filter(
    (p) => p.alive && p.jobId && p.id !== viewer.id,
  );
  const stranger = employed.find(
    (p) =>
      !near.has(p.id) &&
      core.jobs.get(p.jobId!)?.organizationId !== viewerOrg &&
      p.householdId !== viewer.householdId,
  );
  expect(stranger, `${where}: an employed stranger`).toBeDefined();
  const card = knownCard(core, viewer.id, stranger!.id);
  expect(card.work, where).toBeNull();
  expect(card.age, where).toBeNull();
  expect(JSON.stringify(card), where).not.toMatch(/wage|hourly|salary/i);
  // A housemate with a job shows their work.
  const housemate = employed.find((p) => p.householdId === viewer.householdId);
  if (housemate)
    expect(knownCard(core, viewer.id, housemate.id).work, where).not.toBeNull();
}, 600_000);
