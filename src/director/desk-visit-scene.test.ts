import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { storyScene } from "../bench/story";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  INTEREST_GROUPS_MODULE_ID,
  meetingsOn,
  type LobbyMeeting,
} from "../core2/modules/interest-groups";
import { lawInForce } from "../core2/modules/laws";
import { deskWaiting } from "../core2/modules/office-day";
import {
  LEGISLATURE_MODULE_ID,
  authorityFor,
  billOf,
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
import { purposeScene, replyInScene } from "./purpose-scene";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
} from "./scene-talk";
import purposeArcs from "./data/purpose-arcs.json" with { type: "json" };
import { SITUATION_LIBRARY } from "./scheduling";
import { expectUpToFourDifferent } from "./reply-set-check";

// The arc's apart sets say at most one of their facts holds in one visit;
// the pair sheets leave out pairs that need two of one set, so every visit
// the desk stages checks that the facts it was given never hold two.
const APART = (
  purposeArcs as unknown as {
    purposes: Record<string, { apart?: string[][] }>;
  }
).purposes["desk-visit"]!.apart!;
function expectApart(facts: readonly { key: string }[], where: string): void {
  const held = new Set(facts.map((row) => row.key));
  for (const names of APART) {
    const both = names.filter((name) => held.has(name));
    expect(
      both.length,
      `${where}: ${both.join(" and ")} hold together`,
    ).toBeLessThan(2);
  }
}

// Someone comes to argue before the decision (episode desk-decision-both-sides,
// docs/design/scenes/from-life/desk-decision-both-sides.md). When a bill is
// presented to the player's desk the record names the player and the bill's
// sponsor. The sponsor comes and asks for a signature; where the sponsor
// cannot come (dead), the lobbyist of a group whose recorded meetings on the
// bill are against it comes and asks for a veto, saying what it costs the
// businesses they speak for; with neither, the aide's desk scene plays as
// before. Places are drawn in turn until one's mayor has a veto.
// Pinned (pinned-tests): Havre, Montana puts a titled bill on the mayor's
// desk at attempt 2 and a governor's sponsor visit in the same run; a draw
// over fresh seeds made this test red by luck (Kansas, Oklahoma had no
// governor's visit). GOLDEN_PATH_SEED still runs any other draw.
const seed =
  process.env.GOLDEN_PATH_SEED ?? "4276344481a2b078e70633cfee47d0caccb65f74";
const ATTEMPTS = 8;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "desk-visit",
) as unknown as PurposeType;

/** The desk visit's replies that say the act, by the piece the reply says. */
const DESK_ACTS = (
  purposeArcs as unknown as {
    purposes: Record<string, { acts: { sign: string[]; veto: string[] } }>;
  }
).purposes["desk-visit"]!.acts;

/**
 * Every path of a talk with a speaker on every line, what each ending keeps,
 * and what the player's last reply does to the bill (Words lead, Nov 14: the
 * replay shows who says what and what each ending does).
 */
function talkPaths(
  tag: string,
  where: string,
  talk: { lines: { speaker: string; text: string }[]; tree: TreeNode },
): string {
  const spoken = (line: { speaker: string; text: string }) =>
    `${line.speaker}: ${line.text}`;
  const paths: string[] = [];
  (function walk(node: TreeNode, before: string[]) {
    for (const reply of node.replies) {
      // The menu as the player sees it (Words lead rule 114): every reply
      // offered at this turn under "You say:", the pressed one marked.
      const menu = node.replies.map(
        (row) =>
          `  ${row === reply ? "[pressed]" : "         "} ${row.line.text}`,
      );
      const here = [
        ...before,
        "You say:",
        ...menu,
        ...(reply.next?.lines ?? []).map(spoken),
      ];
      const end = reply.next?.end;
      const piece = reply.line.parts[0] ?? "";
      const act = DESK_ACTS.sign.includes(piece)
        ? "the bill is signed"
        : DESK_ACTS.veto.includes(piece)
          ? "the bill is vetoed"
          : "the bill stays on the desk";
      if (end?.ending)
        paths.push(
          [
            ...here,
            ...(end.close ? [spoken(end.close)] : []),
            `ENDING ${end.ending.id}, keeps ${end.ending.keeps}; ${act}`,
          ].join("\n    "),
        );
      if (reply.next) walk(reply.next, here);
    }
  })(talk.tree, []);
  const firstReply = talk.lines.findIndex(
    (line) => line.text === talk.tree.replies[0]?.line.text,
  );
  const opening = talk.lines
    .slice(0, firstReply < 0 ? 0 : firstReply)
    .map(spoken)
    .join("\n    ");
  return `${tag} ${where}:\n  opening:\n    ${opening}\n${paths.map((path, n) => `  path ${n + 1}:\n    ${path}`).join("\n")}\n`;
}

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
    expectApart(scene.facts, where);
    expect(scene.typeKey, where).toBe("desk-visit");
    // Pictured at the office, never in a dwelling
    // (director-scene-settings-chamber-office-seat).
    if (visit.setting.kind === "office") {
      const story = storyScene(
        core,
        director,
        mayor!,
        first.entry!.momentId,
        10 * 60,
      );
      expect(
        // The mayor's own office, by the kind of office they serve in.
        ["mayor-office", "city-hall-hallway", "office"],
        `${where}: ${story.backdrop.file}`,
      ).toContain(story.place);
      process.stdout.write(
        `OFFICE ${where}: desk-visit pictured in ${story.place} (${story.backdrop.file})\n`,
      );
    }
    expect(scene.askerId, where).toBe(first.sponsor);
    expect(scene.cause.id, where).toBe(`bill-presented:${first.bill.id}`);
    const said = (key: string) => scene.facts.find((row) => row.key === key);
    expect(said("for"), where).toBeTruthy();
    expect(said("against"), where).toBeFalsy();
    // How it passed, said without a count (Words lead, Nov 14): nobody
    // against it, enough to override a veto, or short of that; never the roll.
    const passage = ["unopposed", "veto-proof", "short-of-override"].filter(
      (key) => said(key),
    );
    expect(passage, where).toHaveLength(1);
    expect(said(passage[0]!)?.recordIds, where).toContain(first.bill.id);
    expect(said("ayes"), where).toBeFalsy();
    expect(said("nays"), where).toBeFalsy();
    // The bill by its name, from its record. A bill with a title is said by
    // it ("the Parks Ordinance") with what it does; one with none (a bare
    // "Ordinance 2025-1") has no purpose to say, and the lines that need one
    // do not play.
    expect(said("bill")?.text, where).toBeTruthy();
    expect(said("bill")?.recordIds, where).toContain(first.bill.id);
    if (said("purpose")) expect(said("bill")?.text, where).toMatch(/^the /i);
    process.stdout.write(
      `DESK-BILL ${where}: ${said("bill")?.text}; purpose ${said("purpose")?.text ?? "none on record"}\n`,
    );
    expect(said("deadline")?.recordIds, where).toContain(scene.cause.id);

    // Plain words on every path, and up to four replies that are different stances.
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
    // Every path of the tree, a speaker on every line, and what each ending
    // writes (Words lead, Nov 14: the replay shows who says what).
    process.stdout.write(talkPaths("DESK-TALK", where, scene.talk));
    for (const line of lines)
      expect(line.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined/,
      );
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expectUpToFourDifferent(root, where);
    for (const row of root)
      expect(["agree", "refuse", "bargain", "ask"], where).toContain(row.move);
    expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);
    // Every reply path reaches a named ending.
    const ends: string[] = [];
    (function walk(node: typeof scene.talk.tree) {
      if (node.end?.ending) ends.push(node.end.ending.id);
      for (const reply of node.replies) if (reply.next) walk(reply.next);
    })(scene.talk.tree);
    expect(ends.length, where).toBeGreaterThan(0);

    // The visit is the desk (Words lead, desk ruling 2): a put-off leaves the
    // bill on the desk; a yes said to the sponsor signs it through the
    // desk's own decision, and the desk no longer holds it.
    const pathTo = (id: string): number[] | undefined => {
      let found: number[] | undefined;
      (function walk(node: typeof scene.talk.tree, at: number[]) {
        node.replies.forEach((reply, index) => {
          if (found || !reply.next) return;
          if (reply.next.end?.ending?.id === id) found = [...at, index];
          else walk(reply.next, [...at, index]);
        });
      })(scene.talk.tree, []);
      return found;
    };
    const onDesk = () =>
      deskWaiting(api).some((row) => row.id === first.bill.id);
    const putOff = pathTo("until-the-deadline");
    if (putOff) {
      expect(
        replyInScene(core, director, mayor!, first.entry!, putOff),
      ).toBeTruthy();
      expect(onDesk(), `${where}: a put-off took the bill off the desk`).toBe(
        true,
      );
    }
    // A plain no that does not say "veto" ends the talk the other way and
    // leaves the bill on the desk (Account lead, Nov 14: the press is the act
    // only where the words say it).
    let plainNo: number[] | undefined;
    (function walk(node: typeof scene.talk.tree, at: number[]) {
      node.replies.forEach((reply, index) => {
        if (plainNo || !reply.next) return;
        if (
          reply.next.end?.ending?.id === "other-way" &&
          !/veto|sign/i.test(reply.line.text)
        )
          plainNo = [...at, index];
        else walk(reply.next, [...at, index]);
      });
    })(scene.talk.tree, []);
    if (plainNo) {
      expect(
        replyInScene(core, director, mayor!, first.entry!, plainNo),
      ).toBeTruthy();
      expect(onDesk(), `${where}: a plain no vetoed the bill`).toBe(true);
    }
    const yes = pathTo("their-way");
    expect(yes, `${where}: no path where the mayor says yes`).toBeTruthy();
    expect(onDesk(), where).toBe(true);
    expect(
      replyInScene(core, director, mayor!, first.entry!, yes!),
    ).toBeTruthy();
    expect(
      onDesk(),
      `${where}: a yes to the sponsor left the bill on the desk`,
    ).toBe(false);
    expect(billOf(api, first.bill.id)?.status, where).not.toBe(
      "awaiting-signature",
    );
    process.stdout.write(
      `DESK-DECIDED ${where}: ${first.bill.id} ${billOf(api, first.bill.id)?.status} after the yes\n`,
    );

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
    expectApart(asked.scene.facts, where);
    const stood = (key: string) =>
      asked.scene.facts.find((row) => row.key === key);
    expect(stood("against"), where).toBeTruthy();
    expect(stood("for"), where).toBeFalsy();
    expect(stood("cost")?.text, where).toBe("$410,000");
    expect(
      asked.scene.talk.lines.map((row) => row.text).join(" "),
      where,
    ).not.toBe(scene.talk.lines.map((row) => row.text).join(" "));
    process.stdout.write(
      talkPaths("DESK-TALK-AGAINST", where, asked.scene.talk),
    );
    // A veto said to the group's lobbyist vetoes the bill through the desk.
    let veto: number[] | undefined;
    (function walk(node: TreeNode, at: number[]) {
      node.replies.forEach((reply, index) => {
        if (veto || !reply.next) return;
        if (
          reply.next.end?.ending &&
          DESK_ACTS.veto.includes(reply.line.parts[0] ?? "")
        )
          veto = [...at, index];
        else walk(reply.next, [...at, index]);
      });
    })(asked.scene.talk.tree, []);
    expect(veto, `${where}: no path where the mayor vetoes`).toBeTruthy();
    expect(
      replyInScene(core, director, mayor!, second.entry!, veto!),
    ).toBeTruthy();
    expect(billOf(api, second.bill.id).status, where).not.toBe(
      "awaiting-signature",
    );
    expect(
      deskWaiting(api).some((row) => row.id === second.bill.id),
      where,
    ).toBe(false);
    process.stdout.write(
      `DESK-VETOED ${where}: ${second.bill.id} ${billOf(api, second.bill.id).status} after the veto\n`,
    );

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
          expectApart(scene.scene.facts, `${where}: ${record.id}`);
          first ||= `${record.id}, sponsor ${sponsor!.sponsorId}`;
          if (!shown)
            shown = talkPaths(
              `DESK-TALK-GOVERNOR ${record.id}`,
              where,
              scene.scene.talk,
            );
        }
      }
    }
    expect(visits, `${where}: no visit composed`).toBeGreaterThan(0);
    process.stdout.write(
      `DESK-VISIT-GOVERNOR ${where}: ${presented.length} bills presented, ${staged} staged, ${visits} brought a sponsor; first ${first}.\n${shown}`,
    );
    return;
  }
  throw new Error(
    `no drawn place put a bill on a governor's desk: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
