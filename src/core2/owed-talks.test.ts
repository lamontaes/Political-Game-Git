import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { partnershipsModule } from "./modules/partnerships";
import { owedTalks } from "./modules/owed-talks";
import { coreAPI } from "./state";
import { pairKey } from "./kernel/ids";
import { addDays, makeIsoDate } from "./kernel/dates";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { PersonId } from "./types";

// A reply that puts a talk off to a day leaves an owed-talk record naming who
// owes whom, about what and for which day. With no time together by the due
// day it reads "due"; with time together it closes. Records in a drawn place.
describe.each(["owed-talk-a", "owed-talk-b"])("an owed talk (%s)", (salt) => {
  const drawn = drawPlace(salt, "people-owed-talk");
  const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
  const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
  const where = `${drawn.name} (${key}) seed ${seed}`;

  function setup() {
    const input = generatedOpening(
      { seed, key },
      { economy: false, settings: { population: 300 } },
    );
    const core = createLifeCore(input, { modules: [partnershipsModule] });
    const api = coreAPI(core);
    const [a, b] = [...core.people.values()]
      .filter((row) => row.tier !== "husk" && row.alive)
      .slice(0, 2);
    const dueOn = addDays(makeIsoDate(core.date), 3);
    const reply = (id: string, extra: Record<string, unknown>) =>
      api.emit({
        id,
        date: core.date,
        kind: "scene.reply",
        personIds: [a!.id, b!.id] as PersonId[],
        placeId: a!.placeId,
        source: { tag: "SOURCED", citation: "A reply.", asOf: core.date },
        facts: { typeKey: "household-stake", move: "reply-deflect", ...extra },
      });
    return { core, api, a: a!, b: b!, dueOn, reply };
  }

  it(`names the person owed, the topic and the due day (${where})`, () => {
    const { api, a, b, dueOn, reply } = setup();
    reply("reply-1", { owedWith: b.id, owedTopic: "money", owedDueOn: dueOn });
    const [row] = owedTalks(api);
    expect(row, where).toMatchObject({
      replyId: "reply-1",
      owedBy: a.id,
      owedTo: b.id,
      topic: "money",
      dueOn,
      state: "open",
    });
  });

  it(`reads due on the day when the two have not met since (${where})`, () => {
    const { core, api, a, b, dueOn, reply } = setup();
    const reply0Date = core.date;
    reply("reply-1", { owedWith: b.id, owedTopic: "money", owedDueOn: dueOn });
    advanceCore(core, dueOn);
    expect(core.date, where).toBeTruthy();
    // No recorded time together since the reply reads due; time together reads closed.
    const met = core.relationships.get(pairKey(a.id, b.id));
    const talked = !!met && String(met.lastContactDate) > String(reply0Date);
    // Time together settles it and the row is gone; none reads due.
    expect(owedTalks(api)[0]?.state, where).toBe(talked ? undefined : "due");
  });

  it(`leaves the table when they talk again, and a new day named is a new row (${where})`, () => {
    const closed = setup();
    closed.reply("reply-1", {
      owedWith: closed.b.id,
      owedTopic: "money",
      owedDueOn: closed.dueOn,
    });
    closed.reply("reply-2", { move: "reply-agree" });
    expect(owedTalks(closed.api), where).toEqual([]);

    const moved = setup();
    moved.reply("reply-1", {
      owedWith: moved.b.id,
      owedTopic: "money",
      owedDueOn: moved.dueOn,
    });
    moved.reply("reply-2", {
      owedWith: moved.b.id,
      owedTopic: "money",
      owedDueOn: addDays(moved.dueOn, 4),
    });
    expect(
      owedTalks(moved.api).map((row) => [row.id, row.state, row.dueOn]),
      where,
    ).toEqual([["owed-talk:reply-2", "open", addDays(moved.dueOn, 4)]]);
  });

  it(`holds only talks still owed after ninety days of put-off talks, one per pair (${where})`, () => {
    const { core, api, b, reply } = setup();
    // A talk put off every ten days for ninety days between the same two people, each
    // new one settling the last, and one more that is never answered.
    for (let month = 0; month < 9; month += 1) {
      reply(`reply-${month}`, {
        owedWith: b.id,
        owedTopic: month % 2 ? "money" : "work",
        owedDueOn: addDays(makeIsoDate(core.date), 6),
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 10));
    }
    const held = owedTalks(api);
    expect(
      held.every((row) => row.state === "open" || row.state === "due"),
      where,
    ).toBe(true);
    expect(held.length, where).toBeLessThanOrEqual(1);
  });
});
