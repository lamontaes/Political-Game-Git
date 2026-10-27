import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { advanceCore } from "../core2/life";
import {
  executiveOf,
  memberKey,
  members,
  proposalRight,
  proposeAsExecutive,
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
// member who is a full person. An executive brings a bill only where no
// member files the change first, so in many towns none does in the weeks
// played; there the executive brings one by hand, through the legislature's
// own ask, and the member decides as anyone asked would.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 45;
const ATTEMPTS = 12;
/** How many of a body's policies an executive may bring by hand. */
const BY_HAND = 6;

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
    const watchedAsks = () =>
      [...core.durableLog.values()].filter(
        (row) =>
          row.kind === "carry-asked" &&
          director.ledger.people.has(String(row.facts?.memberId) as PersonId) &&
          core.people.has(String(row.facts?.askerId) as PersonId),
      );
    if (!watchedAsks().length) {
      // Edge case by hand: an executive brings a change of policy its town
      // may make to a body that sits (a council, a board, a chamber: more
      // than one seat, not an office of one). They ask the member who leans
      // most toward it, and only an ask to a member who is a full person is
      // on the record, so each body and its first few policies are tried
      // until one is; then the day is played.
      for (const body of bodies.filter(
        (row) => members(api, row.office.id).length > 1,
      )) {
        const policies = billCatalog(
          api,
          body.office.level as "city" | "county" | "state",
        )
          .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
          .filter(
            (row) => row.kind === "policy-question" && row.authority.allowed,
          )
          .slice(0, BY_HAND);
        for (const policy of policies) {
          if (watchedAsks().length) break;
          proposeAsExecutive(api, {
            bodyOfficeId: body.office.id,
            provisions: [
              provisionFor({ policyId: policy.id, operation: "enact" }),
            ],
          });
        }
        if (watchedAsks().length) break;
      }
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }
    const asks = watchedAsks();
    if (!asks.length) {
      tried.push(place.name);
      continue;
    }
    // Asks whose own talk was composed and checked (an ask taken into the
    // day's sitting is talked of by that sitting's scene, so it does not count).
    let composed = 0;
    for (const ask of asks) {
      const memberId = String(ask.facts!.memberId) as PersonId;
      const askerId = String(ask.facts!.askerId);
      const here = `${where}: ${ask.id}`;
      const book = director.ledger.people.get(memberId)!;
      const own = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === ask.id,
      );
      // One sitting covers a day (scheduling.ts): a second ask by the same
      // asker that day is taken into the first one's scene, which cites it.
      const sitting = own?.bindings.some((row) => row.typeKey === "bill-carry")
        ? undefined
        : book.schedule.find(
            (row) =>
              row.date === ask.date &&
              row.bindings.some(
                (other) =>
                  other.typeKey === "bill-carry" &&
                  other.joined?.some((row) => row.causeId === ask.id),
              ),
          );
      const entry = sitting ?? own;
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "bill-carry",
      );
      expect(binding, `${here}: no bill-carry scene`).toBeTruthy();
      expect(
        binding!.roles.find((row) => row.role === "member")!.personIds,
        here,
      ).toEqual([askerId]);
      // The sitting's own ask is talked of when its turn comes.
      if (sitting) continue;
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
      composed += 1;
      console.log(
        `CARRY ${here}: "${result.scene.talk.state.text}" (${ask.facts!.carried === "yes" ? "carried" : "turned down"})`,
      );
    }
    if (composed) return;
    tried.push(`${place.name}: every ask was taken into a sitting`);
  }
  throw new Error(
    `no executive asked a watched member to carry a bill in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
