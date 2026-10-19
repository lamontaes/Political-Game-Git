/**
 * Succession to the presidency in the world the owner plays, on a seed nobody
 * chose: the president's cabinet is named and confirmed at the opening, each
 * secretary a full person; when the president dies the vice president
 * succeeds the same day and the president's nominee, confirmed by both
 * houses, fills the vice presidency; when the president and vice president
 * die together the line passes over the vice president, with why, to the next
 * in line by 3 U.S.C. 19. Each succession is a record and news.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { cabinet, successions } from "./modules/succession";
import { PRESS_MODULE_ID } from "./modules/press";
import { NATIVITY_FACT } from "./nativity";

const seed = process.env.SUCCESSION_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
const api = coreAPI(world.core);
const where = `${world.place.key} (seed ${seed})`;

const holder = (seatId: string) =>
  api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [seatId, "serving"])[0] as unknown as
    TermRow | undefined;

function dies(personIds: readonly string[]) {
  for (const id of personIds) api.updatePerson(id, { alive: false });
  api.emit({
    id: `test-death:${personIds.join("+")}`,
    date: world.core.date,
    kind: "life.death",
    personIds: [...personIds],
    placeId: world.core.people.get(personIds[0]!)!.placeId,
    source: { tag: "SOURCED", citation: "test", asOf: world.core.date },
  });
}

describe(`presidential succession in the played world: ${where}`, () => {
  it("names a confirmed cabinet of full people at the opening", () => {
    const posts = cabinet(api);
    expect(posts.length, where).toBe(15);
    expect(posts[0]!.id).toBe("state");
    expect(posts.at(-1)!.id).toBe("homeland-security");
    for (const post of posts) {
      expect(world.core.people.get(post.holderId)?.alive, post.id).toBe(true);
      const votes = post.confirmation as { yes: number; no: number }[];
      expect(votes[0]!.yes, post.id).toBeGreaterThan(votes[0]!.no);
    }
  });

  it("the vice president succeeds the same day, and the vice presidency is filled", () => {
    const president = holder("seat:US:president")!;
    const vice = holder("seat:US:vice-president")!;
    expect(president.personId, where).toBeTruthy();
    expect(vice.personId, where).toBeTruthy();
    dies([president.personId!]);
    const now = holder("seat:US:president")!;
    expect(now.personId, where).toBe(vice.personId);
    expect(now.startDate).toBe(world.core.date);
    expect(now.reached).toContain("Vice President");
    // The president's nominee holds the vice presidency, a full person.
    const nextVice = holder("seat:US:vice-president")!;
    expect(nextVice.personId).not.toBe(vice.personId);
    expect(world.core.people.get(nextVice.personId!)?.alive).toBe(true);
    expect(nextVice.reached).toContain("both houses");
    // The field of three: the two the bodies passed over stay on the roster as
    // considered and never seated, so they are not seats left empty.
    const field = (
      api
        .moduleState("core2-officials-v1")
        .table("officials")
        .rows() as unknown as {
        seatId: string;
        ended: string | null;
        seated?: false;
      }[]
    ).filter((row) =>
      row.seatId.startsWith(`seat:vice-president:${world.core.date}:`),
    );
    expect(field.length, where).toBe(3);
    expect(field.filter((row) => row.seated === false).length, where).toBe(2);
    for (const row of field.filter((r) => r.seated === false))
      expect(row.ended, where).toBe(world.core.date);
    const records = successions(api);
    expect(records.map((r) => r.position).sort()).toEqual([
      "nominated and confirmed",
      "vice-president",
    ]);
  });

  it("with no vice president able, the line passes to the next in line", () => {
    const president = holder("seat:US:president")!;
    const vice = holder("seat:US:vice-president")!;
    dies([president.personId!, vice.personId!]);
    const record = successions(api).find(
      (r) =>
        r.seatId === "seat:US:president" && r.previousId === president.personId,
    )!;
    expect(record, where).toBeTruthy();
    expect(record.passedOver[0], where).toEqual({
      key: "vice-president",
      why: "not living",
    });
    expect(record.acting).toBe(true);
    expect(record.citation).toMatch(/3 U\.S\.C\. 19/);
    const now = holder("seat:US:president")!;
    expect(now.personId).toBe(record.successorId);
    expect(world.core.people.get(record.successorId)?.alive).toBe(true);
    // The vice presidency is filled again, by a fresh nominee who is living.
    const nextVice = holder("seat:US:vice-president")!;
    expect(nextVice.personId).not.toBe(vice.personId);
    expect(world.core.people.get(nextVice.personId!)?.alive).toBe(true);
    // Every succession is its own record, and the town's press carries it.
    expect(new Set(successions(api).map((r) => r.id)).size).toBe(4);
    expect(
      api.moduleState(PRESS_MODULE_ID).table("wire").get(record.id),
      where,
    ).toBeTruthy();
  });

  it("reads each official's birth record: the president and vice president are native-born, and every one in the line has a record", () => {
    for (const seat of ["seat:US:president", "seat:US:vice-president"]) {
      const person = world.core.people.get(holder(seat)!.personId!)!;
      const birth = person.pastFacts!.find((f) => f.kind === NATIVITY_FACT)!;
      expect(birth.facts, `${where} ${seat}`).toMatchObject({
        nativity: "native",
        residentSince: person.birthDate,
      });
      expect(birth.source.citation).toMatch(/B05003/);
    }
    for (const post of cabinet(api)) {
      const person = world.core.people.get(post.holderId)!;
      expect(
        person.pastFacts!.some((f) => f.kind === NATIVITY_FACT),
        `${where} ${post.id}`,
      ).toBe(true);
    }
  });

  it("a vice president named to a vacancy is eligible to be president, vacancy after vacancy", () => {
    // A fresh copy of the world, so the other tests' deaths don't count here.
    const fresh = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
    const freshApi = coreAPI(fresh.core);
    const termOf = () =>
      freshApi
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:vice-president",
          "serving",
        ])[0] as unknown as TermRow;
    for (let vacancy = 0; vacancy < 10; vacancy++) {
      const sitting = termOf().personId!;
      freshApi.updatePerson(sitting, { alive: false });
      freshApi.emit({
        id: `test-death:vp:${vacancy}`,
        date: fresh.core.date,
        kind: "life.death",
        personIds: [sitting],
        placeId: fresh.core.people.get(sitting)!.placeId,
        source: { tag: "SOURCED", citation: "test", asOf: fresh.core.date },
      });
      const named = termOf();
      expect(named.personId, `${where} vacancy ${vacancy}`).toBeTruthy();
      const birth = fresh.core.people
        .get(named.personId!)!
        .pastFacts!.find((f) => f.kind === NATIVITY_FACT)!;
      expect(birth.facts, `${where} vacancy ${vacancy}`).toMatchObject({
        nativity: "native",
      });
    }
  });

  it("passes over someone whose birth record is foreign-born, naming the record", () => {
    // Edge fixture on a second copy of the same world: the first in line
    // after the vice president is recorded as born abroad.
    const clean = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
    const cleanApi = coreAPI(clean.core);
    const termOf = (a: typeof cleanApi, seatId: string) =>
      a
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"])[0] as unknown as TermRow;
    const kill = (
      core: typeof clean.core,
      a: typeof cleanApi,
      ids: string[],
    ) => {
      for (const id of ids) a.updatePerson(id, { alive: false });
      a.emit({
        id: `test-death:${ids.join("+")}`,
        date: core.date,
        kind: "life.death",
        personIds: ids,
        placeId: core.people.get(ids[0]!)!.placeId,
        source: { tag: "SOURCED", citation: "test", asOf: core.date },
      });
    };
    const first = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
    const firstApi = coreAPI(first.core);
    kill(first.core, firstApi, [
      termOf(firstApi, "seat:US:president").personId!,
      termOf(firstApi, "seat:US:vice-president").personId!,
    ]);
    const next = successions(firstApi).find(
      (r) =>
        r.seatId === "seat:US:president" && r.position !== "vice-president",
    )!;
    const target = next.successorId;
    const person = clean.core.people.get(target)!;
    (person as { pastFacts: unknown }).pastFacts = person.pastFacts!.map((f) =>
      f.kind === NATIVITY_FACT
        ? { ...f, facts: { nativity: "foreign-born" } }
        : f,
    );
    kill(clean.core, cleanApi, [
      termOf(cleanApi, "seat:US:president").personId!,
      termOf(cleanApi, "seat:US:vice-president").personId!,
    ]);
    const record = successions(cleanApi).find(
      (r) =>
        r.seatId === "seat:US:president" && r.position !== "vice-president",
    )!;
    expect(record.successorId, where).not.toBe(target);
    expect(
      record.passedOver.some((p) =>
        /natural-born citizen \(.*nativity\)/.test(p.why),
      ),
      where,
    ).toBe(true);
  });
}, 600_000);
