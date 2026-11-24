import { expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import {
  bodyJurisdiction,
  draftBill,
  holdEveryChamber,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
import { enactLaw } from "../core2/modules/laws";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { floorDebateFacts } from "../director/floor-debate-facts";
import type { Fact } from "../english/scene-talk-words";
import { buildBenchWorld } from "./world";

it("grounds floor questions in the single provision the chamber would enact", () => {
  const { core } = buildBenchWorld("memA", gameStartDate(), {
    twoLevel: true,
    placeKey: "4878016",
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (s) => s.office.kind === "legislature-lower",
  )!;
  const speaker = memberKey(members(api, seat.office.id)[0]!);
  const question = "us-policy-positions:environment-energy.bottle-deposit";
  const deposit: Provision = { kind: "policy-question", question, value: 1 };
  const other: Provision = {
    ...deposit,
    question: "us-policy-positions:labor-workforce.paid-family-leave",
  };
  function keys(provisions: Provision[], lawId?: string, closeVote = false) {
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: speaker,
      provisions,
    });
    if (closeVote)
      expect(holdEveryChamber(api, bill.id).status).not.toBe("drafted");
    const facts: Record<string, Fact> = {};
    const causeId = `floor-debate:${bill.id}:${seat.office.id}`;
    floorDebateFacts(
      core,
      facts,
      { billId: bill.id, forId: speaker, chamber: seat.office.id },
      causeId,
      speaker,
    );
    const entries = Object.entries(facts).filter(([key]) =>
      key.startsWith("proposes-"),
    );
    for (const [, fact] of entries)
      expect(fact.sourceRecordIds).toEqual(
        expect.arrayContaining([causeId, bill.id, ...(lawId ? [lawId] : [])]),
      );
    return entries.map(([key]) => key);
  }
  const stateLaw = (value: number) =>
    enactLaw(api, {
      jurisdiction: bodyJurisdiction(api, seat.office.id),
      level: "state",
      series: question,
      value,
      effectiveDate: core.date,
      measureId: "deposit-" + value,
      citation: "Recorded state law for this test",
    });
  const off = stateLaw(0);
  const repeal = { ...deposit, value: 0 };
  expect(keys([repeal])).toEqual([]);
  expect(keys([deposit], off.id)).toEqual([`proposes-enact:${question}`]);
  const on = stateLaw(1);
  expect(keys([deposit])).toEqual([]);
  expect(keys([repeal], on.id)).toEqual([`proposes-repeal:${question}`]);
  expect(keys([other])).not.toContain(`proposes-enact:${question}`);
  expect(keys([repeal, other])).toEqual([]);
  expect(keys([repeal], undefined, true)).toEqual([]);

  const bill = draftBill(api, {
    bodyOfficeId: seat.office.id,
    sponsorId: speaker,
    provisions: [repeal],
  });
  const [listener, supporter, opponent] = [...core.people.keys()].filter(
    (id) => id !== speaker && core.people.get(id)?.alive,
  );
  if (!listener || !supporter || !opponent)
    throw new Error("Missing hearing cast");
  const hearings = api.moduleState("core2-legislature-v1").table("committees");
  const hearing = {
    id: "committee:" + bill.id + ":" + seat.office.id,
    billId: bill.id,
    chamber: seat.office.id,
    date: core.date,
    heard: true,
    witnesses: [
      { personId: speaker, stake: "for" },
      { personId: listener, stake: "against" },
      { personId: supporter, stake: "for" },
      { personId: opponent, stake: "against" },
    ],
  };
  const cause = "floor-debate:" + bill.id + ":" + seat.office.id;
  function readWitnesses() {
    const result: Record<string, Fact> = {};
    floorDebateFacts(
      core,
      result,
      { billId: bill.id, forId: speaker, chamber: seat.office.id },
      cause,
      speaker,
      listener,
    );
    return Object.fromEntries(
      Object.entries(result).filter(([key]) => key.startsWith("hearing-")),
    );
  }
  expect(readWitnesses()).toEqual({});
  for (const changed of [
    { heard: false },
    { witnesses: [] },
    { witnesses: [{ personId: opponent, stake: "unrecorded" }] },
    { date: "2099-12-31" },
    { chamber: "other-chamber" },
    { billId: "other-bill" },
  ]) {
    hearings.put({ ...hearing, ...changed });
    expect(readWitnesses()).toEqual({});
  }
  hearings.put(hearing);
  const both = readWitnesses();
  for (const [key, id] of [
    ["hearing-supporter", supporter],
    ["hearing-opponent", opponent],
  ] as const) {
    const person = core.people.get(id)!;
    expect(both[key]).toEqual({
      text: person.givenName + " " + person.familyName,
      sourceRecordIds: [cause, bill.id, hearing.id, id],
    });
  }
  hearings.put({
    ...hearing,
    witnesses: hearing.witnesses.filter((w) => w.personId !== opponent),
  });
  expect(Object.keys(readWitnesses())).toEqual(["hearing-supporter"]);
  holdEveryChamber(api, bill.id);
  expect(readWitnesses()).toEqual({});
}, 120_000);
