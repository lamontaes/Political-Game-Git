/**
 * What an official says to a recall petition's organizer moves the drive
 * (play-first, recall-reply-moves-the-drive): the recall scene stages from
 * the petition's record, the official's reply is written by the scene's own
 * writer, the recalls engine keeps it and makes it a public record, and the
 * count on the petition's due day reads it in its reasons. A place with a
 * recall law drawn from all 56; a divisive ordinance passed by its council
 * and played until a petition starts against a member who is a full person.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { personStance, PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { resolveMunicipalRecallRule } from "../core2/gov-rules/municipal-ballot-rules";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { draftBill, holdVote } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { recallsOf } from "../core2/modules/recalls";
import { coreAPI } from "../core2/state";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on a petition against a full-person member. */
const DRAWS = 8;
/** Days played after the ordinance for a petition to start. */
const MOST_DAYS = 60;

it(`an official's answer at the petition table is read by the drive's count (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    // A place whose state gives its towns a recall.
    let place = drawPlace(`${seed}:${draw}`, "recall-answer");
    for (
      let redraw = 1;
      redraw < 60 &&
      !resolveMunicipalRecallRule(place.state.slice(3)).circulationDays;
      redraw += 1
    )
      place = drawPlace(`${seed}:${draw}:${redraw}`, "recall-answer");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    if (!resolveMunicipalRecallRule(place.state.slice(3)).circulationDays) {
      tried.push(`${where}: no recall law`);
      continue;
    }
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).filter(
      (s) =>
        s.office.kind === "council" &&
        s.holder?.personId &&
        core.people.get(s.holder.personId)?.alive,
    );
    if (council.length < 2) {
      tried.push(`${where}: no council of full people`);
      continue;
    }
    // The council's members are the people a petition may name: each is in
    // a player's circle (whose records the world keeps) and watched.
    const members = new Set(council.map((s) => s.holder!.personId!));
    core.playerId = [...members].sort()[0]!;
    for (const id of members) {
      core.focusPersonIds.add(id as never);
      director.watch(core, id as never);
    }
    // A divisive ordinance the council passes, as the recall test does.
    const divisive = [...PLATFORM_QUESTIONS].sort(
      (a, b) =>
        Math.abs(personStance(1, b)) - Math.abs(personStance(1, a)) ||
        a.localeCompare(b),
    );
    for (const question of divisive) {
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: council[0]!.holder!.personId!,
        provisions: [{ kind: "policy-question", question, value: 1 }],
      });
      if (bill.status === "blocked") continue;
      if (
        ["enacted", "signed", "overridden"].includes(
          holdVote(api, bill.id).status,
        )
      )
        break;
    }
    const start = makeIsoDate(core.date);
    const open = () =>
      recallsOf(api).find(
        (r) => r.status === "circulating" && members.has(r.memberId),
      );
    for (let day = 1; day <= MOST_DAYS && !open(); day += 1)
      advanceCore(core, addDays(start, day));
    const recall = open();
    if (!recall) {
      tried.push(`${where}: no petition against a member in ${MOST_DAYS} days`);
      continue;
    }
    // The scene stages from the petition's record: the organizer confronts
    // the member at the table.
    const memberId = recall.memberId;
    const entry = director.ledger.people
      .get(memberId as never)!
      .schedule.find((row) =>
        row.momentId.includes(`recall-petition:${recall.id}`),
      );
    const binding = entry?.bindings.find((row) => row.typeKey === "recall");
    expect(
      binding,
      `${where}: ${recall.id}: no recall scene staged`,
    ).toBeTruthy();
    // A petition against the official is their own record: it stops the day
    // where its scene is set (the petition table in town).
    expect(
      entry!.interrupt,
      `${where}: ${recall.id}: the petition did not stop the day`,
    ).toBe(true);
    const composed = purposeScene(core, director, memberId as never, entry!);
    expect(
      composed?.kind,
      `${where}: ${recall.id}: ${composed?.kind === "skipped" ? composed.reason : ""}`,
    ).toBe("composed");
    if (composed?.kind !== "composed") return;
    expect(composed.scene.cause.id).toBe(`recall-petition:${recall.id}`);
    // The organizer says what the petition's record holds: the vote. With no
    // record of a promise on the bill, no line on any path claims one.
    const said: string[] = [];
    const walk = (node: TreeNode | null | undefined): void => {
      if (!node) return;
      for (const line of node.lines) said.push(line.text);
      for (const reply of node.replies) {
        said.push(reply.line.text);
        walk(reply.next);
      }
    };
    walk(composed.scene.talk.tree);
    if (!composed.scene.facts.some((row) => row.key === "promised-against"))
      for (const text of said)
        expect(text, `${where}: ${recall.id}`).not.toMatch(
          /telling us you wouldn't|never said that|office hours|mailer|changed (?:my|your) mind/i,
        );
    process.stdout.write(
      `RECALL ${where}: ${recall.id}: ${composed.scene.talk.state.text} / ${said.filter((text) => /voted for|one vote/i.test(text)).join(" / ")}\n`,
    );
    // The member hears them out: an answer.
    const path = composed.scene.talk.tree.replies.findIndex(
      (reply) => reply.line.move === "ask",
    );
    expect(
      path,
      `${where}: no reply that hears them out`,
    ).toBeGreaterThanOrEqual(0);
    const replyId = replyInScene(core, director, memberId as never, entry!, [
      path,
    ]);
    expect(replyId, `${where}: ${recall.id}`).toBeTruthy();
    const kept = recallsOf(api).find((r) => r.id === recall.id)!;
    expect(
      kept.answers?.map((a) => a.id),
      `${where}: ${recall.id}`,
    ).toContain(replyId);
    // The count on the due day reads the answer in its reasons, and an
    // answer never adds signers.
    advanceCore(core, addDays(makeIsoDate(recall.due), 1));
    const counted = recallsOf(api).find((r) => r.id === recall.id)!;
    expect(counted.count?.answerIds, `${where}: ${recall.id}`).toContain(
      replyId,
    );
    expect(counted.count!.heard, `${where}: ${recall.id}`).toBeGreaterThan(0);
    expect(
      counted.count!.changed,
      `${where}: ${recall.id}`,
    ).toBeLessThanOrEqual(0);
    expect(counted.count!.before, `${where}: ${recall.id}`).toBe(
      recall.signatures,
    );
    expect(counted.signatures).toBe(counted.count!.signatures);
    expect(counted.status, `${where}: ${recall.id}`).toBe(
      counted.signatures >= counted.required ? "on-ballot" : "failed",
    );
    return;
  }
  throw new Error(`no petition to answer: ${tried.join("; ")}`);
}, 900_000);
