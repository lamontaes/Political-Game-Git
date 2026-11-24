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
}, 120_000);
