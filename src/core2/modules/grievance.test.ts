import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI, registerModule } from "../state";
import { residentFacts } from "./residents";
import { GRIEVANCE_MODULE_ID, type GrievanceRow } from "./grievance";
import { JOBS_MODULE_ID } from "./jobs";
import type { CoreState } from "../types";

// A dispute between two named people writes a grievance record (world-police-
// patrol-and-grievance-causes, part 2): in a drawn place played for a year,
// each layoff the jobs engine decides and each eviction the housing engine
// carries out leaves a grievance naming the person hurt and the person they
// hold it against, by record id, with the engine's own cause record on it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const known = (core: CoreState, id: string) =>
  core.people.has(id) ||
  core.husks.has(id) ||
  residentFacts(core, id) !== undefined;

it(`a layoff or an eviction writes a grievance between two named people (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "grievance-record");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const start = gameStartDate();
  const world = buildBenchWorld(place.seed, start, {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  // Who each layoff and eviction named, as the world held them that day (a
  // person can die or move away later in the year).
  const knownAt = new Map<string, Set<string>>();
  registerModule(core, {
    id: "test-grievance-tap",
    eventKinds: ["work.job-lost", "housing.eviction"],
    onEvent: (_api, event) => {
      const facts = event.facts ?? {};
      const ids = [
        ...event.personIds,
        ...(facts["counted-subjects"]
          ? (JSON.parse(facts["counted-subjects"]) as string[])
          : []),
        facts["counted-subject"],
        facts.decidedBy,
      ].filter((id): id is string => !!id && known(core, id));
      knownAt.set(event.id, new Set(ids));
    },
  });
  advanceCore(core, `${Number(start.slice(0, 4)) + 1}${start.slice(4)}`);

  const rows = api
    .moduleState(GRIEVANCE_MODULE_ID)
    .table("grievances")
    .rows() as unknown as GrievanceRow[];
  const changes = api.moduleState(JOBS_MODULE_ID).table("changes");
  const cases = api.moduleState("housing").table("cases");
  const layoffs = rows.filter((row) => row.kind === "layoff");
  const evictions = rows.filter((row) => row.kind === "eviction");
  // The layoffs the jobs engine decided, each by a person other than the
  // worker, both in the world that day.
  const laidOff = (
    changes.query("byKind", ["layoff"]) as unknown as {
      id: string;
      date: string;
      jobId: string;
      decidedBy: string;
      personId: string;
    }[]
  ).filter((row) => {
    const named = knownAt.get(`event:work.job-lost:${row.date}:${row.jobId}`);
    return (
      !!named?.has(row.decidedBy) &&
      named.has(row.personId) &&
      row.decidedBy !== row.personId
    );
  });
  const removed = (cases.rows() as unknown as { stage?: string }[]).filter(
    (row) => row.stage === "removed",
  );
  process.stdout.write(
    `GRIEVANCE ${where}: ${layoffs.length} from layoffs (${laidOff.length} layoffs decided by a person), ${evictions.length} from evictions (${removed.length} households removed), ${rows.filter((row) => !row.open).length} ended\n`,
  );
  // Every layoff decided by a person and every removal leaves one grievance.
  expect(layoffs.length, `${where}: layoff grievances`).toBe(laidOff.length);
  expect(evictions.length, `${where}: eviction grievances`).toBe(
    removed.length,
  );
  expect(
    rows.length,
    `${where}: no layoff or eviction in a year`,
  ).toBeGreaterThan(0);
  for (const row of rows) {
    const at = `${where}: ${row.id}`;
    const named = knownAt.get(row.causeEventId);
    expect(named, `${at}: cause event`).toBeDefined();
    expect(named!.has(row.aggrievedId), `${at}: aggrieved`).toBe(true);
    expect(row.aggrievedId, at).not.toBe(row.againstId);
    expect(row.heads, at).toBeGreaterThan(0);
    if (row.kind === "layoff") {
      const change = changes.get(row.causeId) as unknown as
        { kind: string; personId: string; decidedBy: string } | undefined;
      expect(change?.kind, `${at}: cause`).toBe("layoff");
      expect(change?.personId, at).toBe(row.aggrievedId);
      expect(change?.decidedBy, at).toBe(row.againstId);
      expect(named!.has(row.againstId), `${at}: against`).toBe(true);
    } else {
      const found = cases.get(row.causeId) as unknown as
        { stage: string; landlordId: string; householdId: string } | undefined;
      expect(found?.stage, `${at}: cause`).toBe("removed");
      expect(found?.landlordId, at).toBe(row.organizationId);
      expect(found?.householdId, at).toBe(row.householdId);
    }
    if (!row.open) expect(row.endedBy, `${at}: ended by`).toBeTruthy();
  }
  for (const row of [layoffs[0], evictions[0]].filter(Boolean))
    process.stdout.write(
      `GRIEVANCE ${where}: ${row!.id} ${row!.aggrievedId} against ${row!.againstId}, cause ${row!.causeId}${row!.open ? "" : `, ended by ${row!.endedBy}`}\n`,
    );
}, 1_800_000);
