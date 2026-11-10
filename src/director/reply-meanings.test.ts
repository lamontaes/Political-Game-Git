/**
 * Every reply move the two composers can offer has a stated meaning group
 * (`data/reply-meanings.json`), so "four different answers" is something a
 * test can read (owner, Oct 27: "four replies are four different answers,
 * never one reworded"). A move with no group fails here, by name.
 */
import { describe, expect, it } from "vitest";
import conversationBank from "../../data/english/parts/conversation.json" with { type: "json" };
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import arcsFile from "./data/purpose-arcs.json" with { type: "json" };
import { CONVERSATION_DATA } from "./conversation";
import {
  everydayMeaning,
  REPLY_MEANINGS,
  sceneMeaning,
} from "./reply-meanings";

type Arc = {
  replies?: string[];
  again?: Record<string, string[]>;
  continue?: { replies: string[] }[];
};
const arcs = arcsFile as unknown as {
  purposes: Record<string, Arc>;
  keys?: Record<string, Arc>;
  again: Record<string, string[] | string>;
  lie: { caught: { replies: string[] } };
};

describe("reply meaning groups", () => {
  it("names a group for every answer choice of every everyday subject", () => {
    const missing: string[] = [];
    for (const [subject, bank] of Object.entries(CONVERSATION_DATA.subjects))
      for (const move of bank.answers ?? [])
        if (everydayMeaning(subject, move.key).startsWith("unplaced:"))
          missing.push(`${subject}.${move.key}`);
    expect([...new Set(missing)]).toEqual([]);
    // The bank's own answer uses, whatever the director admits.
    const uses = new Set<string>();
    for (const part of (
      conversationBank as unknown as {
        parts: { uses: { subject: string; role: string; choice: string }[] }[];
      }
    ).parts)
      for (const use of part.uses)
        if (use.role === "answer") uses.add(`${use.subject}.${use.choice}`);
    for (const use of uses) {
      const [subject, choice] = [use.split(".")[0]!, use.split(".")[1]!];
      expect(everydayMeaning(subject, choice), use).not.toMatch(/^unplaced:/);
    }
  });

  it("names a group for every move a scene arc lists and every move the scene bank words for the asked", () => {
    const moves = new Set<string>(arcs.lie.caught.replies);
    const take = (arc: Arc) => {
      for (const move of arc.replies ?? []) moves.add(move);
      for (const list of Object.values(arc.again ?? {}))
        for (const move of list) moves.add(move);
      for (const row of arc.continue ?? [])
        for (const move of row.replies) moves.add(move);
    };
    for (const arc of Object.values(arcs.purposes)) take(arc);
    for (const arc of Object.values(arcs.keys ?? {}))
      if (typeof arc === "object") take(arc);
    for (const list of Object.values(arcs.again))
      if (Array.isArray(list)) for (const move of list) moves.add(move);
    for (const part of (
      sceneBank as unknown as {
        parts: { uses: { role: string; step?: string; move: string }[] }[];
      }
    ).parts)
      for (const use of part.uses)
        if (use.role === "asked") moves.add(use.move);
    const missing = [...moves].filter((move) =>
      sceneMeaning(move).startsWith("unplaced:"),
    );
    expect(missing).toEqual([]);
  });

  it("uses only groups it defines, and defines no group nobody uses", () => {
    const defined = new Set(Object.keys(REPLY_MEANINGS.groups));
    const used = new Set<string>([
      ...Object.values(REPLY_MEANINGS.scene),
      ...Object.values(REPLY_MEANINGS.everyday).flatMap((row) =>
        Object.values(row),
      ),
    ]);
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
    expect([...defined].filter((name) => !used.has(name))).toEqual([]);
  });

  it("puts home-new's four answer keys in at most two groups", () => {
    const keys = ["plain", "always", "brief", "turn"];
    const groups = new Set(keys.map((key) => everydayMeaning("home-new", key)));
    expect([...groups].sort()).toEqual(["answers", "turns-back"]);
  });
});
