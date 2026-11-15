import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  BRIBE_OFFERED,
  considerBribe,
  crimeRecord,
} from "../core2/modules/corruption";
import {
  leakToReporter,
  outletsHere,
  PRESS_EXPOSED,
  townOutlet,
} from "../core2/modules/press";
import { BUSINESS_MODULE_ID } from "../core2/business-module-id";
import { familyRelation } from "../core2/closeness";
import { governments } from "../core2/modules/budgets";
import { OWNER_RELATION } from "../core2/modules/contracts";
import { organizationName } from "./words";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The scandal call says what the paper found (owner, Nov 15: "I've got a
// story about the water rates, and your name is in it... that's very
// ambiguous"). A member who is the player takes a bribe for their vote on a
// bill in the offer scene; the one who paid takes it to a reporter
// (press.ts leakToReporter); the paper runs it, and the reporter's call
// names who paid and the vote it bought. Pinned: Gilbert, Iowa (1930630),
// seed "reporters-call-1".
const PLACE = "1930630";
const SEED = "reporters-call-1";

/** The scene's talk as composed: its opening lines, its tree and the spots left unworded. */
interface Talk {
  narration: { text: string }[];
  open?: { text: string };
  state: { text: string };
  tree: TreeNode;
  gaps: string[];
}
/** The whole tree, as the player meets it: what is said, then "You say:"; a lie is marked. */
function played(talk: Talk): { said: string[]; shown: string[] } {
  const said: string[] = [];
  const shown: string[] = [];
  const walk = (node: TreeNode, depth: string): void => {
    for (const line of node.lines) {
      said.push(line.text);
      shown.push(`${depth}${line.text}`);
    }
    for (const branch of node.branches ?? []) {
      shown.push(`${depth}(${branch.label})`);
      walk(branch.node, `${depth}  `);
    }
    if (node.replies.length) shown.push(`${depth}You say:`);
    node.replies.forEach((reply, at) => {
      said.push(reply.line.text);
      const lie = reply.line.move === "lie" ? " (a lie)" : "";
      shown.push(`${depth}  ${at + 1}. ${reply.line.text}${lie}`);
      if (reply.next) walk(reply.next, `${depth}     `);
    });
    if (node.end?.close) shown.push(`${depth}${node.end.close.text}`);
  };
  for (const line of [...talk.narration, talk.open, talk.state])
    if (line) {
      said.push(line.text);
      shown.push(line.text);
    }
  walk(talk.tree, "");
  return { said, shown };
}

it("a scandal call names who paid and what for (Gilbert IA, seed reporters-call-1)", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const member = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0);
  expect(member, "a resident member of a body").toBeTruthy();
  const me = member!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const seat = seatView(core, me);
  const body = seat.bodies[0]!;
  let bill = { id: "", status: "blocked" };
  for (const question of [...seat.questions].slice(0, 6)) {
    if (bill.status !== "blocked") break;
    bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
  }
  expect(bill.status).not.toBe("blocked");
  // The richest neighbor who is not on the paper's staff offers.
  const staff = new Set(outletsHere(api).flatMap((row) => row.reporterIds));
  const offerer = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.id !== me &&
        p.placeId === member!.placeId &&
        !staff.has(p.id),
    )
    .sort(
      (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
    )[0]!;
  const offered = considerBribe(api, {
    offererId: offerer.id,
    officialId: me,
    stakeMinor: offerer.liquidMinor * 1000,
    subjectId: bill.id,
    pick: { offer: true },
  });
  expect(offered?.pending).toBe(true);
  // The player takes it in the offer scene.
  api.emit({
    id: `scene.reply:exposed-test:${offered!.id}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [me, offerer.id],
    placeId: member!.placeId,
    facts: {
      typeKey: "bribe-offer",
      causeId: `${BRIBE_OFFERED}:${offered!.id}`,
      ending: "took-it",
    },
    source: { tag: "SOURCED", asOf: core.date, citation: "test" },
  });
  expect(crimeRecord(api, offered!.id)?.taken).toBe(true);
  // The town paper's reporter, who covers the council.
  const reporterId = townOutlet(api)!.reporterIds[0]!;
  const tip = leakToReporter(api, {
    leakerId: offerer.id,
    reporterId,
    crimeId: offered!.id,
  });
  expect(tip.storyId, `dig ${tip.dig} run ${tip.run}`).toBeTruthy();
  const exposedId = [...(core.logByKind.get(PRESS_EXPOSED) ?? [])].find((id) =>
    String(id).includes(offered!.id),
  );
  expect(exposedId).toBeTruthy();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(String(exposedId)) &&
        row.bindings.some((b) => b.typeKey === "scandal"),
    );
  expect(entry, "the exposure stages the scandal call").toBeTruthy();
  const result = purposeScene(core, director, me, entry!, {
    typeKey: "scandal",
  });
  expect(result?.kind, JSON.stringify(result)).toBe("composed");
  if (result?.kind !== "composed") return;
  const facts = new Map(result.scene.facts.map((row) => [row.key, row.text]));
  for (const key of ["found-bribe", "briber", "wanted", "bill", "knows-truth"])
    expect(facts.has(key), key).toBe(true);
  expect(facts.get("briber")).toContain(offerer.givenName);
  const talk = (result.scene as unknown as { talk: Talk }).talk;
  // The reporter says who paid and the vote it bought.
  expect(talk.state.text).toContain(offerer.givenName);
  expect(talk.state.text).toContain(facts.get("bill")!);
  const { said, shown } = played(talk);
  process.stdout.write(
    `GAPS ${JSON.stringify(talk.gaps)}\nSCANDAL CALL\n${shown.join("\n")}\nEND CALL\n`,
  );
  // Nothing about minutes, a signature or a story with no subject.
  for (const text of said)
    expect(text).not.toMatch(/minutes|sign anything|a story about you/i);
}, 60_000);

// A conflict on an award: no award is made in a world's first weeks, so the
// exposure is a fixture in the shape press.ts writes it (conflictAct), naming
// a real government's road line, a real firm of the town and its real owner.
// The exposed person is the owner (their own firm) and then the owner's
// relative (a relative's firm, said by the family record). Pinned: Gilbert,
// Iowa (1930630), seed "reporters-call-1".
it("a conflict call names the contract, the firm and whose it is (Gilbert IA, seed reporters-call-1)", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  // The opening's owners are recorded in the first days.
  for (let day = 0; day < 3; day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const owners = [
    ...(api
      .moduleState(BUSINESS_MODULE_ID)
      .table("owners")
      .rows() as unknown as {
      id: string;
      ownerId: string;
    }[]),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const firm = owners.find((row) => {
    const owner = core.people.get(row.ownerId as PersonId);
    return (
      owner?.alive &&
      core.organizations.has(row.id) &&
      [...owner.familyIds].some((id) => core.people.get(id)?.alive)
    );
  });
  expect(firm, "a firm whose owner has family").toBeTruthy();
  const owner = core.people.get(firm!.ownerId as PersonId)!;
  // A relative who shares the owner's home when there is one, as at Gilbert.
  const kinIds = [...owner.familyIds]
    .sort()
    .filter(
      (id) => core.people.get(id)?.alive && familyRelation(core, id, owner.id),
    );
  const relativeId =
    kinIds.find(
      (id) => core.people.get(id)!.householdId === owner.householdId,
    ) ?? kinIds[0]!;
  const housemate =
    core.people.get(relativeId)!.householdId === owner.householdId;
  const gov = governments(api)[0]!;
  const awardId = `contract:${gov.id}:highways:${core.date}`;
  const outlet = townOutlet(api)!;
  const call = (memberId: PersonId) => {
    const relation =
      memberId === owner.id
        ? OWNER_RELATION
        : familyRelation(core, memberId, owner.id)!;
    core.playerId = memberId;
    if (!director.ledger.people.has(memberId)) director.watch(core, memberId);
    const id = `${PRESS_EXPOSED}:${awardId}:${memberId}:${outlet.id}`;
    api.emit({
      id,
      date: core.date,
      kind: PRESS_EXPOSED,
      personIds: [memberId],
      placeId: outlet.placeId,
      publicRecord: true,
      news: true,
      topic: `conduct:${memberId}`,
      facts: {
        [`award:${awardId}`]: "conflict-of-interest",
        memberId,
        organizationId: firm!.id,
        ownerId: owner.id,
        relation,
        outletId: outlet.id,
      },
      source: { tag: "SOURCED", citation: "fixture", asOf: core.date },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = director.ledger.people
      .get(memberId)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(id) &&
          row.bindings.some((b) => b.typeKey === "scandal"),
      );
    expect(entry, "the exposure stages the scandal call").toBeTruthy();
    const result = purposeScene(core, director, memberId, entry!, {
      typeKey: "scandal",
    });
    expect(result?.kind, JSON.stringify(result)).toBe("composed");
    if (result?.kind !== "composed") throw new Error("not composed");
    const facts = new Map(result.scene.facts.map((row) => [row.key, row.text]));
    const talk = (result.scene as unknown as { talk: Talk }).talk;
    const state = talk.state.text;
    const { shown } = played(talk);
    process.stdout.write(
      `GAPS ${JSON.stringify(talk.gaps)}\nCONFLICT ${relation}\n${shown.join("\n")}\nEND CALL\n`,
    );
    return { facts, state };
  };
  const firmName = organizationName(core.organizations.get(firm!.id)!);
  const own = call(owner.id as PersonId);
  expect(own.facts.has("firm-yours")).toBe(true);
  expect(own.state).toContain("the road contract");
  expect(own.state).toContain(firmName);
  expect(own.state).toContain("stake");
  const kin = call(relativeId as PersonId);
  expect(kin.facts.has("firm-yours")).toBe(false);
  expect(kin.state).toContain(firmName);
  expect(kin.state).toContain(owner.givenName);
  // A housemate is told the owner lives with them (Words lead, Nov 15).
  expect(kin.facts.has("relative-lives-with")).toBe(housemate);
  if (housemate) expect(kin.state).toContain("lives with you");
}, 60_000);
