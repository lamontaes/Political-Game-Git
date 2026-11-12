import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { MEETINGS_MODULE_ID, type RemarkRow } from "../core2/modules/meetings";
import type { PersonId } from "../core2/types";
import { coreAPI } from "../core2/state";
import { purposeScene, replyInScene } from "./purpose-scene";
import { remarkOf } from "./remark";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";

/**
 * A member hears testimony (scene-member-hears-testimony, path 11). In a
 * played world a resident member of a body (the player, as in a seated
 * start) drafts a bill; at its hearing residents speak in public comment. The
 * meetings engine records each remark and the speech engine names the members
 * who heard it, and a resident who spoke then comes to the member about the
 * bill and the side they took, citing the remark. The member's answer is a
 * scene reply. A resident who spoke and does not sit on the body gets no such
 * scene. Drawn places, a fresh seed, place and seed printed.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 8;
const DAYS = 365;

const run = (drawSeed: string): string | null => {
  const place = drawPlace(drawSeed, "testimony-heard");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const member = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0);
  if (!member) return `${where}: no resident member of a body`;
  const me = member.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const seat = seatView(core, me);
  const body = seat.bodies[0]!;
  let bill = seatAct(core, me, {
    kind: "draft",
    officeId: body.officeId,
    series: "minimum-wage",
    value:
      (seat.amounts.find((a) => a.series === "minimum-wage")?.current ?? 0) +
      200,
  }) as { id: string; status: string };
  for (const question of seat.questions) {
    if (bill.status !== "blocked") break;
    bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
  }
  if (!core.durableLog.has(`office.introduced:${bill.id}`))
    return `${where}: ${bill.status}, no introduction record`;
  // Watch the residents who may speak, so a speaker's own book is read too.
  const town = [...core.people.values()]
    .filter((p) => p.alive && p.placeId === member.placeId && p.id !== me)
    .map((p) => p.id as PersonId)
    .sort()
    .slice(0, 40);
  for (const id of town) director.watch(core, id);
  // Public comment comes before a vote on any bill before the member's
  // body: the days go by until a resident has spoken on one.
  const heard = () =>
    (
      api
        .moduleState(MEETINGS_MODULE_ID)
        .table("remarks")
        .rows() as unknown as RemarkRow[]
    ).filter(
      (r) =>
        r.personId !== me &&
        (
          api
            .moduleState(LEGISLATURE_MODULE_ID)
            .table("bills")
            .get(r.billId) as unknown as { bodyOfficeId?: string } | undefined
        )?.bodyOfficeId === body.officeId,
    );
  for (let day = 0; day < DAYS && !heard().length; day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const spoken = heard();
  if (!spoken.length)
    return `${where}: nobody spoke before ${body.officeId} in ${DAYS} days`;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const book = director.ledger.people.get(me)!;
  const entry = book.schedule.find((row) =>
    row.bindings.some(
      (b) =>
        b.typeKey === "testimony-heard" &&
        b.roles.some(
          (r) =>
            r.role === "speaker" &&
            spoken.some((s) => r.personIds.includes(s.personId as PersonId)),
        ),
    ),
  );
  // The remark the speech record stands for stages the scene for the member.
  expect(
    entry,
    `${where}: ${spoken.length} spoke on ${bill.id}, no scene for the member`,
  ).toBeTruthy();
  const scene = purposeScene(core, director, me, entry!, {
    typeKey: "testimony-heard",
  });
  expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
  if (scene?.kind !== "composed") return null;
  const speaker = scene.scene.askerId;
  const remark = spoken.find((r) => r.personId === speaker)!;
  expect(remark, `${where}: the asker did not speak`).toBeTruthy();
  const side = scene.scene.facts.find(
    (row) => row.key === (remark.position > 0 ? "spoke-for" : "spoke-against"),
  );
  expect(side?.recordIds, where).toContain(remark.id);
  const billFact = scene.scene.facts.find((row) => row.key === "bill");
  expect(billFact?.recordIds, where).toContain(remark.billId);
  // The member answers, and the answer is a scene reply.
  const replyId = replyInScene(core, director, me, entry!, [0], {
    typeKey: "testimony-heard",
  });
  expect(replyId, where).toMatch(/^scene-reply:/);
  // A resident who spoke gets this scene only about a bill before a body
  // they sit on themselves.
  for (const row of spoken) {
    const theirs = director.ledger.people.get(row.personId as PersonId);
    for (const s of theirs?.schedule ?? []) {
      if (!s.bindings.some((b) => b.typeKey === "testimony-heard")) continue;
      const cause = theirs!.momentsById.get(s.momentId)?.causeId ?? "";
      const heardOn = remarkOf(core, cause);
      const office = heardOn
        ? (
            api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .get(heardOn.billId) as unknown as
              { bodyOfficeId?: string } | undefined
          )?.bodyOfficeId
        : undefined;
      // Seated on that body on the day (a term on record, then or since).
      const held = (
        api.moduleState(OFFICES_MODULE_ID).table("terms").rows() as unknown as {
          personId: string;
          officeId: string;
          startDate?: string;
          endDate?: string;
        }[]
      ).some(
        (t) =>
          t.personId === row.personId &&
          t.officeId === office &&
          (!t.startDate || t.startDate <= s.date) &&
          (!t.endDate || t.endDate >= s.date),
      );
      expect(
        held,
        `${where}: ${row.personId} got the member's scene on ${cause}`,
      ).toBe(true);
    }
  }
  process.stdout.write(
    `TESTIMONY ${where}: ${remark.id} (${remark.position > 0 ? "for" : "against"}): "${scene.scene.talk.state.text}" / reply ${replyId}\n`,
  );
  return null;
};

it(`a member who heard public comment is met by a resident who spoke (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let draw = 0; draw < ATTEMPTS; draw += 1) {
    const skipped = run(`${seed}:${draw}`);
    if (!skipped) return;
    passed.push(skipped);
  }
  throw new Error(`No drawn place held a hearing: ${passed.join("; ")}`);
}, 3_600_000);
