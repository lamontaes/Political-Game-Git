import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { closenessBetween, lastMetOnRow } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lawInForce } from "../core2/modules/laws";
import {
  OFFICE_DAY_MODULE_ID,
  decideDesk,
  deskVetoReasons,
  type OfficeActRow,
} from "../core2/modules/office-day";
import {
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
import type { PersonId } from "../core2/types";
import { noteHeard, openConversation, say } from "./conversation";
import { relationFacts } from "./relation-facts";

// A veto said at the next talk (Words lead, desk ruling 5): the mayor vetoes
// a council member's bill with a reason the record supports; the act keeps
// the reason and the veto cools the tie with the sponsor. At their next talk
// the sponsor brings it up once, by how it ended and the reason given; the
// player's "I'm sorry" gives back part of what the veto took, through the
// same writer, and the sponsor answers it. A later talk does not bring the
// veto up again.
// Places are drawn from all 56 on a seed nobody chose, one after another, until
// one has a mayor with a veto and three council members; each place passed over
// is named, with its reason, if none has.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 20;

it(`the sponsor brings up a veto once at the next talk, seed ${seed}`, () => {
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
    const provisions = [
      {
        kind: "law-amount",
        series: "minimum-wage",
        value: (lawInForce(api, "minimum-wage").value ?? 0) + 100,
        unit: "minor/hour",
      } as Provision,
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
          : !provisions.length
            ? "no question the town may answer"
            : null;
    if (missing) {
      tried.push(`${place.name}: ${missing}`);
      continue;
    }
    core.playerId = mayor!;
    director.watch(core, mayor!);
    const sponsor = council[1]!.holder!.personId as PersonId;
    const bill = draftBill(api, {
      bodyOfficeId: council[0]!.office.id,
      sponsorId: sponsor,
      provisions: [provisions[0]!],
    });
    for (const seat of council)
      castMemberVote(api, bill.id, seat.holder!.personId!, "yes");
    expect(holdVote(api, bill.id).status, where).toBe("awaiting-signature");

    // The reasons the record supports, and the veto with the first one that
    // says something (else none).
    const reasons = deskVetoReasons(api, bill.id).map((row) => row.key);
    expect(reasons, where).toContain("none");
    const reason = reasons.find((key) => key !== "none") ?? "none";
    expect(
      () => decideDesk(api, bill.id, false, "opposed-nobody" as never),
      where,
    ).toThrow();
    // The two have worked together (a mayor and a council member on day
    // one may have no tie at all, and a veto cannot cool a tie that is not
    // there): two hours of contact through the relationship writer the
    // veto itself uses.
    api.relationship(mayor!, sponsor, "contact", 2, undefined, {
      cause: "test-staging: a work session",
      sourceId: council[0]!.office.id,
    });
    // The veto comes the next day: a veto is made at the desk, apart from
    // the sponsor, so the day the two last met stays the work session's.
    const metOn = core.date;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    expect(billOf(api, bill.id).status, where).toBe("awaiting-signature");
    // A second member's bill, vetoed the same morning with no reason: its
    // sponsor's talk is the one the player stands by the veto in.
    // The one who stands by the veto's answer is a member who holds on to a
    // quarrel (a sponsor at the bottom of the conflict trait holds on to none,
    // so a second quarrel cools nothing); the sponsor is not that member.
    const holders = council
      .map((row) => row.holder!.personId as PersonId)
      .filter(
        (id) =>
          id !== sponsor &&
          (core.people.get(id)?.traits?.["people-mind-v1:conflict"] ?? 0) > -2,
      );
    if (!holders.length) {
      tried.push(`${place.name}: no council member who holds on to a quarrel`);
      continue;
    }
    const sponsor2 = holders[0]!;
    const bill2 = draftBill(api, {
      bodyOfficeId: council[0]!.office.id,
      sponsorId: sponsor2,
      provisions: [provisions[0]!],
    });
    for (const seat of council)
      castMemberVote(api, bill2.id, seat.holder!.personId!, "yes");
    expect(holdVote(api, bill2.id).status, where).toBe("awaiting-signature");
    decideDesk(api, bill2.id, false, "none");
    const before = closenessBetween(core, mayor!, sponsor);
    decideDesk(api, bill.id, false, reason);
    const tieKey =
      mayor! < sponsor ? `${mayor}:${sponsor}` : `${sponsor}:${mayor}`;
    expect(
      lastMetOnRow(core.relationships.get(tieKey)!),
      `${where}: a veto is not time together`,
    ).toBe(metOn);
    const act = (
      api
        .moduleState(OFFICE_DAY_MODULE_ID)
        .table("acts")
        .query("byPerson", [mayor!]) as unknown as OfficeActRow[]
    ).find((row) => row.kind === "veto" && row.recordId === bill.id);
    expect(act?.reason, where).toBe(reason);
    const cooled = closenessBetween(core, mayor!, sponsor);
    expect(cooled, `${where}: the veto cools the tie`).toBeLessThan(before);
    const status = billOf(api, bill.id).status;
    expect(["vetoed", "overridden"], where).toContain(status);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

    // The next talk: the sponsor brings it up.
    const talk = openConversation(core, mayor!, sponsor, { director });
    noteHeard(core, talk);
    const said = talk.lines.find((line) => line.kind === "veto-reply");
    process.stdout.write(
      `VETO-TALK ${where}: ${status}, reason ${reason}\n${talk.lines
        .map(
          (line) =>
            `  ${line.speakerId === mayor ? "You" : "Sponsor"}: ${line.text}`,
        )
        .join(
          "\n",
        )}\n  replies: ${talk.choices.map((row) => row.text).join(" | ")}\n`,
    );
    // The pair last met two days ago, at the work session: nobody says
    // they saw the other yesterday (the veto was not a meeting).
    expect(
      talk.lines.some((line) => /yesterday/i.test(line.text)),
      `${where}: the veto read as time together`,
    ).toBe(false);
    expect(
      said,
      `${where}: the sponsor did not bring up the veto`,
    ).toBeTruthy();
    expect(said!.speakerId, where).toBe(sponsor);
    expect(said!.sourceRecordIds, where).toContain(act!.id);
    expect(said!.text, where).not.toMatch(/\{|\}|undefined|\$|\d/);
    expect(
      said!.wording?.parts.some((key) => key.includes("veto-say-core")),
      where,
    ).toBe(true);
    // Three parts, in order: the opener, the reason, a tail in the
    // opener's bearing (Words lead's lines).
    expect(
      said!.wording?.parts.map((key) => key.split(".")[1]),
      where,
    ).toEqual(["veto-say-opener", "veto-say-core", "veto-say-closer"]);
    // How it ended is the opener's; the reason given is the core's.
    expect(said!.wording?.stage, where).toBe(
      status === "overridden" ? "overridden" : "stood",
    );
    expect(said!.wording?.facts, where).toContain(`reason-${reason}`);
    const moves = talk.choices.map((row) => row.move).sort();
    expect(moves, where).toEqual(["gives", "holds", "leave"]);

    // "I'm sorry" gives back part of what the veto took, and they answer.
    const gives = talk.choices.find((row) => row.move === "gives")!;
    const after = say(core, talk, gives.key);
    const back = after.lines.at(-1)!;
    expect(back.kind, where).toBe("veto-reply-back");
    expect(back.speakerId, where).toBe(sponsor);
    expect(back.sourceRecordIds, where).toContain(`veto.answer:${act!.id}`);
    expect(after.choices, where).toHaveLength(0);
    const warmed = closenessBetween(core, mayor!, sponsor);
    expect(warmed, `${where}: the apology moves the tie`).toBeGreaterThan(
      cooled,
    );
    // Part of what the veto took, never more: the tie stays below where it
    // stood before the veto.
    expect(
      warmed,
      `${where}: the apology won back more than the veto took`,
    ).toBeLessThan(before);
    // The last word on the tie is the apology's, by its record.
    const tie = core.relationships.get(tieKey);
    expect(tie?.latestChange?.reason, where).toEqual({
      cause: "veto-answer:gives",
      sourceId: `veto.answer:${act!.id}`,
    });
    expect(
      act!.cooled,
      `${where}: the act keeps what the veto took`,
    ).toBeGreaterThan(0);

    // Standing by it is the talk going badly: whatever else was said first
    // (a greeting's exchange is time together), the tie's last word is a
    // second quarrel, and the sponsor reads as a rival after the talk.
    let other = openConversation(core, mayor!, sponsor2, { director });
    noteHeard(core, other);
    for (
      let press = 0;
      press < 4 &&
      !other.lines.some((line) => line.kind === "veto-reply") &&
      other.choices.length;
      press += 1
    )
      other = say(core, other, other.choices[0]!.key);
    const holds = other.choices.find((row) => row.move === "holds");
    expect(holds, `${where}: no way to stand by the veto`).toBeTruthy();
    say(core, other, holds!.key);
    const tie2 = core.relationships.get(
      mayor! < sponsor2 ? `${mayor}:${sponsor2}` : `${sponsor2}:${mayor}`,
    );
    expect(tie2?.latestChange?.reason?.cause, where).toBe("veto-answer:holds");
    expect(
      relationFacts(core, sponsor2, mayor!).side,
      `${where}: standing by the veto left them no rival`,
    ).toBe("rival");

    // Said once: the next day's talk does not bring it up again.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const again = openConversation(core, mayor!, sponsor, { director });
    expect(
      again.lines.some((line) => line.kind === "veto-reply"),
      `${where}: the veto was brought up twice`,
    ).toBe(false);
    return;
  }
  throw new Error(`No place had a mayor with a veto: ${tried.join("; ")}`);
}, 600_000); // a drawn place may play longer than the pinned one (170 s limit).
