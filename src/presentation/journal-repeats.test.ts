import { describe, expect, it } from "vitest";
import type { EntityId, IsoDate } from "../simulation";
import { collapseJournalRepeats, journalSentenceShape } from "./journal-views";
import type { World39BiographyEntry } from "./world39-journal";

function entry(index: number, text: string, at: string): World39BiographyEntry {
  return {
    id: `event:${index}`,
    at: at as IsoDate,
    sequence: index,
    kind: "event",
    text,
    sourceId: `event-${index}` as EntityId,
  };
}

const HOSTS = ["Dana Ortiz", "Marcus Bell", "Ana Reyes", "Luc Thibodeaux"];

describe("the Journal says a repeated thing once", () => {
  it("gives fifty near-identical invitations one line and keeps real events in order", () => {
    const invitations = Array.from({ length: 50 }, (_, index) =>
      entry(
        index,
        `${HOSTS[index % HOSTS.length]} offered a county party meeting with Terrebonne Parish Democrats on March ${1 + (index % 28)}, ${2029 + Math.floor(index / 20)}.`,
        `${2029 + Math.floor(index / 20)}-03-${String(1 + (index % 28)).padStart(2, "0")}`,
      ),
    );
    const wedding = entry(100, "You married Ana Reyes.", "2030-06-14");
    const job = entry(
      101,
      "You started work at the parish library.",
      "2031-01-05",
    );
    const { entries, repeats } = collapseJournalRepeats([
      ...invitations.slice(0, 20),
      wedding,
      ...invitations.slice(20),
      job,
    ]);
    expect(entries.map((row) => row.text)).toEqual([wedding.text, job.text]);
    expect(repeats).toHaveLength(1);
    expect(repeats[0]!.count).toBe(50);
    expect(repeats[0]!.first).toBe(invitations[0]);
    expect(repeats[0]!.lastAt).toBe(invitations[49]!.at);
  });

  it("leaves a sentence that happened only twice alone", () => {
    const { entries, repeats } = collapseJournalRepeats([
      entry(1, "You voted in the parish election.", "2029-11-05"),
      entry(2, "You voted in the parish election.", "2030-11-04"),
    ]);
    expect(entries).toHaveLength(2);
    expect(repeats).toEqual([]);
  });

  it("does not treat different kinds of sentence as the same", () => {
    expect(
      journalSentenceShape("Dana Ortiz invited you to dinner on May 3."),
    ).toBe(journalSentenceShape("Luc Bell invited you to dinner on June 19."));
    expect(journalSentenceShape("Dana Ortiz invited you to dinner.")).not.toBe(
      journalSentenceShape("Dana Ortiz asked you for a loan."),
    );
  });
});
