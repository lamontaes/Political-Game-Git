import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  executiveOf,
  memberKey,
  members,
  proposalRight,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// An executive who may not introduce a bill in their own name asks the member
// most inclined to carry it, and the member decides. The legislature records
// the ask (carry-asked, naming the member and the asker), and the member's
// carry-bill scene fires from it with the asker as the one who comes in,
// about that bill. Places are drawn in turn until one's executive asks a
// member who is a full person.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 45;
const ATTEMPTS = 12;

it(`an executive's ask to carry a bill is the member's carry-bill scene, with the asker (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "carry-bill-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The town's, county's and state's bodies whose executive may not
    // introduce a bill in their own name: they ask a member to carry it.
    const bodies = townSeats(api).filter((row) => {
      if (!["city", "county", "state"].includes(row.office.level)) return false;
      const office = executiveOf(api, row.office.id).office;
      return office && proposalRight(api, office.kind).mode === "by-request";
    });
    if (!bodies.length) {
      tried.push(`${place.name} (no executive brings bills by request)`);
      continue;
    }
    // Their legislators who are full people.
    for (const row of bodies)
      for (const term of members(api, row.office.id)) {
        const key = memberKey(term);
        if (core.people.get(key)?.alive) director.watch(core, key);
      }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    // The asks to watched members by an asker who is a full person.
    const asks = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "carry-asked" &&
        director.ledger.people.has(String(row.facts?.memberId) as PersonId) &&
        core.people.has(String(row.facts?.askerId) as PersonId),
    );
    if (!asks.length) {
      tried.push(place.name);
      continue;
    }
    for (const ask of asks) {
      const memberId = String(ask.facts!.memberId) as PersonId;
      const askerId = String(ask.facts!.askerId);
      const here = `${where}: ${ask.id}`;
      const book = director.ledger.people.get(memberId)!;
      const entry = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === ask.id,
      );
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "bill-carry",
      );
      expect(binding, `${here}: no bill-carry scene`).toBeTruthy();
      expect(
        binding!.roles.find((row) => row.role === "member")!.personIds,
        here,
      ).toEqual([askerId]);
      // The asker asks about the bill, in the lines that play, as ordinary
      // play says them, and the talk stands on the record.
      const result = purposeScene(core, director, memberId, entry!);
      expect(result?.kind, `${here}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      expect(result.scene.cause.id, here).toBe(ask.id);
      const bill = result.scene.facts.find((row) => row.key === "bill");
      expect(bill?.recordIds, `${here}: the bill`).toContain(ask.id);
      expect(result.scene.talk.state.text, here).toContain(bill!.text);
      if (ask.facts!.byExecutive === "yes")
        expect(
          result.scene.facts.find((row) => row.key === "carry-ask")?.recordIds,
          here,
        ).toContain(ask.id);
      console.log(
        `CARRY ${here}: "${result.scene.talk.state.text}" (${ask.facts!.carried === "yes" ? "carried" : "turned down"})`,
      );
    }
    return;
  }
  throw new Error(
    `no executive asked a watched member to carry a bill in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
