import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/kernel/brands";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { wordConversationMove } from "../english/conversation-words";
import { kinAddress } from "../english/journal-words";
import { subjectsBetween } from "./conversation";

// A brother or sister who lives apart asks after the parent they share as
// they call them ("How's Mom?"), never by first name or as "your mother":
// played in a drawn place until something recorded happens to that parent.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a relative who lives apart asks after the parent they share as Dad or Mom, from the bank", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "kin-address");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId! as PersonId;
    director!.watch(core, me);
    const player = core.people.get(me)!;
    const apart = [...player.familyIds].filter((id) => {
      const relative = core.people.get(id);
      return relative?.alive && relative.householdId !== player.householdId;
    });
    if (!apart.length) {
      tried.push(`${where}: no relative lives apart from the player`);
      continue;
    }
    for (let day = 60; day <= 360; day += 60) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      for (const listenerId of apart) {
        const listener = core.people.get(listenerId)!;
        const row = subjectsBetween(core, me, listenerId, director).find(
          (subject) =>
            subject.kind === "family" &&
            listener.familyIds.has(subject.aboutId as PersonId),
        );
        if (!row) continue;
        const parent = core.people.get(row.aboutId as PersonId)!;
        const relation = player.pastFacts
          ?.find(
            (f) =>
              f.kind.startsWith("family:") &&
              f.facts?.otherPersonId === parent.id,
          )
          ?.kind.slice("family:".length);
        if (relation === "sibling") continue;
        const address = kinAddress(relation!, parent.looks?.gender ?? "other");
        expect(address, `${where}: ${row.id}`).toBeDefined();
        expect(row.facts.relation!.text, `${where}: ${row.id}`).toBe(address);
        // The asking line, as the bank says it in the listener's voice.
        const said = wordConversationMove({
          seed: core.seed,
          subject: "family",
          part: "ask",
          speakerId: listenerId,
          traits: listener.traits,
          facts: row.facts,
          momentKey: `${listenerId}:${me}:${core.date}:kin-address`,
          about: { gender: parent.looks?.gender },
          relationText: row.facts.relation!.text,
        });
        expect(said, `${where}: ${row.id} worded`).not.toBeNull();
        expect(said!.text, where).toContain(address!);
        expect(said!.text, where).not.toContain(parent.givenName);
        expect(said!.text, where).not.toMatch(/\b(your|my) /i);
        expect(said!.sourceRecordIds.length, where).toBeGreaterThan(0);
        console.log(
          `${where}, day ${day}: ${listenerId} asks ${me} "${said!.text}" about ${parent.id} (${relation}), citing ${said!.sourceRecordIds.join(", ")}`,
        );
        return;
      }
    }
    tried.push(`${where}: no shared parent asked after in a year`);
  }
  throw new Error(
    `no drawn place asked after a shared parent: ${tried.join("; ")}`,
  );
}, 1_800_000);
