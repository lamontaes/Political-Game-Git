import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { countedPersonOf } from "./counted-actor";
import { gameStartDate } from "./game-start";
import { activate } from "./life";
import { drivesReport } from "./modules/drives";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { setTraitProbe } from "./trait-probe";

// A layoff names who decided it. When that is a person still in the wider
// population (a business owner nobody has met), the laid-off worker's grudge
// is held against them, and having it out with them is meeting them: they are
// filled in and the quarrel costs the tie by both people's temperaments
// (relationships.fall-out). Before, only a decider already a full person
// could be confronted, so the decision never ran in a played year.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "grudge-counted-decider");

it(`a grudge against a counted layoff decider is confronted and costs the tie in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const api = coreAPI(core);
  const adult = (birthDate: string) =>
    Number(core.date.slice(0, 4)) - Number(birthDate.slice(0, 4)) >= 25;
  const decider = (residentsRuntime(core)?.store.ids ?? []).find((id) => {
    const row = countedPersonOf(core, id);
    return !core.people.has(id) && row && adult(row.birthDate);
  })!;
  expect(decider, `${where}: a counted adult`).toBeDefined();
  const workers = [...core.people.values()]
    .filter((p) => p.alive && adult(p.birthDate) && p.id !== decider)
    .sort((a, b) => a.id.localeCompare(b.id));
  const organizationId = [...core.organizations.keys()].sort()[0]!;
  // Each worker is laid off by the same counted owner; whoever answers it with a grudge holds it against them.
  let holder: string | undefined;
  for (const worker of workers) {
    api.emit({
      id: `event:work.job-lost:${core.date}:${worker.id}`,
      date: core.date,
      kind: "work.job-lost",
      personIds: [worker.id],
      placeId: worker.placeId,
      publicRecord: false,
      topic: organizationId,
      facts: { decidedBy: decider, organizationId },
      source: {
        tag: "SOURCED",
        citation: "Test layoff decided by a counted owner.",
        asOf: core.date,
      },
    });
    const drive = drivesReport(core).drives.find(
      (row) => row.personId === worker.id && row.kind === "grudge",
    );
    if (drive) {
      expect(drive.targetId, where).toBe(decider);
      holder = worker.id;
      break;
    }
  }
  expect(holder, `${where}: someone held a grudge`).toBeDefined();
  // The grudge names them, so they are filled in from the records, the same
  // person every engine reads (drives.ts driveIdentity).
  expect(core.people.has(decider), `${where}: filled in when named`).toBe(true);

  let falloutCalls = 0;
  setTraitProbe({
    formula: (row) => {
      if (row.decisionId === "relationships.fall-out") falloutCalls++;
    },
  });
  try {
    activate(core, holder!, 1, () => `confront-grudge-target:${decider}`);
  } finally {
    setTraitProbe(undefined);
  }
  // The quarrel ran the personality decision.
  expect(falloutCalls, `${where}: relationships.fall-out ran`).toBeGreaterThan(
    0,
  );
  const key =
    holder! < decider ? `${holder}:${decider}` : `${decider}:${holder}`;
  expect(core.relationships.has(key), where).toBe(true);
}, 600_000);
