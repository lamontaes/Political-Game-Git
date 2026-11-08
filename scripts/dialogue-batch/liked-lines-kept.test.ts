import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A rewrite never deletes a line the owner graded good (owner, via the CTO,
 * Nov 8). `data/english/part-grades.json` is the ledger of his grades; every
 * key it counts good must still be a piece in a bank of
 * `data/english/parts/`, or be carried by a live piece through a grade row's
 * `restoredFrom` (`scripts/dialogue-batch/restore-liked-lines.ts`), or sit in
 * the list below, which the owner can read: each line he liked that no live
 * engine slot serves yet, with the words and why.
 *
 * Restoring one of these means adding the piece to the bank its engine reads,
 * folding its grade, and deleting its entry here (the test below fails on an
 * entry that is no longer needed). Adding to this list is the one way to take
 * a graded line out of the banks, and it needs the CTO's word.
 *
 * Where to find the old piece: `git show <commit>^:<path>` for the deleting
 * commit named in each reason (a shallow clone may need
 * `git fetch origin main --deepen=2000` first).
 */
const NOT_YET_RESTORED: readonly {
  readonly key: string;
  readonly text: string;
  readonly reason: string;
}[] = [
  {
    key: "address.chair-run-meeting.the-motion-carries",
    text: "The motion carries.",
    reason:
      "A chair announcing a vote's result aloud. No live scene has a chair who calls votes (scene talk's floor debate is members speaking; the bill's paper words a result in writing, `bill-paper.result.*`). Old bank: address.json, deleted in c67d0365 with the dead office scene.",
  },
  {
    key: "address.concession-concede.thank-you-for-everything",
    text: "Thank you for everything.",
    reason:
      "A concession speech to the room. The live concession scenes are calls between two people (concession-call, concession-taken, concession-received in scene talk); none stages a speech to supporters. Old bank: address.json, deleted in c67d0365.",
  },
  {
    key: "address.concession-concede.this-is-not-the-end",
    text: "This is not the end.",
    reason:
      "A concession speech to the room; same reason as thank-you-for-everything.",
  },
  {
    key: "address.concession-concede.we-didnt-win",
    text: "We didn't win.",
    reason:
      "A concession speech to the room; same reason as thank-you-for-everything.",
  },
  {
    key: "address.concession-concede.we-will-be-back",
    text: "We will be back.",
    reason:
      "A concession speech to the room; same reason as thank-you-for-everything.",
  },
  {
    key: "address.victory-claim.im-honored",
    text: "I'm honored.",
    reason:
      "A victory speech to the room. The victory-night scene is the hallway before the speech (its replies are what the player means to say); the speech itself is not staged. Old bank: address.json, deleted in c67d0365.",
  },
  {
    key: "bank:hearing.answer.yes-thank-you",
    text: "Yes, thank you.",
    reason:
      "A witness's answer to a yes-or-no question from the chair. No chair line in the hearing-testify scene is a yes-or-no question. Old bank: hearing.json, deleted in 881e7c4f.",
  },
  {
    key: "bank:hearing.thanks.thank-you-chairman",
    text: "Thank you, Chairman.",
    reason:
      "The chair's form of address depends on the chair (Chair, Chairman, Madam Chair). Scene facts carry no chair title, so the line would say Chairman to any chair. Needs a chair-title fact from the director. Old bank: hearing.json, deleted in 881e7c4f.",
  },
  {
    key: "bank:hearing.thanks.thank-you-mr-chairman",
    text: "Thank you, Mr. Chairman.",
    reason: "The chair's form of address; same reason as thank-you-chairman.",
  },
  {
    key: "bank:meeting.opener.i-rise-to-speak-briefly-in-gratitude-today",
    text: "Mr. Chair, I rise to speak briefly in gratitude today.",
    reason:
      "The old piece was `{chair}, I rise to speak briefly in gratitude today.` with `{chair}` the form of address to the presiding officer; scene talk's `{chair}` is the committee chair's name, and no scene has a member rise in gratitude. Old bank: meeting.json, deleted in 881e7c4f.",
  },
  {
    key: "bank:meeting.procedural.reserving-the-right-to-object",
    text: "Mr. Chair, reserving the right to object.",
    reason:
      "Same `{chair}` form-of-address slot as the line above, and no scene asks for unanimous consent. Old bank: meeting.json, deleted in 881e7c4f.",
  },
  {
    key: "legislation.clause.provision-is-repealed",
    text: "Local minimum wage authority is repealed.",
    reason:
      'A bill\'s repeal clause. The live bill text (src/english/bill-sections.ts, data/english/bill-sections.json) words every bill in its own forms ("An ordinance to ...", "A bill for an act to ...", "the law now in force on {subject} is repealed"); no bank piece is read for a short title, a long title or a repeal clause, and bill-paper.json words only the lawyer\'s warning and a floor result. Old bank: legislation.json, deleted in c704062e.',
  },
  {
    key: "legislation.long-title.to-provide-for-purpose-and-for-other-purposes",
    text: "To provide for inclusionary requirement, and for other purposes.",
    reason: "A bill's long title; same reason as provision-is-repealed.",
  },
  {
    key: "legislation.short-title.this-act-may-be-cited-as-the-act",
    text: 'This Act may be cited as the "Right to counsel in eviction".',
    reason: "A bill's short title; same reason as provision-is-repealed.",
  },
  {
    key: "legislation.short-title.this-title-may-be-cited-as-the",
    text: 'This title may be cited as the "Inclusionary requirement".',
    reason: "A bill's short title; same reason as provision-is-repealed.",
  },
  {
    key: "minutes.discussion.participants-discussed-topic",
    text: 'Participants discussed "Protect farmland from development".',
    reason:
      "A meeting's minutes. No engine words minutes; the old bank (mined from FOMC minutes) was read only by batch scripts and was deleted in 3d6576e9.",
  },
  {
    key: "minutes.discussion.the-manager-turned-next-to-topic",
    text: "The manager turned next to partner with federal immigration enforcement.",
    reason: "A meeting's minutes; same reason as participants-discussed-topic.",
  },
  {
    key: "minutes.discussion.the-staff-provided-an-update-on-topic",
    text: 'The staff provided an update on "Universal preschool".',
    reason: "A meeting's minutes; same reason as participants-discussed-topic.",
  },
  {
    key: "minutes.vote.voting-against-this-action-members",
    text: "Voting against this action: Quinn Noel, Michael Gordon, Jennifer Montoya, Paul Romero, James McCarthy and Thomas McCarthy.",
    reason: "A meeting's minutes; same reason as participants-discussed-topic.",
  },
  {
    key: "notice.election.notice-of-election",
    text: "NOTICE OF ELECTION. NOTICE IS HEREBY GIVEN that an election will be held in Vauxhall on November 2, 2027 for the following Officers: State Senator, State Representative, Committee member and Commissioner.",
    reason:
      "A public notice of an election. No engine prints election notices; the old notice bank was read only by batch scripts and was deleted in 3d6576e9.",
  },
];

type Counts = { good: number };
const ledger = JSON.parse(
  readFileSync("data/english/part-grades.json", "utf8"),
) as { parts: Record<string, Counts> };

/** Every key of every bank, and the keys their pieces say they were restored from. */
const bankKeys = new Set<string>();
const restoredFrom = new Set<string>();
for (const name of readdirSync("data/english/parts").filter((entry) =>
  entry.endsWith(".json"),
))
  for (const part of (
    JSON.parse(readFileSync(`data/english/parts/${name}`, "utf8")) as {
      parts: { key: string; restoredFrom?: string }[];
    }
  ).parts) {
    bankKeys.add(part.key);
    if (part.restoredFrom) restoredFrom.add(part.restoredFrom);
  }

/** The ledger keys a grade file moved onto live pieces, with the live keys. */
const moved = new Map<string, string[]>();
for (const name of readdirSync("data/english/grades"))
  for (const row of (
    JSON.parse(readFileSync(`data/english/grades/${name}`, "utf8")) as {
      grades: { parts: string[]; restoredFrom?: string }[];
    }
  ).grades)
    if (row.restoredFrom) moved.set(row.restoredFrom, row.parts);

const liked = Object.entries(ledger.parts)
  .filter(([, counts]) => counts.good > 0)
  .map(([key]) => key);
const listed = new Set(NOT_YET_RESTORED.map((row) => row.key));

describe("a line the owner graded good stays in the banks", () => {
  it("is a piece in a bank, a grade moved onto a live piece, or on the list the owner can read", () => {
    const kept = (key: string) =>
      bankKeys.has(key) || listed.has(key) || (moved.get(key)?.length ?? 0) > 0;
    const gone = liked.filter((key) => !kept(key));
    expect(gone, "graded good, in no bank and not on NOT_YET_RESTORED").toEqual(
      [],
    );
  });

  it("lists only lines that still need restoring", () => {
    const stale = NOT_YET_RESTORED.filter(
      (row) =>
        !liked.includes(row.key) || bankKeys.has(row.key) || moved.has(row.key),
    ).map((row) => row.key);
    expect(
      stale,
      "restored or no longer graded good: delete the entry",
    ).toEqual([]);
  });

  it("gives each listed line its words and its reason", () => {
    for (const row of NOT_YET_RESTORED) {
      expect(row.text.length, row.key).toBeGreaterThan(5);
      expect(row.reason.length, row.key).toBeGreaterThan(30);
    }
    expect(listed.size).toBe(NOT_YET_RESTORED.length);
  });

  it("restores a piece only from a key the ledger counts good", () => {
    for (const key of restoredFrom) expect(liked, key).toContain(key);
    for (const [key, live] of moved) {
      expect(liked, key).toContain(key);
      for (const piece of live) expect(bankKeys.has(piece), piece).toBe(true);
    }
  });
});
