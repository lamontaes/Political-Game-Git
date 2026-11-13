import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { castMemberVote } from "../core2/modules/legislature";
import { outletsHere } from "../core2/modules/press";
import { recordVote, votesOf } from "../core2/modules/record";
import { electorateSides } from "../core2/modules/voting";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { chooseVariant } from "./arc-variant";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 12;
const VOTE_DAYS = 120;

// A reporter's call about a vote is the press-comment scene. Which arc plays
// is read from the records (arc-variant.ts, data/arc-variants.json): how far
// the town stands against the side the member's vote took (the electorate's
// shares on the bill's question), the earlier talks between the reporter and
// the member, their tie, the stories of scandal against the member, and the
// outlet the reporter writes for with the bill's level. In a played town a
// member votes and the reporter's call plays the variant with the highest
// score, the vote's record among its reads and the town-against read equal to
// what the electorate's shares give. The probes below it are hand-made
// edge causes on the same two people, one record at a time, labeled as such.
it(`a reporter's call plays the variant its records give (seed ${seed})`, () => {
  const tried: string[] = [];
  let proven = 0;
  for (let attempt = 0; attempt < ATTEMPTS && proven < 1; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "press-comment-variants");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const member = [...core.people.values()]
      .filter((p) => p.alive && p.id.startsWith("person_"))
      .sort((a, b) => a.id.localeCompare(b.id))
      .find((p) => seatView(core, p.id).bodies.length > 0);
    if (!member) {
      tried.push(`${where}: no resident member of a body`);
      continue;
    }
    const me = member.id as PersonId;
    core.playerId = me;
    director.watch(core, me);
    const seat = seatView(core, me);
    const body = seat.bodies[0]!;
    // The member brings the question the town is most settled on (scenario
    // choice, not a rule) and votes the other way: the call about a vote the
    // town stands against. The shares are the electorate's, read before the
    // vote is held.
    const marginOn = (question: string) => {
      const sides = electorateSides(api, question);
      return Math.abs(sides.yes - sides.no);
    };
    const questions = [...seat.questions].sort(
      (a, b) => marginOn(b) - marginOn(a) || a.localeCompare(b),
    );
    let bill = { id: "", status: "blocked" };
    let brought = "";
    for (const question of questions.slice(0, 4)) {
      if (bill.status !== "blocked") break;
      brought = question;
      bill = seatAct(core, me, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
    }
    if (!core.durableLog.has(`office.introduced:${bill.id}`)) {
      tried.push(`${where}: ${bill.status}, no introduction record`);
      continue;
    }
    const townSides = electorateSides(api, brought);
    const side = townSides.yes >= townSides.no ? "no" : "yes";
    castMemberVote(api, bill.id, me, side);
    const voteId = `bill-vote:${bill.id}:${body.officeId}`;
    for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (!core.durableLog.has(voteId)) {
      tried.push(`${where}: ${bill.id} not voted within ${VOTE_DAYS} days`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = director.ledger.people
      .get(me)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(voteId) &&
          row.bindings.some((b) => b.typeKey === "press-interview"),
      );
    if (!entry) {
      tried.push(`${where}: ${voteId} staged no reporter's call`);
      continue;
    }
    const result = purposeScene(core, director, me, entry, {
      typeKey: "press-interview",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const scene = result.scene;
    const chosen = scene.variant;
    expect(chosen, `${where}: no variant`).toBeTruthy();
    // The scene plays the variant with the highest score, and the member's
    // own vote record is among the records its reads came from.
    expect(chosen!.scores[0]!.variant, where).toBe(chosen!.variant);
    expect(chosen!.family, where).toBe("press-comment");
    expect(scene.talk.purpose, where).toBe(chosen!.purpose);
    const vote = votesOf(api, me).find((row) => row.billId === bill.id);
    expect(vote, `${where}: the vote is on the record`).toBeTruthy();
    expect(chosen!.recordIds, where).toContain(vote!.id);
    // The town-against read is the electorate's margin against the side the
    // vote took, from the same shares a platform is weighed by.
    const sides = electorateSides(api, vote!.stance.question);
    const mine = vote!.stance.position > 0;
    const expected = Math.max(
      0,
      Math.min(1, mine ? sides.no - sides.yes : sides.yes - sides.no),
    );
    expect(chosen!.reads["town-against"], where).toBeCloseTo(expected, 10);
    const reporter = scene.askerId;
    const own = (name: string) => chosen!.reads[name] ?? 0;
    process.stdout.write(
      `PRESS COMMENT ${where}: vote ${side} on ${bill.id} (${vote!.stance.question}), town yes ${sides.yes.toFixed(2)} no ${sides.no.toFixed(2)}, town-against ${own("town-against").toFixed(2)}; played ${chosen!.variant}, which opens "${scene.talk.state.text}": ${chosen!.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}\n`,
    );

    // ---- Hand-made edge probes (labeled): one record at a time, a cause of
    // the next day so the earlier records are earlier. A reporter's own temper
    // goes into the score too (arc-variant.ts), so the probes use the reporter
    // of the town whose temper pulls least against the variants they test.
    const nextDay = addDays(makeIsoDate(core.date), 1);
    const level = core.durableLog.get(voteId)?.facts?.level ?? "city";
    const variants = (
      variantFile as unknown as {
        families: Record<
          string,
          { variants: Record<string, { pull?: string[] }> }
        >;
      }
    ).families["press-comment"]!.variants;
    const pullFor = (id: string, variant: string) => {
      const facets = variants[variant]!.pull ?? [];
      return (
        facets.reduce(
          (sum, facet) =>
            sum + (core.people.get(id as PersonId)!.traits[facet] ?? 0),
          0,
        ) / facets.length
      );
    };
    const staff = (tier: "national" | "local") =>
      outletsHere(api)
        .filter((row) => (row.tier ?? "local") === tier)
        .flatMap((row) => row.reporterIds)
        .filter((id) => core.people.get(id as PersonId)?.alive && id !== me);
    const best = (ids: string[], names: string[]) =>
      [...ids].sort(
        (a, b) =>
          Math.min(...names.map((n) => pullFor(b, n))) -
            Math.min(...names.map((n) => pullFor(a, n))) || a.localeCompare(b),
      )[0] as PersonId | undefined;
    // The probes read one record at a time from a call between two people
    // with no tie: a tie's closeness is a read of its own (arc-variant.ts
    // `closeness`), and a close reporter rightly plays friendly at no record
    // (Fable A, Nov 13: closeness 0.36 at seed 32d25706d5cdbd72). The probe
    // goes to a reporter of the town with no tie to the member; a town whose
    // every reporter has one is passed over.
    const tied = (id: string) =>
      core.relationships.has(id < me ? `${id}:${me}` : `${me}:${id}`);
    const strangers = [...staff("local"), reporter].filter(
      (id) => id !== me && !tied(id),
    );
    const probe = best(strangers, ["friendly", "hostile", "scandal"]);
    if (!probe) {
      tried.push(
        `${where}: every local reporter has a tie to ${me}, so no probe of two strangers`,
      );
      continue;
    }
    const nationalId = best(staff("national"), ["national"]);
    const pick = (
      id: string,
      facts: Record<string, string>,
      who: PersonId = probe,
    ) =>
      chooseVariant(core, {
        family: "press-comment",
        askerId: who,
        askedId: me,
        cause: {
          id,
          date: nextDay,
          facts: { billId: bill.id, level, ...facts },
        },
      })!;

    // PROBE (hand-made): the national press. A reporter of a national outlet
    // plays national at any level; the bill's level alone, for a reporter of
    // the town's own outlet, is not enough.
    if (nationalId) {
      const national = pick("probe-national", { level: "federal" }, nationalId);
      expect(national.variant, JSON.stringify(national.reads)).toBe("national");
      expect(national.reads["national-desk"]).toBe(1);
      expect(national.recordIds.some((id) => id.startsWith("outlet:"))).toBe(
        true,
      );
    }
    const federalLocal = pick("probe-federal-local", {
      level: "federal",
      billId: "no-vote-on-this-bill",
    });
    expect(federalLocal.reads["national-desk"]).toBe(0);
    expect(federalLocal.reads.reach).toBe(1);
    expect(federalLocal.variant, JSON.stringify(federalLocal.reads)).toBe(
      "plain",
    );

    // PROBE (hand-made): the town stood against the member by the margin the
    // electorate shows. Their vote is re-recorded on the side against the
    // town's majority; the call plays hostile exactly where the margin times
    // its weight passes the plain arc's floor, and not before.
    core.focusPersonIds.add(me);
    const revote = (position: number) =>
      recordVote(api, {
        personId: vote!.personId,
        body: vote!.body,
        billId: vote!.billId,
        measureId: vote!.measureId,
        stance: { question: vote!.stance.question, position },
        passed: null,
      });
    revote(sides.yes >= sides.no ? -1 : 1);
    const margin = Math.abs(sides.yes - sides.no);
    const gap = pick("probe-against", {});
    expect(gap.reads["town-against"], where).toBeCloseTo(margin, 10);
    expect(gap.recordIds, where).toContain(vote!.id);
    const score = (name: string) =>
      gap.scores.find((s) => s.variant === name)!.score;
    expect(gap.variant === "hostile", JSON.stringify(gap.scores)).toBe(
      score("hostile") > score("plain") &&
        score("hostile") >= score("friendly") &&
        score("hostile") >= score("scandal") &&
        score("hostile") >= score("national"),
    );
    // The vote with the town instead: nothing against, so not hostile.
    revote(sides.yes >= sides.no ? 1 : -1);
    const withTown = pick("probe-with", {});
    expect(withTown.reads["town-against"], where).toBe(0);
    expect(withTown.variant, where).not.toBe("hostile");

    // PROBE (hand-made): five earlier talks the player answered on the record
    // to this reporter: the beat reporter who has covered them before.
    for (const n of ["a", "b", "c", "d", "e"])
      applyCoreEvent(core, {
        id: `probe-reply-${n}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [me, probe],
        placeId: core.people.get(me)!.placeId,
        facts: {
          typeKey: "press-interview",
          causeId: `old-${n}`,
          ending: "on-record",
        },
        source: {
          tag: "SOURCED",
          citation: "Recorded scene: the reply the player chose to say.",
          asOf: core.date,
        },
      });
    const friendly = pick("probe-friendly", {});
    expect(friendly.variant, JSON.stringify(friendly.reads)).toBe("friendly");
    expect(friendly.recordIds).toEqual(
      expect.arrayContaining(["probe-reply-a", "probe-reply-e"]),
    );

    // PROBE (hand-made): stories the press printed about the member's own
    // conduct, naming only them: a reporter chasing a scandal. The earlier
    // talks stay, so the scandal has to outweigh a friendly history.
    for (const n of ["a", "b", "c", "d", "e", "f"])
      applyCoreEvent(core, {
        id: `probe-exposed-${n}`,
        date: core.date,
        kind: "press.exposed",
        personIds: [me],
        placeId: core.people.get(me)!.placeId,
        facts: { outletId: "probe-outlet" },
        source: { tag: "SOURCED", citation: "Probe story", asOf: core.date },
      });
    // The earlier talks stay, so the scandal has to outweigh them in the
    // engine's own sum (each variant's reads times one plus the reporter's
    // pull). A reporter whose temper leans friendly legitimately plays friendly
    // (seed 5, Westmoreland, Kansas: friendly 1.46 against scandal 1.37 for a
    // reporter with a friendly pull of 0.75), so the probe goes to the town's
    // reporter whose temper leans most toward the scandal over the friendly arc.
    const scoreOf = (
      choice: ReturnType<typeof pick>,
      variant: "friendly" | "scandal",
    ) => choice.scores.find((row) => row.variant === variant)!.score;
    // PROBE (hand-made): each reporter tried has the same five earlier talks
    // with the member that the first probe reporter has.
    const candidates = [...new Set([probe, ...staff("local")])].map((who) => {
      if (who !== probe)
        for (const n of ["a", "b", "c", "d", "e"])
          applyCoreEvent(core, {
            id: `probe-reply-${n}-${who}`,
            date: core.date,
            kind: "scene.reply",
            personIds: [me, who],
            placeId: core.people.get(me)!.placeId,
            facts: {
              typeKey: "press-interview",
              causeId: `old-${n}-${who}`,
              ending: "on-record",
            },
            source: {
              tag: "SOURCED",
              citation: "Recorded scene: the reply the player chose to say.",
              asOf: core.date,
            },
          });
      return { who, choice: pick(`probe-scandal:${who}`, {}, who) };
    });
    const { who: scandalReporter, choice: scandal } = candidates.sort(
      (a, b) =>
        scoreOf(b.choice, "scandal") -
          scoreOf(b.choice, "friendly") -
          (scoreOf(a.choice, "scandal") - scoreOf(a.choice, "friendly")) ||
        a.who.localeCompare(b.who),
    )[0]!;
    const deciding = `${where}: scores ${scandal.scores.map((row) => `${row.variant} ${row.score.toFixed(2)}`).join(", ")}; reads ${JSON.stringify(scandal.reads)}; the reporter's pull friendly ${pullFor(scandalReporter, "friendly").toFixed(2)}, scandal ${pullFor(scandalReporter, "scandal").toFixed(2)} (${candidates.length} local reporters tried)`;
    process.stdout.write(`PRESS COMMENT SCANDAL PROBE ${deciding}\n`);
    expect(scandal.variant, deciding).toBe("scandal");
    expect(scandal.recordIds).toContain("probe-exposed-a");
    process.stdout.write(
      `PRESS COMMENT PROBES ${where}: against margin ${margin.toFixed(2)} gave ${gap.variant}; friendly ${friendly.variant}; scandal ${scandal.variant}; national ${nationalId ? "national desk tried" : "no national reporter"}\n`,
    );
    proven += 1;
  }
  expect(proven, `seed ${seed}: ${tried.join("; ")}`).toBe(1);
}, 3_600_000);
