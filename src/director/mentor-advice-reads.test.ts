import { randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { seatParty } from "../core2/candidate-pool";
import { partyMentorOf } from "../core2/modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  filingWindowOpens,
  type ContestRow,
} from "../core2/modules/elections";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { PARTIES_MODULE_ID } from "../core2/modules/parties";
import { P } from "../core2/parameters";
import { corePlaceByKey } from "../core2/place-lookup";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The mentor's advice speaks for its cause (Story lead, Nov 17): a coworker
// who took a new hire under their wing plays only the work key's pieces, and
// a party's officeholder after a chair's ask plays only the party key's, with
// the seat said as the offices engine's serving term holds it. Each place is
// drawn from all 56 and every place passed over is named.

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const WORK = "feeling:event:work.mentorship-formed";
const PARTY = "circumstance:mentor-weighs-in";
const KEY_OF_LABEL: Record<string, string> = {
  [WORK]: "work-mentor",
  [PARTY]: "party-mentor",
};
/** The `mentor-advice` keys each piece serves, by piece key. */
const KEYS = new Map<string, Set<string>>();
for (const part of (
  sceneTalkBank as unknown as {
    parts: { key: string; uses: { purpose?: string; key?: string }[] }[];
  }
).parts)
  for (const use of part.uses)
    if (use.purpose === "mentor-advice")
      KEYS.set(part.key, (KEYS.get(part.key) ?? new Set()).add(use.key ?? ""));

/** Every piece said anywhere in a talk's tree. */
function piecesOf(node: TreeNode, out: string[] = []): string[] {
  for (const line of node.lines) out.push(...line.parts);
  for (const reply of node.replies) {
    out.push(...reply.line.parts);
    if (reply.next) piecesOf(reply.next, out);
  }
  if (node.end?.close) out.push(...node.end.close.parts);
  return out;
}

/**
 * Plays drawn places a month at a time, the director watching the town's
 * young full people (a new hire's eldest coworker takes them under a wing in
 * the partnerships monthly review), until an advice scene of `label` is
 * composed; returns it with the place, or throws naming every place passed
 * over.
 */
function findAdvice(label: string, months: number, tries: number) {
  const passed: string[] = [];
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const place = drawPlace(`${SEED}:${attempt}`, `mentor-advice:${label}`);
    const where = `${place.name} (${place.key}), seed ${SEED}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
    const watch = (id: string) => {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    };
    const workers = () => {
      for (const person of core.people.values()) {
        const age = ageOnDate(
          makeIsoDate(person.birthDate),
          makeIsoDate(core.date),
        );
        if (
          person.alive &&
          person.tier !== "husk" &&
          person.placeId === town &&
          age >= 16 &&
          age < 30
        )
          watch(person.id);
      }
    };
    workers();
    const skipped: string[] = [];
    for (let month = 0; month < months; month += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      workers();
      for (const book of director.ledger.people.values())
        for (const entry of book.schedule) {
          const moment = book.momentsById.get(entry.momentId);
          if (moment?.label !== label) continue;
          if (!entry.bindings.some((row) => row.typeKey === "advice")) continue;
          const result = purposeScene(
            core,
            director,
            book.personId as PersonId,
            entry,
            { typeKey: "advice" },
          );
          if (result?.kind !== "composed") {
            skipped.push(`${moment.causeId}: ${result?.reason ?? "none"}`);
            continue;
          }
          return {
            core,
            scene: result.scene,
            causeId: moment.causeId,
            where,
            passed,
          };
        }
    }
    passed.push(
      `${where}: no ${label} scene composed by ${core.date}${skipped.length ? ` (${skipped.slice(0, 3).join("; ")})` : ""}`,
    );
  }
  throw new Error(`no ${label} scene: ${passed.join("; ")}`);
}

/**
 * A party's mentor weighs in only for the person the player controls, the
 * day after a chair's ask, and a party asks the day a partisan seat's filing
 * opens. So each drawn place opens a few days before its first such window
 * (the elections engine's own calendar) and runs day by day to the first
 * member asked and taken under a wing, who is then played as the controlled
 * person through the days after the ask (the first choice of each offer
 * taken), until the advice scene is composed.
 */
function findPartyAdvice(tries: number) {
  const passed: string[] = [];
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const place = drawPlace(`${SEED}:${attempt}`, `mentor-advice:${PARTY}`);
    const where = `${place.name} (${place.key}), seed ${SEED}:${attempt}`;
    const build = (start: string) =>
      buildBenchWorld(place.seed, start as never, {
        twoLevel: true,
        placeKey: place.key,
      });
    const first = build(gameStartDate());
    const firstApi = coreAPI(first.core);
    const opens = (
      firstApi
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter((row) => seatParty(firstApi, row))
      .map((row) => filingWindowOpens(row))
      .filter((day) => day > first.core.date)
      .sort()[P.zero];
    if (!opens || !first.core.modules.has(PARTIES_MODULE_ID)) {
      passed.push(
        `${where}: no seat held under a party label opens for filing`,
      );
      continue;
    }
    const start = addDays(makeIsoDate(opens), -3);
    const { core, director } = build(start);
    const api = coreAPI(core);
    // The asks are kept in the durable log only for the player's circle: the
    // party's members in town are held as such while the window opens.
    const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
    for (const tie of api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .rows() as unknown as { personId: string; tie: string }[])
      if (
        tie.tie === "party" &&
        core.people.get(tie.personId as PersonId)?.placeId === town
      )
        core.focusPersonIds.add(tie.personId as PersonId);
    const written: {
      id: string;
      date: string;
      personId: PersonId;
      partyId: string;
    }[] = [];
    api.subscribeEvents(
      "mentor-advice-asks",
      ["party-asked"],
      (_api, event) => {
        const personId = event.personIds[P.zero] as PersonId | undefined;
        if (personId)
          written.push({
            id: event.id,
            date: event.date,
            personId,
            partyId: String(event.facts?.partyId ?? ""),
          });
      },
    );
    // Day by day to the first member asked and taken under a wing; that
    // member is then played as the controlled person, and the mentor weighs
    // in the next day.
    let ask: (typeof written)[number] | undefined;
    for (let day = 0; day < 14 && !ask; day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), P.one));
      ask = written.find(
        (row) =>
          core.durableLog.has(row.id) &&
          partyMentorOf(api, row.personId, row.partyId),
      );
    }
    if (!ask) {
      passed.push(
        `${where}: no member asked and taken under a wing by ${core.date} (${written.length} asks)`,
      );
      continue;
    }
    const asked = ask;
    director.watch(core, asked.personId);
    const book = director.ledger.people.get(asked.personId)!;
    const composedFor = () => {
      for (const entry of book.schedule) {
        const moment = book.momentsById.get(entry.momentId);
        if (moment?.label !== PARTY) continue;
        if (!entry.bindings.some((row) => row.typeKey === "advice")) continue;
        const result = purposeScene(core, director, asked.personId, entry, {
          typeKey: "advice",
        });
        if (result?.kind === "composed")
          return { scene: result.scene, causeId: moment.causeId };
      }
      return null;
    };
    let found: ReturnType<typeof composedFor> = null;
    let packet = advancePlayerV1(core, {
      controlledPersonId: asked.personId,
      through: {
        date: addDays(makeIsoDate(asked.date), 4),
        minuteOfDay: P.zero,
      },
    });
    while (packet.kind !== "complete" && !(found = composedFor()))
      packet =
        packet.kind === "stop"
          ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
          : resumePlayerV1(core, {
              kind: "choice",
              pauseId: packet.pauseId,
              offerId: packet.offers[P.zero]!.offerId,
            });
    found ??= composedFor();
    if (found) return { core, ...found, where, passed };
    passed.push(
      `${where}: ${asked.id} played, no advice scene by ${core.date}`,
    );
  }
  throw new Error(`no ${PARTY} scene: ${passed.join("; ")}`);
}

/** Every piece of the talk serves the cause's own key. */
function expectOwnKey(
  scene: ReturnType<typeof findAdvice>["scene"],
  label: string,
  here: string,
) {
  const said = [
    ...scene.talk.narration.flatMap((line) => line.parts),
    ...(scene.talk.open?.parts ?? []),
    ...scene.talk.intro.flatMap((line) => line.parts),
    ...scene.talk.state.parts,
    ...piecesOf(scene.talk.tree),
  ];
  expect(said.length, here).toBeGreaterThan(P.zero);
  for (const key of said)
    expect([...(KEYS.get(key) ?? [])], `${here}: ${key}`).toContain(
      KEY_OF_LABEL[label],
    );
}

describe("the mentor's advice reads the records behind its cause", () => {
  it("a coworker's advice to a new hire plays only the work key's lines, about the employer the record names", () => {
    setBookkeeping(false);
    const found = findAdvice(WORK, 6, 4);
    const here = `${found.where} (${found.causeId})`;
    expectOwnKey(found.scene, WORK, here);
    const record = found.core.durableLog.get(found.causeId)!;
    const employer = found.scene.facts.find((row) => row.key === "employer");
    expect(employer?.recordIds, here).toContain(record.facts!.organizationId);
    for (const key of ["office", "chair", "holder", "seat-held", "seat-open"])
      expect(
        found.scene.facts.some((row) => row.key === key),
        `${here}: ${key}`,
      ).toBe(false);
    process.stdout.write(
      `MENTOR WORK ${here}: ${found.scene.talk.state.text}${found.passed.length ? `; passed over ${found.passed.join("; ")}` : ""}\n`,
    );
  }, 300_000);

  it("a party officeholder's advice plays only the party key's lines, with the seat as the offices engine's serving term holds it", () => {
    setBookkeeping(false);
    const found = findPartyAdvice(4);
    const here = `${found.where} (${found.causeId})`;
    expectOwnKey(found.scene, PARTY, here);
    const { core, scene } = found;
    const api = coreAPI(core);
    const ask = core.durableLog.get(found.causeId)!;
    const contest = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(String(ask.facts!.contestId)) as unknown as { seatId: string };
    const serving = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [contest.seatId, "serving"]) as unknown as {
      id: string;
      personId: string | null;
    }[];
    const fact = (key: string) => scene.facts.find((row) => row.key === key);
    const term = serving[P.zero];
    if (!term) expect(fact("seat-open"), here).toBeDefined();
    else {
      const named = fact("seat-held") ?? fact("seat-mine");
      expect(named?.recordIds, here).toContain(term.id);
      expect(fact("seat-open"), here).toBeUndefined();
      expect(!!fact("seat-mine"), `${here}: the mentor holds the seat`).toBe(
        term.personId === scene.askerId,
      );
    }
    // No figure is spoken: the chance and the spans are said in words.
    for (const line of [scene.talk.state, ...scene.talk.narration])
      expect(line.text, here).not.toMatch(/\d/);
    process.stdout.write(
      `MENTOR PARTY ${here}: ${scene.talk.state.text}${found.passed.length ? `; passed over ${found.passed.join("; ")}` : ""}\n`,
    );
  }, 900_000);
});
