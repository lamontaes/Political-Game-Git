import { afterEach, describe, expect, it } from "vitest";
import { piecesInput } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { setBookkeeping } from "./bookkeeping";
import { forgetOldExperiences } from "./knowledge-retention";
import { restoreWorld, snapshotWorld, type WorldSnapshot } from "./snapshot";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { parameter } from "./parameters";
import { addDays, makeIsoDate } from "./kernel/dates";

const fact = (key: string, value: string, learnedAt: string) => ({
  key,
  value,
  learnedAt,
  sourceId: value,
  access: "perceived" as const,
});

function world(): { core: CoreState; personId: string } {
  const core = createLifeCore(piecesInput());
  const personId = [...core.people.keys()][0]!;
  core.date = "2026-01-01";
  const api = coreAPI(core);
  api.observe(personId, fact("event:old:experienced", "old", "2025-01-02"));
  api.observe(personId, fact("event:cause:experienced", "cause", "2025-01-02"));
  api.observe(personId, fact("event:new:experienced", "new", "2025-12-20"));
  api.observe(personId, fact("crime:old", "old", "2025-01-02"));
  core.people.get(personId)!.drives.set("drive", {
    id: "drive",
    kind: "cause",
    sourceEventId: "cause",
    topic: "t",
    desiredChange: "c",
    strength: 1,
  });
  return { core, personId };
}

const keys = (core: CoreState, personId: string) =>
  [...core.knowledgeByPerson.get(personId)!.keys()].sort();

describe("forgetting old experiences", () => {
  afterEach(() => setBookkeeping(false));

  it("drops an old bare experience key but keeps a held drive's source, recent keys and other facts", () => {
    setBookkeeping(false);
    const { core, personId } = world();
    forgetOldExperiences(core);
    expect(keys(core, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });

  it("forgets the same keys with bookkeeping on", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    forgetOldExperiences(core);
    expect(keys(core, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });

  it("forgets a drive's source the first month after the drive is gone", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    forgetOldExperiences(core);
    core.people.get(personId)!.drives.delete("drive");
    core.date = "2026-02-01";
    forgetOldExperiences(core);
    expect(keys(core, personId)).toEqual([
      "crime:old",
      "event:new:experienced",
    ]);
  });

  it("keeps a key learned again until its new day is old", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    coreAPI(core).observe(
      personId,
      fact("event:old:experienced", "old", "2025-12-20"),
    );
    forgetOldExperiences(core);
    expect(keys(core, personId)).toContain("event:old:experienced");
    core.date = "2026-04-01";
    forgetOldExperiences(core);
    expect(keys(core, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
    ]);
  });

  it("lets the player keep every key, and forgets a former player's old ones", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    core.playerId = personId;
    forgetOldExperiences(core);
    expect(keys(core, personId)).toContain("event:old:experienced");
    core.playerId = undefined;
    core.date = "2026-02-01";
    forgetOldExperiences(core);
    expect(keys(core, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });

  it("keeps the queue in a saved world", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    const saved = JSON.stringify(snapshotWorld(core));
    const loaded = createLifeCore(piecesInput());
    restoreWorld(loaded, JSON.parse(saved) as WorldSnapshot);
    forgetOldExperiences(loaded);
    expect(keys(loaded, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });

  it("forgets a back-dated key, written after its day left the queue, once its drive is gone", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    const api = coreAPI(core);
    api.observe(personId, fact("event:gone:experienced", "gone", "2025-02-03"));
    forgetOldExperiences(core);
    expect(keys(core, personId)).not.toContain("event:gone:experienced");
    const drives = core.people.get(personId)!.drives;
    drives.set("late", {
      id: "late",
      kind: "cause",
      sourceEventId: "late",
      topic: "t",
      desiredChange: "c",
      strength: 1,
    });
    // As a person filled in from the counts is: the drive's source on the day it formed.
    core.date = "2026-01-15";
    api.observe(personId, fact("event:late:experienced", "late", "2025-02-03"));
    core.date = "2026-02-01";
    forgetOldExperiences(core);
    expect(keys(core, personId)).toContain("event:late:experienced");
    drives.delete("late");
    core.date = "2026-03-01";
    forgetOldExperiences(core);
    // The recent key stays only while it is younger than the window.
    const cutoff = addDays(
      makeIsoDate(core.date),
      -parameter("experiencedKeyRetentionDays"),
    );
    expect(keys(core, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
      ...("2025-12-20" >= cutoff ? ["event:new:experienced"] : []),
    ]);
  });

  it("forgets a former player's old keys when the world is saved and loaded between the change and the pass", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    core.playerId = personId;
    forgetOldExperiences(core);
    core.playerId = undefined;
    const saved = JSON.stringify(snapshotWorld(core));
    const loaded = createLifeCore(piecesInput());
    restoreWorld(loaded, JSON.parse(saved) as WorldSnapshot);
    loaded.date = "2026-02-01";
    forgetOldExperiences(loaded);
    expect(keys(loaded, personId)).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });

  it("rebuilds the queue for a save made before it existed", () => {
    setBookkeeping(true);
    const core = createLifeCore(piecesInput());
    const personId = [...core.people.keys()][0]!;
    // Written straight into the facts, as a world from before the queue holds them.
    const known = core.knowledgeByPerson.get(personId)!;
    for (const [key, value, learnedAt] of [
      ["event:old:experienced", "old", "2025-01-02"],
      ["event:new:experienced", "new", "2025-12-20"],
    ] as const)
      known.set(key, fact(key, value, learnedAt));
    core.date = "2026-01-01";
    const saved = JSON.stringify(snapshotWorld(core));
    // A world built fresh from the recipe already holds a queue of its own.
    const loaded = createLifeCore(piecesInput());
    loaded.date = "2026-01-01";
    coreAPI(loaded).observe(
      personId,
      fact("event:built:experienced", "built", "2026-01-01"),
    );
    restoreWorld(loaded, JSON.parse(saved) as WorldSnapshot);
    forgetOldExperiences(loaded);
    expect(keys(loaded, personId)).toEqual(["event:new:experienced"]);
  });

  it("checks the queue against every fact with bookkeeping on", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    core.knowledgeByPerson
      .get(personId)!
      .set(
        "event:unqueued:experienced",
        fact("event:unqueued:experienced", "unqueued", "2025-01-02"),
      );
    expect(() => forgetOldExperiences(core)).toThrow(/missed/);
  });
});
