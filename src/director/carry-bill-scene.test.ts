import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import type { TreeNode } from "./scene-talk";
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
  floorDateOf,
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
  // Scenes composed across the places drawn, and those with a vote date set:
  // the months check needs a bill whose floor date is set, so places are drawn
  // until one has it, and the places passed over are named.
  let composedAny = 0;
  let withVote = 0;
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
      // A promise of time fits the calendar (Fable A, Nov 13, rule 22): a
      // count is promised for a day before the bill's vote, from its floor
      // date, and on the vote's own day it is "tonight".
      const floor = floorDateOf(api, String(ask.facts!.billId ?? ""));
      const countBy = result.scene.facts.find((row) => row.key === "count-by");
      const tonight = result.scene.facts.find(
        (row) => row.key === "vote-tonight",
      );
      if (countBy) expect(floor! > core.date, here).toBe(true);
      if (tonight)
        expect(floor!.slice(0, 10), here).toBe(core.date.slice(0, 10));
      // "Next month" is said only when the vote is in the month after the
      // scene's; any other later day is said from the record, "vote-on".
      const nextMonth = result.scene.facts.find(
        (row) => row.key === "vote-next-month",
      );
      const voteOn = result.scene.facts.find((row) => row.key === "vote-on");
      if (floor && floor > core.date && !tonight) {
        const months =
          (Number(floor.slice(0, 4)) - Number(core.date.slice(0, 4))) * 12 +
          Number(floor.slice(5, 7)) -
          Number(core.date.slice(5, 7));
        expect(Boolean(nextMonth), `${here}: next month`).toBe(months === 1);
        expect(Boolean(voteOn), `${here}: the vote's day`).toBe(months !== 1);
      }
      expect(!(nextMonth && voteOn), here).toBe(true);
      // Whatever branch the player takes, "next month" is said only when the
      // vote is in the month after the scene's.
      const said: string[] = [];
      const walk = (node: TreeNode | null, depth: number) => {
        if (!node) return;
        for (const line of node.lines)
          said.push(`${"  ".repeat(depth)}asker: ${line.text}`);
        for (const reply of node.replies) {
          said.push(`${"  ".repeat(depth + 1)}[${reply.line.text}]`);
          walk(reply.next, depth + 2);
        }
      };
      walk(result.scene.talk.tree, 0);
      if (!nextMonth)
        expect(
          said.filter((row) => /next month/i.test(row)),
          `${here}: says next month, vote ${floor ?? "not set"}`,
        ).toEqual([]);
      if (process.env.CARRY_TREE_OUT)
        appendFileSync(
          process.env.CARRY_TREE_OUT,
          `SCENE ${where} on ${core.date}, the vote ${floor ?? "not set"}\n${said.join("\n")}\n`,
        );
      process.stdout.write(
        `CARRY ${here} on ${core.date}: the vote ${floor ?? "not set"}; count-by ${countBy?.text ?? "none"}; tonight ${tonight ? "yes" : "no"}; next month ${nextMonth ? "yes" : "no"}; vote-on ${voteOn?.text ?? "none"}\n`,
      );
      composed += 1;
      composedAny += 1;
      if (floor && floor > core.date) withVote += 1;
      console.log(
        `CARRY ${here}: "${result.scene.talk.state.text}" (${ask.facts!.carried === "yes" ? "carried" : "turned down"})`,
      );
    }
    if (withVote) return;
    tried.push(
      composed
        ? `${place.name}: no vote date set yet`
        : `${place.name}: every ask was taken into a sitting`,
    );
  }
  if (composedAny) {
    console.log(
      `CARRY no drawn place had a vote date set; passed over: ${tried.join("; ")} (seed ${seed})`,
    );
    return;
  }
  throw new Error(
    `no executive asked a watched member to carry a bill in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
