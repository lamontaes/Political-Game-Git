import { afterEach, describe, expect, it } from "vitest";
import { piecesInput } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { setBookkeeping } from "./bookkeeping";
import { forgetOldExperiences } from "./knowledge-retention";
import type { CoreState } from "./types";

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
  const known = core.knowledgeByPerson.get(personId)!;
  known.set(
    "event:old:experienced",
    fact("event:old:experienced", "old", "2025-01-02"),
  );
  known.set(
    "event:cause:experienced",
    fact("event:cause:experienced", "cause", "2025-01-02"),
  );
  known.set(
    "event:new:experienced",
    fact("event:new:experienced", "new", "2025-12-20"),
  );
  known.set("crime:old", fact("crime:old", "old", "2025-01-02"));
  core.people.get(personId)!.drives.set("drive", {
    id: "drive",
    kind: "cause",
    sourceEventId: "cause",
    topic: "t",
    desiredChange: "c",
    strength: 1,
  });
  core.date = "2026-01-01";
  return { core, personId };
}

describe("forgetting old experiences", () => {
  afterEach(() => setBookkeeping(false));

  it("drops an old bare experience key but keeps a held drive's source, recent keys and other facts", () => {
    setBookkeeping(false);
    const { core, personId } = world();
    forgetOldExperiences(core);
    expect([...core.knowledgeByPerson.get(personId)!.keys()].sort()).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });

  it("forgets the same keys with bookkeeping on", () => {
    setBookkeeping(true);
    const { core, personId } = world();
    forgetOldExperiences(core);
    expect([...core.knowledgeByPerson.get(personId)!.keys()].sort()).toEqual([
      "crime:old",
      "event:cause:experienced",
      "event:new:experienced",
    ]);
  });
});
