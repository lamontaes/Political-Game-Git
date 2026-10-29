import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  INTEREST_GROUPS_MODULE_ID,
  meetingsOn,
  type LobbyMeeting,
} from "../core2/modules/interest-groups";
import { lawInForce } from "../core2/modules/laws";
import {
  LEGISLATURE_MODULE_ID,
  authorityFor,
  castMemberVote,
  draftBill,
  holdVote,
  mayorVeto,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { ModuleRow } from "../core2/module-data";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { purposeScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";

// Someone comes to argue before the decision (episode desk-decision-both-sides,
// docs/design/scenes/from-life/desk-decision-both-sides.md). When a bill is
// presented to the player's desk the record names the player and the bill's
// sponsor. The sponsor comes and asks for a signature; where the sponsor
// cannot come (dead), the lobbyist of a group whose recorded meetings on the
// bill are against it comes and asks for a veto, saying what it costs the
// businesses they speak for; with neither, the aide's desk scene plays as
// before. Places are drawn in turn until one's mayor has a veto.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "desk-visit",
) as unknown as PurposeType;

it(`a bill on the desk brings its sponsor, or the group against it, in to argue, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "desk-visit");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const seats = townSeats(api);
    const mayor = seats.find(
      (row) =>
        row.office.kind === "mayor" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    )?.holder?.personId as PersonId | undefined;
    const council = seats.filter(
      (row) =>
        row.office.kind === "council" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    );
    const wage: Provision = {
      kind: "law-amount",
      series: "minimum-wage",
      value: (lawInForce(api, "minimum-wage").value ?? 0) + 100,
      unit: "minor/hour",
    };
    const provisions = [
      wage,
      ...PLATFORM_QUESTIONS.map((question): Provision => ({
        kind: "policy-question",
        question,
        value: 1,
      })),
    ].filter((row) => authorityFor(api, row).allowed);
    const missing = !mayor
      ? "no mayor who is a full person"
      : council.length < 3
        ? "fewer than three council members"
        : !mayorVeto(api).veto
          ? "the state's law gives the mayor no veto"
          : provisions.length < 3
            ? "fewer than three questions the town may answer"
            : null;
    if (missing) {
      tried.push(`${place.name}: ${missing}`);
      continue;
    }
    core.playerId = mayor!;
    director.watch(core, mayor!);

    // A bill carried by a council member, passed by the council, presented.
    // `before` runs after the vote and before the day closes, when the
    // director reads the records it will cast from.
    const present = (
      index: number,
      before?: (billId: string, sponsor: PersonId) => void,
    ) => {
      const sponsor = council[index]!.holder!.personId as PersonId;
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: sponsor,
        provisions: [provisions[index]!],
      });
      for (const seat of council)
        castMemberVote(api, bill.id, seat.holder!.personId!, "yes");
      expect(holdVote(api, bill.id).status, where).toBe("awaiting-signature");
      before?.(bill.id, sponsor);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const book = director.ledger.people.get(mayor!)!;
      const entry = book.schedule.find((row) =>
        row.momentId.includes(`bill-presented:${bill.id}`),
      );
      return { bill, sponsor, entry };
    };

    // 1. The sponsor comes.
    const first = present(0);
    expect(first.entry, `${where}: no moment for the presentment`).toBeTruthy();
    const types = first.entry!.bindings.map((row) => row.typeKey);
    // One desk scene for one bill: the sponsor's visit, not the aide's too.
    expect(types, where).toContain("desk-visit");
    expect(types, where).not.toContain("desk-bill");
    const visit = first.entry!.bindings.find(
      (b) => b.typeKey === "desk-visit",
    )!;
    expect(
      visit.roles.find((r) => r.role === "visitor")!.personIds,
      where,
    ).toEqual([first.sponsor]);
    const result = purposeScene(core, director, mayor!, first.entry!);
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    expect(scene.typeKey, where).toBe("desk-visit");
    expect(scene.askerId, where).toBe(first.sponsor);
    expect(scene.cause.id, where).toBe(`bill-presented:${first.bill.id}`);
    const said = (key: string) => scene.facts.find((row) => row.key === key);
    expect(said("for"), where).toBeTruthy();
    expect(said("against"), where).toBeFalsy();
    // The roll's two counts; the bank's lines join them ("5 to 2").
    expect(said("ayes")?.text, where).toMatch(/^\d+$/);
    expect(said("nays")?.text, where).toMatch(/^\d+$/);
    expect(said("ayes")?.recordIds, where).toContain(first.bill.id);
    expect(said("deadline")?.recordIds, where).toContain(scene.cause.id);

    // Plain words on every path, and four replies that are four stances.
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
    for (const line of lines)
      expect(line.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined/,
      );
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expect(new Set(root.map((row) => row.move)), where).toEqual(
      new Set(["agree", "refuse", "bargain", "ask"]),
    );
    expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);
    // Every ending hands the player to the desk.
    const ends: string[] = [];
    (function walk(node: typeof scene.talk.tree) {
      if (node.end?.ending)
        ends.push(`${node.end.ending.id}:${node.end.ending.opens}`);
      for (const reply of node.replies) if (reply.next) walk(reply.next);
    })(scene.talk.tree);
    expect(ends.length, where).toBeGreaterThan(0);
    for (const end of ends) expect(end, where).toMatch(/:desk$/);

    // A different speaker says it differently; the same one says it the same.
    const facts = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    const sayWith = (level: number) => {
      const out = composeSceneTalk(
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
      return out.kind === "composed"
        ? out.talk.lines.map((row) => row.text).join("|")
        : out.reason;
    };
    expect(sayWith(2), where).toBe(sayWith(2));
    expect(sayWith(2), where).not.toBe(sayWith(-2));

    // 2. The sponsor cannot come; a group's lobbyist, recorded against the
    // bill, does, and says the recorded cost.
    const lobbyist = council[2]!.holder!.personId as PersonId;
    const clear = (billId: string) => {
      for (const row of meetingsOn(api, billId))
        api
          .moduleState(INTEREST_GROUPS_MODULE_ID)
          .table("meetings")
          .remove(row.id);
    };
    const second = present(1, (billId, sponsor) => {
      core.people.get(sponsor)!.alive = false;
      clear(billId);
      const meeting: LobbyMeeting = {
        id: `lobby:test:${billId}:${mayor}`,
        groupId: "group:test",
        billId,
        memberId: mayor!,
        lobbyistId: lobbyist,
        date: core.date,
        annualCostMinor: 41_300_000,
        share: 0.5,
        side: -1,
      };
      api
        .moduleState(INTEREST_GROUPS_MODULE_ID)
        .table("meetings")
        .put(meeting as unknown as ModuleRow);
    });
    const against = second.entry!.bindings.find(
      (b) => b.typeKey === "desk-visit",
    );
    expect(against, `${where}: no lobbyist visit`).toBeTruthy();
    expect(
      against!.roles.find((r) => r.role === "visitor")!.personIds,
      where,
    ).toEqual([lobbyist]);
    const asked = purposeScene(core, director, mayor!, second.entry!);
    expect(asked?.kind, where).toBe("composed");
    if (asked?.kind !== "composed") return;
    const stood = (key: string) =>
      asked.scene.facts.find((row) => row.key === key);
    expect(stood("against"), where).toBeTruthy();
    expect(stood("for"), where).toBeFalsy();
    expect(stood("cost")?.text, where).toBe("$410,000");
    expect(
      asked.scene.talk.lines.map((row) => row.text).join(" "),
      where,
    ).not.toBe(scene.talk.lines.map((row) => row.text).join(" "));

    // 3. Neither can come: no visit is cast (the aide's desk scene keeps
    // the bill, where the town has an aide or a clerk).
    const third = present(2, (billId, sponsor) => {
      core.people.get(sponsor)!.alive = false;
      clear(billId);
    });
    expect(
      third.entry!.bindings.map((b) => b.typeKey),
      where,
    ).not.toContain("desk-visit");
    expect(
      purposeScene(core, director, mayor!, third.entry!, {
        typeKey: "desk-visit",
      }),
      where,
    ).toBeNull();

    // 4. The engine's own lobbying, with nothing placed by the test: where
    // the town's employers' group lobbied a fourth bill against, its lobbyist
    // is the one who comes when the sponsor cannot.
    let real = "the town's group lobbied no fourth bill";
    if (council.length > 3 && provisions.length > 3) {
      const fourth = present(3, (_billId, sponsor) => {
        core.people.get(sponsor)!.alive = false;
      });
      const own = meetingsOn(api, fourth.bill.id).filter(
        (row) =>
          row.lobbyistId &&
          (row.side ?? -1) < 0 &&
          core.people.get(row.lobbyistId as PersonId)?.alive,
      );
      const visited = fourth.entry!.bindings.find(
        (b) => b.typeKey === "desk-visit",
      );
      expect(!!visited, `${where}: own lobbying and the visit disagree`).toBe(
        own.length > 0,
      );
      if (visited) {
        const top = [...own].sort(
          (a, b) => b.annualCostMinor - a.annualCostMinor,
        )[0]!;
        expect(
          visited.roles.find((r) => r.role === "visitor")!.personIds,
          where,
        ).toEqual([top.lobbyistId]);
        real = `the engine's own meeting ${top.id} put its lobbyist ${top.lobbyistId} in the office`;
      }
    }

    console.log(
      `DESK-VISIT ${where}: ${real}.\n  sponsor: ${scene.talk.lines.map((row) => row.text).join(" / ")}\n  lobbyist: ${asked.scene.talk.lines.map((row) => row.text).join(" / ")}`,
    );
    return;
  }
  throw new Error(
    `no drawn place put a bill on a mayor's desk: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);

// The governor's year, with nothing placed by the test: every bill the
// state's chambers present to the governor names the governor and the
// sponsor, so the sponsor comes whenever they are a living person other than
// the governor. Places are drawn in turn until one's governor is a full person
// and a bill reaches them.
it(`a governor's year of presented bills brings each living sponsor in, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:g${attempt}`, "desk-visit-governor");
    const where = `${place.name} (${place.key}), seed ${seed}:g${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const governor = townSeats(api).find(
      (row) =>
        row.office.kind === "governor" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    )?.holder?.personId as PersonId | undefined;
    if (!governor) {
      tried.push(`${place.name}: no governor who is a full person`);
      continue;
    }
    core.playerId = governor;
    director.watch(core, governor);
    const start = core.date;
    for (let day = 1; day <= 365; day += 1)
      advanceCore(core, addDays(makeIsoDate(start), day));
    const presented = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "bill-presented" && row.facts?.executiveId === governor,
    );
    if (!presented.length) {
      tried.push(`${place.name}: no bill reached the governor`);
      continue;
    }
    const book = director.ledger.people.get(governor)!;
    let visits = 0;
    let staged = 0;
    let shown = "";
    let first = "";
    for (const record of presented) {
      const sponsor = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(String(record.facts?.billId)) as unknown as
        { sponsorId: string } | undefined;
      // A presentment the director paced down to a journal line is kept, not
      // staged: it has no scene and casts no one.
      const entry = book.schedule.find(
        (row) =>
          row.momentId.includes(record.id) && row.outcome !== "journal-line",
      );
      const cast = entry?.bindings.find((b) => b.typeKey === "desk-visit");
      const comes =
        !!sponsor &&
        sponsor.sponsorId !== governor &&
        core.people.get(sponsor.sponsorId)?.alive === true;
      // The director paces its scenes, so not every presentment is staged;
      // a staged one with a living sponsor must bring the sponsor.
      if (entry) staged += 1;
      if (entry && comes) {
        expect(cast, `${where}: ${record.id} brought no sponsor`).toBeTruthy();
        const scene = purposeScene(core, director, governor, entry);
        expect(scene?.kind, `${where}: ${record.id}`).toBe("composed");
        if (
          scene?.kind === "composed" &&
          scene.scene.typeKey === "desk-visit"
        ) {
          visits += 1;
          first ||= `${record.id}, sponsor ${sponsor!.sponsorId}`;
          shown ||= scene.scene.talk.lines
            .slice(0, 4)
            .map((row) => row.text)
            .join(" / ");
        }
      }
    }
    expect(visits, `${where}: no visit composed`).toBeGreaterThan(0);
    process.stdout.write(
      `DESK-VISIT-GOVERNOR ${where}: ${presented.length} bills presented, ${staged} staged, ${visits} brought a sponsor; first ${first}.\n  ${shown}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place put a bill on a governor's desk: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
