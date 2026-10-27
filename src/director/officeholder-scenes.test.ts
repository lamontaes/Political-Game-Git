import { describe, expect, it } from "vitest";
import { SITUATION_LIBRARY, causeMatches } from "./scheduling";
import type { CoreState } from "../core2/types";
import type { Moment } from "./types";
import type { PersonLedger } from "./ledger";

// An officeholder's desk record stages scenes: the signer
// meets the press and their aide, the sponsor hears from the executive, and
// a veto is told as a veto. The cause's own facts decide which, by value and
// by whom they name.
const executive = "person:executive";
const sponsor = "person:sponsor";
const record = (action: string) =>
  ({
    durableLog: new Map([
      [
        "executive-action:bill:1",
        {
          id: "executive-action:bill:1",
          kind: "executive-action",
          facts: { billId: "bill:1", executiveId: executive, action },
        },
      ],
    ]),
  }) as unknown as CoreState;
const moment = (personId: string) =>
  ({
    id: `m:${personId}`,
    personId,
    label: "cause:event:executive-action",
    causeKind: "event:executive-action",
    causeId: "executive-action:bill:1",
    counterpartIds: [],
    echoes: [],
  }) as unknown as Moment;
const book = { threads: new Map() } as unknown as PersonLedger;
const staged = (typeKey: string, personId: string, action: string) =>
  SITUATION_LIBRARY.types
    .find((type) => type.key === typeKey)!
    .causes.some((cause) =>
      causeMatches(cause, book, moment(personId), record(action)),
    );

describe("an officeholder's desk record stages scenes", () => {
  it("a signing reaches the signer's press and the sponsor's signing scene", () => {
    expect(staged("press-interview", executive, "signed")).toBe(true);
    // The desk scene comes when the bill is presented, not when it is signed
    // (desk-scene.test.ts plays it from the bill-presented record).
    expect(staged("desk-bill", executive, "signed")).toBe(false);
    expect(staged("bill-signed", sponsor, "signed")).toBe(true);
    // The signer is not told their own signing, and a signing is no veto.
    expect(staged("bill-signed", executive, "signed")).toBe(false);
    expect(staged("veto", sponsor, "signed")).toBe(false);
  });
  it("a town hall reaches its host as a resident's question, not as office hours", () => {
    const core = {
      durableLog: new Map([
        [
          "town-hall:1",
          {
            id: "town-hall:1",
            kind: "town-hall",
            facts: { hostId: executive },
          },
        ],
      ]),
    } as unknown as CoreState;
    const at = (personId: string) =>
      ({
        ...moment(personId),
        label: "cause:event:town-hall",
        causeId: "town-hall:1",
      }) as Moment;
    const of = (key: string) =>
      SITUATION_LIBRARY.types.find((type) => type.key === key)!;
    const question = of("town-hall-question");
    expect(
      question.causes.some((c) => causeMatches(c, book, at(executive), core)),
    ).toBe(true);
    expect(
      question.causes.some((c) => causeMatches(c, book, at(sponsor), core)),
    ).toBe(false);
    // Replaced, not layered: office hours no longer takes the town hall.
    expect(
      of("office-hours").causes.some((c) =>
        causeMatches(c, book, at(executive), core),
      ),
    ).toBe(false);
  });
  it("a veto reaches the sponsor as a veto", () => {
    expect(staged("veto", sponsor, "vetoed")).toBe(true);
    expect(staged("bill-signed", sponsor, "vetoed")).toBe(false);
  });
  it("a filing, an introduced bill or an appointment learned of through a tie is not cast as one's own", () => {
    for (const [typeKey, label] of [
      ["filing", "cause:event:candidate-filed"],
      ["press-interview", "cause:event:office.introduced"],
      ["appointment", "cause:event:official-appointed"],
    ] as const) {
      const type = SITUATION_LIBRARY.types.find((row) => row.key === typeKey)!;
      const of = (counterpartIds: string[]) =>
        ({ ...moment(executive), label, counterpartIds }) as Moment;
      const core = { durableLog: new Map() } as unknown as CoreState;
      expect(
        type.causes.some((c) => causeMatches(c, book, of([]), core)),
        typeKey,
      ).toBe(true);
      expect(
        type.causes.some((c) => causeMatches(c, book, of([sponsor]), core)),
        typeKey,
      ).toBe(false);
    }
  });
  it("an invitation to a cause waits its turn instead of stopping the day", () => {
    expect(
      SITUATION_LIBRARY.types.find((row) => row.key === "cause-invite")?.waits,
    ).toBe(true);
  });
});
