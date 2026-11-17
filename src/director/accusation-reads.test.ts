/**
 * What an accusation's lines lean on is read from the records (Story lead, Nov 17): a player who
 * took a bribe is accused on a complaint the justice engine wrote, a denial of it is a lie the
 * accuser's record catches (`knows-truth`, with the one who told them as `source`), the confession
 * is offered only where the crime row says the bribe was taken, and a thank never follows a
 * refusal. A drawn place, no pin; the player's bribe is dev mode's own (`forceBribe`), taken
 * through the scene's reply writer, and the telling the justice engine reads is the corruption
 * engine's own record, written here by hand (HAND-STAGED, as in scripts/words/accusation-walk.ts).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { BenchPlayer } from "../bench/player";
import { DevMode } from "../bench/dev-mode";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { BRIBE_OFFERED, crimeRecord } from "../core2/modules/corruption";
import { draftBill, memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";
import { playedNode, type TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;

interface Part {
  key: string;
  text: string;
  uses: {
    purpose?: string;
    step?: string;
    move?: string;
    requiresFacts?: string[];
    setsFacts?: string[];
  }[];
}
const PARTS = (sceneBank as unknown as { parts: Part[] }).parts;
const BY_KEY = new Map(PARTS.map((part) => [part.key, part]));
const accuseUses = (part: Part) =>
  part.uses.filter((use) => String(use.purpose).startsWith("conflict-accuse"));

/** Every line of a tree with the move of the player's last reply before it. */
function walk(
  node: TreeNode,
  last: string | null,
  out: { text: string; part: string; step: string; last: string | null }[],
): void {
  for (const line of node.lines)
    out.push({
      text: line.text,
      part: line.parts[0] ?? "",
      step: "follow",
      last,
    });
  if (node.end?.close)
    out.push({
      text: node.end.close.text,
      part: node.end.close.parts[0] ?? "",
      step: "close",
      last,
    });
  for (const branch of node.branches ?? []) walk(branch.node, last, out);
  for (const reply of node.replies) {
    out.push({
      text: reply.line.text,
      part: reply.line.parts[0] ?? "",
      step: "reply",
      last: reply.line.move,
    });
    if (reply.next && !reply.next.branches?.length)
      walk(reply.next, reply.line.move, out);
    else if (reply.next) {
      for (const line of reply.next.lines)
        out.push({
          text: line.text,
          part: line.parts[0] ?? "",
          step: "follow",
          last: reply.line.move,
        });
      for (const branch of reply.next.branches ?? [])
        walk(branch.node, reply.line.move, out);
    }
  }
}

it(`a denial is a lie only where the bribe was taken, the confession needs the taken row, and no thank follows a refusal (seed ${seed})`, () => {
  setBookkeeping(false);
  // The bank: a line that says "I took it" is placed by the fact that it was taken.
  for (const part of PARTS)
    if (/\bI took it\b|\bI took it on\b/.test(part.text))
      for (const use of accuseUses(part))
        expect(use.requiresFacts, part.key).toContain("took-it");
  // The bank: a line that sets `lied` is a denial placed by the taken row.
  for (const part of PARTS)
    for (const use of accuseUses(part))
      if (use.setsFacts?.includes("lied"))
        expect(use.requiresFacts, part.key).toContain("took-it");
  const tried: string[] = [];
  let proven = false;
  for (let attempt = 0; attempt < ATTEMPTS && !proven; attempt += 1) {
    const place = drawPlace(seed, `accusation-reads:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const dev = new DevMode(
      core,
      director,
      new BenchPlayer(core, director),
      world.placeId,
    );
    const day = (n: number) =>
      advanceCore(core, addDays(makeIsoDate(core.date), n));
    const bodyId = townSeats(api)
      .filter((seat) =>
        ["council", "county-board", "legislature-lower"].includes(
          String((seat.office as { kind?: string }).kind),
        ),
      )
      .map((seat) => seat.office.id)
      .find(
        (id, at, all) =>
          all.indexOf(id) === at &&
          members(api, id).filter((t) =>
            core.people.has(memberKey(t) as PersonId),
          ).length > 3,
      );
    if (!bodyId) {
      tried.push(`${where}: no body with members`);
      continue;
    }
    const sitting = members(api, bodyId)
      .map((t) => memberKey(t) as PersonId)
      .filter((id) => core.people.get(id)?.alive);
    const me = sitting[1]!;
    core.playerId = me;
    director.watch(core, me);
    const level = (
      townSeats(api).find((seat) => seat.office.id === bodyId)!.office as {
        level?: string;
      }
    ).level as "city" | "county" | "state";
    const policy = billCatalog(api, level)
      .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed);
    if (!policy) {
      tried.push(`${where}: no bill to draft`);
      continue;
    }
    const draft = () =>
      draftBill(api, {
        bodyOfficeId: bodyId,
        sponsorId: memberKey(members(api, bodyId)[0]!),
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      }).id;
    const offerer = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.tier !== "husk" &&
          !sitting.includes(p.id as PersonId) &&
          p.liquidMinor > 0,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      )[0]!;
    const { record } = dev.forceBribe({
      offererId: offerer.id,
      officialId: me,
      subjectId: draft(),
      stakeMinor: 30_000_000,
      answer: "takes",
    });
    const causeId = `${BRIBE_OFFERED}:${record.id}`;
    day(1);
    const book = director.ledger.people.get(me)!;
    const offerEntry = book.schedule.find(
      (row) => book.momentsById.get(row.momentId)?.causeId === causeId,
    );
    const offerScene = offerEntry
      ? purposeScene(core, director, me, offerEntry, { typeKey: "bribe-offer" })
      : null;
    if (offerScene?.kind !== "composed") {
      tried.push(`${where}: the offer scene was not composed`);
      continue;
    }
    const find = (node: TreeNode, path: number[]): number[] | null => {
      for (const [at, reply] of node.replies.entries()) {
        const next = reply.next ? playedNode(reply.next) : null;
        if (next?.end?.ending?.id === "took-it") return [...path, at];
        const deeper = next ? find(next, [...path, at]) : null;
        if (deeper) return deeper;
      }
      return null;
    };
    const path = find(offerScene.scene.talk.tree, []);
    if (!path) {
      tried.push(`${where}: no took-it ending in the offer tree`);
      continue;
    }
    replyInScene(core, director, me, offerEntry!, path, {
      typeKey: "bribe-offer",
    });
    day(2);
    const crime = crimeRecord(api, record.id);
    if (!crime?.taken) {
      tried.push(`${where}: the bribe was not taken`);
      continue;
    }
    const told = sitting.filter((id) => id !== me).slice(0, 5);
    for (const id of told)
      // HAND-STAGED: the corruption engine's own record of a telling, which the justice engine reads.
      api.emit({
        id: `${crime.id}:told:${offerer.id}:${id}:${core.date}`,
        date: core.date,
        kind: "crime.told",
        personIds: [id],
        witnessIds: [offerer.id as PersonId],
        placeId: core.people.get(me)!.placeId,
        facts: { [`crime:${crime.id}`]: "bribe-taken" },
        source: {
          tag: "SOURCED",
          citation: "A party to a recorded bribe told someone.",
          asOf: core.date,
        },
      });
    day(1);
    const accusedIds = [
      ...(core.logByKind.get("justice.accused") ?? []),
    ].filter((id) => id.includes(`:${crime.id}:`));
    if (!accusedIds.length) {
      tried.push(`${where}: no complaint named the player`);
      continue;
    }
    let lies = 0;
    for (const id of accusedIds) {
      const entry = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === id,
      );
      const result = entry
        ? purposeScene(core, director, me, entry, { typeKey: "accusation" })
        : null;
      expect(result?.kind, `${where}: ${id}`).toBe("composed");
      if (result?.kind !== "composed") continue;
      const facts = new Map(result.scene.facts.map((f) => [f.key, f]));
      expect(facts.get("took-it")?.text, where).toBe("yes");
      expect(facts.get("took-it")?.recordIds, where).toContain(crime.id);
      expect(facts.get("complaint-of")?.text, where).toMatch(
        /^the payment on /,
      );
      expect(facts.get("wanted"), where).toBeTruthy();
      // The telling is the corruption engine's: who told the accuser is the offerer.
      expect(facts.get("source"), where).toBeTruthy();
      expect(facts.get("knows-truth")?.recordIds, where).toContain(
        facts.get("source")!.recordIds.at(-1),
      );
      const seen: {
        text: string;
        part: string;
        step: string;
        last: string | null;
      }[] = [];
      walk(result.scene.talk.tree, null, seen);
      // A denial is offered only as the lie, and the accuser catches it.
      const denials = seen.filter(
        (row) => row.step === "reply" && row.last === "deny",
      );
      for (const row of denials) {
        const sets = accuseUses(BY_KEY.get(row.part)!).some((use) =>
          use.setsFacts?.includes("lied"),
        );
        expect(
          sets,
          `${where}: "${row.text}" is a truthful denial offered to a taker`,
        ).toBe(true);
        lies += 1;
      }
      const caught = (node: TreeNode): boolean =>
        node.replies.some(
          (reply) =>
            !!reply.next &&
            (reply.next.branches?.some(
              (b) => b.knows && b.node.lines.length > 0,
            ) ||
              caught(reply.next)),
        );
      if (denials.length)
        expect(
          caught(result.scene.talk.tree),
          `${where}: a denial is never caught`,
        ).toBe(true);
      // A thank never follows a refusal or a way out.
      for (const row of seen)
        if (row.step === "close" && BY_KEY.has(row.part)) {
          const move = BY_KEY.get(row.part)!.uses.find((u) =>
            String(u.purpose).startsWith("conflict-accuse"),
          )?.move;
          if (move === "thank")
            expect(
              ["leave", "refuse", "deny", "confront"],
              `${where}: "${row.text}" thanks after ${row.last}`,
            ).not.toContain(row.last);
        }
    }
    expect(lies, where).toBeGreaterThan(0);
    proven = true;
    process.stdout.write(
      `ACCUSATION READS ${where}: crime ${crime.id}; ${accusedIds.length} complaints; denials all lies and caught\n`,
    );
  }
  expect(
    proven,
    `no drawn place staged a taken bribe: ${tried.join("; ")}`,
  ).toBe(true);
}, 900_000);
