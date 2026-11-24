import { expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import {
  draftBill,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
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
  function keys(provisions: Provision[]) {
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: speaker,
      provisions,
    });
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
      expect(fact.sourceRecordIds).toEqual([causeId, bill.id]);
    return entries.map(([key]) => key);
  }
  expect(keys([deposit])).toEqual([`proposes-enact:${question}`]);
  expect(keys([{ ...deposit, value: 0 }])).toEqual([
    `proposes-repeal:${question}`,
  ]);
  expect(keys([other])).toEqual([`proposes-enact:${other.question}`]);
  expect(keys([deposit, other])).toEqual([]);
});
