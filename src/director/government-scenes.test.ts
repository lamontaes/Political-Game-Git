import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  bodyOf,
  draftBill,
  executiveOf,
  memberKey,
  members,
  scheduleVote,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";

// A floor vote, a signing and a veto are scenes (owner, Oct 15): the roll
// call reaches each member who is a watched person, and the executive's
// signature or veto reaches the bill's sponsor, each citing the record the
// legislature wrote.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// A drawn place may have no seat held by a full person, or a chamber that does
// not vote in the run; draw again, a bounded number of times, and fail if none does.
const ATTEMPTS = 8;

const run = (attemptSeed: string): boolean => {
  const place = drawPlace(attemptSeed, "government-scenes");
  const seed = attemptSeed;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  // A body of several members that is the town's or county's own, with the
  // sponsor and (where its form of government has one) the executive full people.
  const lawmaking = townSeats(api)
    .filter(
      (row) =>
        row.holder?.personId &&
        core.people.has(row.holder.personId) &&
        ["city", "county", "state"].includes(row.office.level) &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    )
    // The town's own body votes within weeks; a state chamber waits for its session.
    .sort(
      (a, b) =>
        Number(a.office.level === "state") - Number(b.office.level === "state"),
    );
  if (!lawmaking.length) {
    return false;
  }
  const seats = lawmaking;
  const withExecutive = seats.find((row) => {
    const id = executiveOf(api, row.office.id).term?.personId;
    return id && id !== row.holder!.personId && core.people.has(id);
  });
  const seat = withExecutive ?? seats[0];
  const sponsorId = seat!.holder!.personId!;
  const executiveId = executiveOf(api, seat!.office.id).term?.personId;
  // A state official is a full person under the key the legislature gives them.
  const everyone = members(api, seat!.office.id).flatMap((term) =>
    core.people.has(memberKey(term)) ? [memberKey(term)] : [],
  );
  for (const id of [
    sponsorId,
    ...everyone,
    ...(executiveId ? [executiveId] : []),
  ])
    director.watch(core, id);
  const policy = billCatalog(
    api,
    seat!.office.level as "city" | "county" | "state",
  )
    .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
    .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
  const bill = draftBill(api, {
    bodyOfficeId: seat!.office.id,
    sponsorId,
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
  scheduleVote(api, bill.id);
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), seat!.office.level === "state" ? 400 : 120),
  );

  const scenesOf = (personId: string, cause: string) =>
    (director.ledger.people.get(personId)?.schedule ?? [])
      .filter((row) => row.momentId.includes(cause))
      .flatMap((row) => row.bindings);
  // The roll call reaches the members; the one who sits on it is in the floor
  // scene with the chair and their colleagues named from the body's records.
  const voteCause = `bill-vote:${bill.id}:${seat!.office.id}`;
  if (!core.durableLog.has(voteCause)) {
    // A state chamber's bill waits on its committee and session; nothing was voted.
    return false;
  }
  const seatedNow = members(api, seat!.office.id).map((term) =>
    memberKey(term),
  );
  const heard = everyone.filter((id) =>
    scenesOf(id, voteCause).some((row) => row.typeKey === "floor-vote"),
  );
  expect(heard.length, `${bill.id}: nobody heard the vote`).toBeGreaterThan(0);
  for (const id of heard) {
    const scene = scenesOf(id, voteCause).find(
      (row) => row.typeKey === "floor-vote",
    )!;
    expect(scene.roles.find((row) => row.role === "member")!.personIds).toEqual(
      [id],
    );
    const colleagues = scene.roles.find((row) => row.role === "colleagues")!;
    // A chamber's seats can change hands over a long run: its members before the run or after it.
    const sat = [...everyone, ...seatedNow];
    for (const other of colleagues.personIds) expect(sat).toContain(other);
  }

  // The executive's act, where the body's form of government gives one.
  const acted = core.durableLog.get(`executive-action:${bill.id}`);
  const lines = [`${bill.id} floor-vote for ${heard.length}`];
  if (acted?.facts?.action) {
    const action = acted.facts.action;
    const type =
      action === "signed" ? "bill-signed" : action === "vetoed" ? "veto" : null;
    const sponsorScenes = scenesOf(sponsorId, `executive-action:${bill.id}`);
    if (type && executiveId && executiveId !== sponsorId) {
      expect(sponsorScenes.map((row) => row.typeKey)).toContain(type);
      const scene = sponsorScenes.find((row) => row.typeKey === type)!;
      const executive = scene.roles.find(
        (row) => row.role === (type === "veto" ? "executive" : "signer"),
      )!;
      expect(executive.personIds).toEqual([executiveId]);
      // The executive's own moment is not a scene about their own bill.
      expect(
        scenesOf(executiveId, `executive-action:${bill.id}`).map(
          (row) => row.typeKey,
        ),
      ).not.toContain(type);
      lines.push(`${action} by ${executiveId}`);
    }
  }
  console.log(`SCENES ${place.name} ${seed}\n${lines.join("\n")}`);
  return true;
};

it(`a bill's vote and the executive's act are scenes for the people they reach (up to ${ATTEMPTS} drawn places from seed ${seed})`, () => {
  let reached = false;
  for (let attempt = 0; attempt < ATTEMPTS && !reached; attempt += 1)
    reached = run(`${seed}:${attempt}`);
  expect(
    reached,
    `no drawn place from seed ${seed} voted a bill with a full-person seat`,
  ).toBe(true);
}, 1_800_000);
