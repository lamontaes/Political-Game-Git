import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };
import { lineForPost } from "../core2/budgets-treasury";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  BUDGETS_MODULE_ID,
  governments,
  type BudgetRow,
} from "../core2/modules/budgets";
import { appointmentsIn } from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { SITUATION_LIBRARY } from "./scheduling";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { purposeScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// The department head argues a cut (episode budget-cut-department-head,
// docs/design/scenes/from-life/budget-cut-department-head.md). When the
// council adopts a budget that takes money from a line, the head of the
// department that line pays for comes to the executive. Three things are
// checked in a drawn town with a mayor who is a full person and an appointed
// head on a named line:
//  1. the engine's own year of records: every cut it records names the
//     sitting mayor (and a raise names no one).
//  2. a cut that names the mayor, shaped as that item will record it, fires
//     the scene with the line's own head in the head's chair, a cause record
//     the talk cites, and facts said from the record.
//  3. a raise to the same line, or a cut to a line no post draws on, casts
//     no head and fires nothing.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "budget-cut",
) as unknown as PurposeType;

it(`a cut to a line brings its department head to the executive, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "budget-cut");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const mayor = townSeats(api).find(
      (row) =>
        row.office.kind === "mayor" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    )?.holder?.personId as PersonId | undefined;
    const town = lawChain(api).townPlaceId;
    const heads = appointmentsIn(api, town).filter(
      (row) =>
        core.people.get(row.holderId)?.alive &&
        lineForPost("city", `town:${row.post}`) !== "administration",
    );
    const gov = governments(api).find((row) => row.level === "city");
    const missing = !mayor
      ? "no mayor who is a full person"
      : !heads.length
        ? "no appointed head on a named line"
        : !gov
          ? "no city government on the books"
          : null;
    if (missing) {
      tried.push(`${place.name}: ${missing}`);
      continue;
    }
    core.playerId = mayor!;
    director.watch(core, mayor!);
    const head = heads[0]!;
    const line = lineForPost("city", `town:${head.post}`);

    // 1. A year of the engine's own records.
    const start = core.date;
    for (let day = 1; day <= 365; day += 1)
      advanceCore(core, addDays(makeIsoDate(start), day));
    const book = director.ledger.people.get(mayor!)!;
    // Every cut the engine recorded names the sitting executive, a raise
    // names no one (world-budget-cut-names-the-executive).
    const changes = [...core.durableLog.values()].filter(
      (row) => row.kind === "budget-line-changed",
    );
    console.log(
      `${where}: ${changes.filter((r) => Number(r.facts?.deltaMinor) < 0).length} cuts in the year`,
    );
    for (const row of changes) {
      const lowers = Number(row.facts?.deltaMinor) < 0;
      const named = row.personIds.length > 0;
      if (lowers && row.facts?.level === "city")
        expect(
          row.personIds,
          `${where}: the cut ${row.id} names the executive`,
        ).toEqual([mayor!]);
      else if (!lowers)
        expect(named, `${where}: the raise ${row.id} names no one`).toBe(false);
      if (named)
        expect(row.facts?.executiveId, `${where}: ${row.id}`).toBe(
          row.personIds[0],
        );
    }

    // 2. The record as the engine item will write it.
    const budget = [
      core.date.slice(0, 4),
      String(Number(core.date.slice(0, 4)) + 1),
      String(Number(core.date.slice(0, 4)) - 1),
    ]
      .map(
        (year) =>
          api
            .moduleState(BUDGETS_MODULE_ID)
            .table("budgets")
            .get(`budget:${gov!.id}:${year}`) as unknown as
            BudgetRow | undefined,
      )
      .find(Boolean);
    const spending = budget?.spendingMinor[line] ?? 0;
    const cut = (id: string, deltaMinor: number, onLine = line) => {
      const record = {
        id,
        date: core.date,
        kind: "budget-line-changed",
        personIds: [mayor!],
        placeId: town,
        source: {
          tag: "SOURCED" as const,
          citation: "Budget adopted (council vote)",
          asOf: core.date,
        },
        publicRecord: true,
        news: false,
        facts: {
          governmentId: gov!.id,
          level: "city",
          line: onLine,
          deltaMinor: String(deltaMinor),
          measureId: budget?.id ?? "",
          executiveId: mayor!,
        },
      };
      coreAPI(core).emit(record);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      return record;
    };
    const schedule = (id: string) =>
      director.ledger.people
        .get(mayor!)!
        .schedule.find((row) => row.momentId.includes(id))
        ?.bindings.find((b) => b.typeKey === "budget-cut");

    const record = cut(
      `budget-line-changed:test:${line}:cut`,
      -Math.max(Math.round(spending * 0.07), 4_100_000),
    );
    const binding = schedule(record.id);
    expect(binding, `${where}: no scene from the cut`).toBeTruthy();
    const chair = binding!.roles.find((row) => row.role === "head")!.personIds;
    // The post can change hands during the year (seed 394907bd…, Enigma,
    // Georgia: a new fire chief), so the head is whoever holds the
    // appointment on the day of the cut.
    const holder =
      appointmentsIn(api, town).find((row) => row.id === head.id)?.holderId ??
      head.holderId;
    expect(chair, where).toEqual([holder]);
    const entry = book.schedule.find((row) =>
      row.momentId.includes(record.id),
    )!;
    const result = purposeScene(core, director, mayor!, entry, {
      typeKey: "budget-cut",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    expect(scene.cause.id, where).toBe(record.id);
    const said = (key: string) => scene.facts.find((row) => row.key === key);
    expect(said("cut")?.text, where).toMatch(/^\$[\d,]+$/);
    expect(said("cut")?.recordIds, where).toContain(record.id);
    expect(said("post")?.text, where).toBe(head.title.toLowerCase());
    expect(said("post")?.recordIds, where).toContain(head.id);
    // What the line pays for, in the words the budget screen names it.
    const named = (lineNames.lines as Record<string, { name: string }>)[line]!
      .name;
    expect(said("line")?.text, where).toBe(
      named.charAt(0).toLowerCase() + named.slice(1),
    );
    expect(said("line")?.recordIds, where).toContain(record.id);
    if (spending)
      expect(said("percent")?.recordIds, where).toContain(budget!.id);

    // Every line is plain words: no id, kind, ISO date or raw number.
    const lines = [
      ...scene.talk.lines,
      ...(function* walk(
        node: typeof scene.talk.tree,
      ): Generator<{ text: string }> {
        for (const reply of node.replies) {
          yield reply.line;
          if (reply.next) {
            yield* reply.next.lines;
            yield* walk(reply.next);
          }
        }
      })(scene.talk.tree),
    ];
    // No line leans on something nobody said.
    for (const line_ of lines)
      expect(line_.text, `${where}: ${line_.text}`).not.toMatch(
        /has the page|send me the list/i,
      );
    for (const line_ of lines)
      expect(line_.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
      );

    // Up to four replies, all different stances: different moves, different lines (owner, Nov 10).
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expectUpToFourDifferent(root, where);
    for (const row of root)
      expect(["agree", "refuse", "bargain", "ask"], where).toContain(row.move);
    expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);

    // A different speaker says it differently: across trait profiles the
    // head's words or path change, and the same profile says the same thing.
    const facts = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    const sayWith = (level: number) =>
      composeSceneTalk(
        core,
        director,
        { askerId: scene.askerId, askedId: scene.askedId },
        TYPE,
        facts,
        {
          askerTraits: Object.fromEntries(
            [
              "personality-v1:facet-friendly",
              "personality-v1:facet-affectionate",
              "personality-v1:facet-hostile",
              "personality-v1:facet-persistent",
              "personality-v1:facet-argumentative",
              "personality-v1:facet-forgiving",
              "personality-v1:facet-sensitive",
            ].map((id, k) => [id, k % 2 ? -level : level]),
          ),
        },
      );
    const text = (level: number) => {
      const out = sayWith(level);
      return out.kind === "composed"
        ? out.talk.lines.map((row) => row.text).join("|")
        : out.reason;
    };
    expect(text(2), where).toBe(text(2));
    expect(text(2), where).not.toBe(text(-2));

    // 3. A raise, or a cut to a line no post draws on, casts no head.
    const raise = cut(`budget-line-changed:test:${line}:raise`, 4_100_000);
    expect(schedule(raise.id), `${where}: a raise fired the scene`).toBeFalsy();
    const admin = cut(
      `budget-line-changed:test:administration:cut`,
      -4_100_000,
      "administration",
    );
    expect(schedule(admin.id), `${where}: no post draws on it`).toBeFalsy();

    console.log(
      `BUDGET-CUT ${where}: ${head.title} ${head.holderId} on ${line}, cut ${said("cut")?.text}${said("percent") ? ` (${said("percent")!.text} percent)` : ""}${said("years") ? `, ${said("years")!.text} years in post` : ""}\n${lines.map((row) => `  ${row.text}`).join("\n")}\n  records: ${record.id}, ${head.id}${budget ? `, ${budget.id}` : ""}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a mayor and an appointed head: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
