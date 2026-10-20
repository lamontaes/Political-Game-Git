/**
 * Golden path step 9 (the town visibly changes) counts a read, not a record
 * (pool: play-step-9-is-a-read). A law that took effect and that no other
 * engine read does not reach the step; once law reach records who the law
 * reached, the step names that record.
 */
import { expect, it } from "vitest";
import { townReads } from "../../src/bench/reached";

const bill = { id: "bill:town-2027-3", number: 3 };
const took = { lawId: "law:town:min-wage:2027:3", series: "min-wage" };

it("does not reach step 9 on the took-effect event alone", () => {
  expect(townReads([bill], [took], () => [])).toEqual([]);
});

it("reaches step 9 with the record of who the law reached", () => {
  expect(
    townReads([bill], [took], (facts) =>
      facts.lawId === took.lawId ? [{ personId: "person:worker-1" }] : [],
    ),
  ).toEqual(["bill:town-2027-3:law:town:min-wage:2027:3:person:worker-1"]);
});

it("ignores a took-effect law that belongs to another bill", () => {
  expect(
    townReads([bill], [{ lawId: "law:town:tax:2027:9" }], () => [
      { personId: "person:worker-1" },
    ]),
  ).toEqual([]);
});
