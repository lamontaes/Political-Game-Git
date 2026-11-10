/**
 * The person card tells what happened in play (the life record, docs/design/life-record.md): in a
 * drawn place, after 60 days and a job lost and an illness recorded for a member of the player's
 * household, that member's card tells both as sentences on those records' ids, and every line of
 * the cards of the member and of the player opens a record in dev mode's Trace. The place and
 * seed are in every message; replay with LIFE_SEED and LIFE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, IsoDate } from "../core2/types";
import { knownCard } from "./card";
import { traceNode } from "./dev-trace";
import { buildBenchWorld } from "./world";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "card-life");
const placeKey = process.env.LIFE_PLACE_KEY ?? drawn.key;

it("a household member's card tells a job lost and an illness from play, and every line opens a record", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const { core, director, playerId } = world;
  const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;
  advanceCore(core, addDays(makeIsoDate(core.date), 60));
  const player = core.people.get(playerId!)!;
  const member = [...(core.households.get(player.householdId)?.memberIds ?? [])]
    .map((id) => core.people.get(id))
    .find((row) => row && row.id !== playerId && row.alive);
  expect(member, `${where}: a living household member`).toBeDefined();
  const orgId = [...core.organizations.values()].find(
    (row) => row.name && row.kind !== "government",
  )!.id;
  const source = {
    tag: "ESTIMATED" as const,
    asOf: core.date as IsoDate,
    citation: "A test of the person card.",
    estimatedFrom: "card-life.test.ts",
  };
  const lost = `event:work.job-lost:${core.date}:card-life-${member!.id}`;
  const ill = `health.serious-illness:${member!.id}:${core.date}`;
  const common = {
    date: core.date as IsoDate,
    personIds: [member!.id],
    placeId: member!.placeId,
    source,
  };
  const api = coreAPI(core);
  api.emit({
    ...common,
    id: lost,
    kind: "work.job-lost",
    publicRecord: false,
    topic: orgId,
    facts: { decidedBy: orgId, organizationId: orgId },
  } as CoreEventInput);
  api.emit({
    ...common,
    id: ill,
    kind: "health.serious-illness",
    topic: "health:serious-illness",
    facts: { [`event:${ill}:condition`]: "serious-illness" },
  } as CoreEventInput);

  const card = knownCard(core, playerId!, member!.id);
  const byRecord = new Map(card.history.map((line) => [line.recordId, line]));
  expect(byRecord.has(lost), `${where}: the job lost, ${lost}`).toBe(true);
  expect(byRecord.has(ill), `${where}: the illness, ${ill}`).toBe(true);
  expect(byRecord.get(lost)!.text, where).toContain(
    core.organizations.get(orgId)!.name,
  );
  expect(byRecord.get(lost)!.kind, where).toBe("work");
  expect(byRecord.get(ill)!.kind, where).toBe("health");

  // Every line of both cards opens a record in Trace.
  const mine = knownCard(core, playerId!, playerId!);
  const lines = [...card.history, ...mine.history];
  const missing = lines.filter(
    (line) =>
      traceNode(core, director, line.recordId).answer === "not-a-record",
  );
  expect(
    missing.map((line) => `${line.recordId}: ${line.text}`),
    where,
  ).toEqual([]);
  // The player's own life is told to them, in the second person.
  expect(mine.history.length, where).toBeGreaterThan(0);
  console.log(
    `card-life: ${where}; ${member!.id} told ${card.history.length} lines, the player ${mine.history.length}; all ${lines.length} open in Trace`,
  );
}, 600_000);
