import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LEADERSHIP_MODULE_ID } from "../core2/modules/leadership";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  memberKey,
  members,
  provisionStance,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { joinParty, partiesHere, partyTie } from "../core2/modules/parties";
import { recordVote } from "../core2/modules/record";
import { electorateSides } from "../core2/modules/voting";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";
import { spokenDesignation } from "../english/bill-names";
import { chooseVariant } from "./arc-variant";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import purposeArcs from "./data/purpose-arcs.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const MOST_DAYS = 240;

type Variants = Record<
  string,
  {
    purpose: string;
    terms?: { read: string; weight: number }[];
    pull?: string[];
    arc?: { endings: { id: string; keeps: string }[] };
  }
>;
const VARIANTS = (
  variantFile as unknown as { families: Record<string, { variants: Variants }> }
).families["ask-vote"]!.variants;
const PLAIN_ENDINGS = (
  purposeArcs as unknown as {
    purposes: Record<string, { endings: { id: string; keeps: string }[] }>;
  }
).purposes["ask-vote"]!.endings;

// A colleague asking the player for a vote is the ask-vote scene. Which arc
// plays is read from the records (arc-variant.ts, data/arc-variants.json): the
// post the asker holds and the party they share with the asked, the earlier
// bills of the asked person's own that the asker voted for, how far the town
// stands for or against the bill (the electorate's shares on the questions
// its sections change) and the tie's closeness. In a played town a sponsor
// asks a member the evening before a floor vote; the scene plays the variant
// with the highest score and its reads equal what the records give. The probes
// below the route are hand-made records on the same two people, one at a
// time, labeled as such.
it(`a colleague's ask for a vote plays the variant its records give (seed ${seed})`, () => {
  // Every variant keeps the plain arc's endings and what each keeps, which is
  // what the engines read downstream (favor-owed, promise, trust-lost,
  // relationship-strained): data equality, so none can go unreachable.
  for (const [name, row] of Object.entries(VARIANTS)) {
    if (!row.arc) continue;
    expect(
      row.arc.endings.map((e) => [e.id, e.keeps]),
      `${name} keeps the plain endings`,
    ).toEqual(PLAIN_ENDINGS.map((e) => [e.id, e.keeps]));
  }
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ask-vote-variants");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    const bodies = [
      ...new Map(
        townSeats(api)
          .filter((row) => full(row.office.id).length > 1)
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ];
    const body =
      bodies.find((o) => o.level === "state" && o.id.endsWith("-lower")) ??
      bodies.find((o) => o.level === "state") ??
      bodies
        .filter((o) => ["city", "county", "township"].includes(o.level))
        .sort((a, b) => full(b.id).length - full(a.id).length)[0];
    if (!body) {
      tried.push(`${where}: no body with two full-person members`);
      continue;
    }
    const seated = full(body.id);
    core.playerId = seated[0]!;
    for (const id of seated) {
      core.focusPersonIds.add(id as never);
      director.watch(core, id as never);
    }
    const asks: CoreEventInput[] = [];
    api.subscribeEvents("ask-vote-variants-test", ["vote-ahead"], (_, e) => {
      asks.push(e);
    });
    const open = () =>
      asks.find(
        (e) =>
          e.personIds[0] !== core.playerId &&
          String(e.facts?.floorDate) > core.date &&
          billOf(api, String(e.facts?.billId)).status === "drafted" &&
          director.ledger.people
            .get(e.personIds[0] as never)
            ?.schedule.some((row) =>
              row.bindings.some(
                (b) =>
                  b.typeKey === "vote-asked" && row.momentId.includes(e.id),
              ),
            ),
      );
    let ask: CoreEventInput | undefined;
    for (let day = 1; day <= MOST_DAYS && !ask; day += 1) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      ask = open();
    }
    if (!ask) {
      tried.push(`${where}: no staged ask in ${MOST_DAYS} days`);
      continue;
    }
    const [memberId, sponsorId] = ask.personIds as [PersonId, PersonId];
    const billId = String(ask.facts!.billId);
    const bill = billOf(api, billId);
    const entry = director.ledger.people
      .get(memberId)!
      .schedule.find((row) => row.momentId.includes(ask!.id))!;
    const result = purposeScene(core, director, memberId, entry, {
      typeKey: "vote-asked",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const scene = result.scene;
    const chosen = scene.variant;
    expect(chosen, `${where}: no variant`).toBeTruthy();
    expect(chosen!.family, where).toBe("ask-vote");
    expect(chosen!.scores[0]!.variant, where).toBe(chosen!.variant);
    expect(scene.talk.purpose, where).toBe(chosen!.purpose);
    expect(scene.askerId, where).toBe(sponsorId);

    // The reads are what the records give. The party and the post:
    const sameParty =
      !!partyTie(api, sponsorId)?.partyId &&
      partyTie(api, sponsorId)?.partyId === partyTie(api, memberId)?.partyId;
    expect(chosen!.reads["same-party"], where).toBe(sameParty ? 1 : 0);
    const holds = api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .rows()
      .some((row) => (row as { holderId?: string }).holderId === sponsorId);
    expect(chosen!.reads["holds-post"], where).toBe(holds ? 1 : 0);
    // The town: the mean margin over the questions the bill's sections change.
    const margins = bill.provisions.flatMap((provision) => {
      const stance = provisionStance(api, provision);
      if (!stance || stance.position === 0) return [];
      const sides = electorateSides(api, stance.question);
      return [
        stance.position > 0 ? sides.yes - sides.no : sides.no - sides.yes,
      ];
    });
    const mean = margins.length
      ? margins.reduce((a, b) => a + b, 0) / margins.length
      : 0;
    expect(chosen!.reads["town-for-bill"], where).toBeCloseTo(
      Math.max(0, mean),
      10,
    );
    expect(chosen!.reads["town-against-bill"], where).toBeCloseTo(
      Math.max(0, -mean),
      10,
    );
    const [a, b] =
      sponsorId < memberId ? [sponsorId, memberId] : [memberId, sponsorId];
    if (core.relationships.has(`${a}:${b}`))
      expect(chosen!.reads.close, where).toBeCloseTo(
        Math.min(1, Math.max(0, closenessBetween(core, sponsorId, memberId))),
        10,
      );
    // A variant's request is worded by its own piece where it has one.
    const requestKey = scene.talk.state.parts[0]!;
    const requestPurpose = (
      sceneTalk as unknown as {
        parts: { key: string; uses: { purpose: string }[] }[];
      }
    ).parts.find((part) => part.key === requestKey)?.uses[0]?.purpose;
    expect([chosen!.purpose, "ask-vote"], `${where}: ${requestKey}`).toContain(
      requestPurpose,
    );
    process.stdout.write(
      `ASK VOTE ${where}: ${sponsorId} asks ${memberId} about ${bill.number}; same party ${sameParty}, holds a post ${holds}, town for ${chosen!.reads["town-for-bill"]?.toFixed(2)} against ${chosen!.reads["town-against-bill"]?.toFixed(2)}, close ${chosen!.reads.close?.toFixed(2)}; played ${chosen!.variant}: ${chosen!.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}; opens "${scene.talk.state.text}"\n`,
    );

    // ---- Hand-made probes (labeled): records written on the same two people,
    // one at a time, and the variant scores read before and after. A cause of
    // the next day, so what was written today is earlier.
    const nextDay = addDays(makeIsoDate(core.date), 1);
    const pullFor = (variant: string) => {
      const facets = VARIANTS[variant]!.pull ?? [];
      return (
        facets.reduce(
          (sum, facet) =>
            sum + (core.people.get(sponsorId)!.traits[facet] ?? 0),
          0,
        ) / facets.length
      );
    };
    let n = 0;
    const pick = () =>
      chooseVariant(core, {
        family: "ask-vote",
        askerId: sponsorId,
        askedId: memberId,
        cause: {
          id: `probe-${(n += 1)}`,
          date: nextDay,
          facts: { billId },
        },
      })!;
    const scoreOf = (c: ReturnType<typeof pick>, name: string) =>
      c.scores.find((s) => s.variant === name)!.score;
    const before = pick();

    // PROBE (hand-made): the asker holds a post in the body's leadership.
    api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .put({
        id: "probe:whip",
        chamber: body.id,
        post: "probe-whip",
        holderId: sponsorId,
        since: core.date,
        votes: {},
      } as never);
    const withPost = pick();
    expect(withPost.reads["holds-post"]).toBe(1);
    expect(withPost.recordIds).toContain("probe:whip");
    const post = VARIANTS.whip!.terms!.find((t) => t.read === "holds-post")!;
    expect(scoreOf(withPost, "whip") - scoreOf(before, "whip")).toBeCloseTo(
      holds ? 0 : post.weight * (1 + pullFor("whip")),
      10,
    );

    // PROBE (hand-made): both in one party.
    const party = partiesHere(api)[0];
    let partyNote = "no party in the town";
    if (party) {
      joinParty(api, sponsorId, party.id);
      joinParty(api, memberId, party.id);
      const together = pick();
      expect(together.reads["same-party"]).toBe(1);
      expect(together.recordIds).toContain(party.id);
      expect(scoreOf(together, "whip")).toBeGreaterThan(
        scoreOf(withPost, "whip"),
      );
      partyNote = `same party ${party.id}: whip ${scoreOf(withPost, "whip").toFixed(2)} to ${scoreOf(together, "whip").toFixed(2)}`;
    }

    // PROBE (hand-made): the asker voted for earlier bills of the member's own.
    // The earlier bills are copies of the real one under other ids, sponsored
    // by the member; the asker's vote on each is a record on an earlier day.
    const billsTable = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const probeBills = ["1", "2", "3"].map((k) => {
      const row = {
        ...bill,
        id: `probe-bill-${k}`,
        number: `PROBE ${k}`,
        sponsorId: memberId,
      };
      billsTable.put(row as never);
      recordVote(api, {
        personId: sponsorId,
        body: body.id,
        billId: row.id,
        measureId: row.number,
        stance: { question: "probe-question", position: 1 },
        passed: true,
      });
      return row;
    });
    const traded = pick();
    expect(traded.reads["favor-given"]).toBeCloseTo(3 / 4, 10);
    expect(
      traded.scores.find((s) => s.variant === "trade")!.score,
    ).toBeGreaterThan(scoreOf(before, "trade"));
    // No vote of the asker's own on the member's bill, or a bill of someone
    // else's: nothing is owed.
    recordVote(api, {
      personId: sponsorId,
      body: body.id,
      billId: billId,
      measureId: bill.number,
      stance: { question: "probe-question", position: 1 },
      passed: true,
    });
    expect(
      pick().reads["favor-given"],
      "the cause's own bill is not a favor",
    ).toBeCloseTo(3 / 4, 10);

    // PROBE (hand-made): the next ask, staged by a vote-ahead record on the
    // same two people, plays with the earlier bill named. The director reads
    // the record and stages it; the scene's fact `earlier` is the asker's
    // most recent vote on the member's own bill.
    // The ask is about a bill of its own (a copy of the real one, the asker's),
    // so the sitting that took in the real ask does not also take this one.
    const askBill = {
      ...bill,
      id: "probe-bill-ask",
      number: "PROBE ASK",
      sponsorId,
    };
    billsTable.put(askBill as never);
    const probeAsk = `probe-vote-ahead:${askBill.id}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    applyCoreEvent(core, {
      id: probeAsk,
      date: core.date,
      kind: "vote-ahead",
      personIds: [memberId, sponsorId],
      placeId: core.people.get(memberId)!.placeId,
      source: { tag: "SOURCED", citation: "Probe ask", asOf: core.date },
      facts: {
        billId: askBill.id,
        number: askBill.number,
        chamber: String(ask.facts!.chamber),
        floorDate: String(ask.facts!.floorDate),
        askedId: memberId,
        askerId: sponsorId,
        side: "yes",
        asked: memberId,
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const probeEntry = director.ledger.people
      .get(memberId)!
      .schedule.find((row) => row.momentId.includes(probeAsk));
    let staged =
      "the probe ask was not staged (the season's cap or the sitting took it)";
    if (probeEntry) {
      const probeResult = purposeScene(core, director, memberId, probeEntry, {
        typeKey: "vote-asked",
      });
      if (probeResult?.kind === "composed") {
        const earlier = probeResult.scene.facts.find(
          (f) => f.key === "earlier",
        );
        expect(
          earlier,
          "the favor reads, so the earlier bill is named",
        ).toBeTruthy();
        expect(earlier!.text).toBe(
          spokenDesignation(probeBills[2]!.number, probeBills[2]!.form.kind),
        );
        expect(earlier!.recordIds.some((id) => id.startsWith("vote:"))).toBe(
          true,
        );
        const v = probeResult.scene.variant!;
        expect(v.reads["favor-given"]).toBeGreaterThan(0);
        staged = `${v.variant} (${v.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}) opens "${probeResult.scene.talk.state.text}", earlier = ${earlier!.text}`;
      } else
        staged = `probe ask not composed: ${JSON.stringify(probeResult)}; entry ${probeEntry.outcome} ${probeEntry.bindings.map((b) => b.typeKey).join("/")}`;
    }
    process.stdout.write(
      `ASK VOTE PROBES ${where}: post took whip from ${scoreOf(before, "whip").toFixed(2)} to ${scoreOf(withPost, "whip").toFixed(2)}; ${partyNote}; three favors read ${traded.reads["favor-given"]!.toFixed(2)} (trade ${scoreOf(before, "trade").toFixed(2)} to ${scoreOf(traded, "trade").toFixed(2)}); ${staged}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
