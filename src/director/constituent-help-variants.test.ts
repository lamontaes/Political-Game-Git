import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { parameter } from "../core2/parameters";
import { CASES_MODULE_ID } from "../core2/modules/constituent-cases";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { beginSeriousIllness, careNeedOf } from "../core2/modules/health";
import { townSeats } from "../core2/modules/offices";
import { residentsRuntime } from "../core2/modules/residents";
import { coreAPI, fillInPerson } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { chooseVariant, type VariantChoice } from "./arc-variant";
import { constituentFacts } from "./constituent-help-facts";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import purposeArcs from "./data/purpose-arcs.json" with { type: "json" };
import situationFile from "./data/situation-types.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DAYS = 45;
const ATTEMPTS = 6;
// The hand-made probes each take a resident of their own household.
const PROBE_RESIDENTS = 5;
// Counted households filled in, at most, to find them in a small town.
const FILL_IN_MOST = 40;

type Variants = Record<
  string,
  {
    purpose: string;
    base: number;
    terms?: { read: string; weight: number }[];
    pull?: string[];
    forCause?: { fact: string; is: string };
    arc?: { endings: { id: string; keeps: string }[] };
  }
>;
const FAMILY = (
  variantFile as unknown as { families: Record<string, { variants: Variants }> }
).families["constituent-help"]!;
const VARIANTS = FAMILY.variants;
const PLAIN_ENDINGS = (
  purposeArcs as unknown as {
    purposes: Record<string, { endings: { id: string; keeps: string }[] }>;
  }
).purposes["constituent-help"]!.endings;
const TYPE = (
  situationFile as unknown as { types: (PurposeType & { key: string })[] }
).types.find((row) => row.key === "office-hours")!;

// A resident who brings a problem to office hours is the official's
// constituent-help scene. Which arc plays is read from the constituent's own
// records (arc-variant.ts, data/arc-variants.json): a layoff on the books
// (work.job-lost), an open rent notice on their household (the housing
// module's cases), the problem the office's case names (pay under the minimum
// wage the law sets) and the care their health asks of them or of someone at
// home (the health module's care need). The route below plays the visits a
// drawn place makes in 45 days and checks every read against the records; the
// probes after it are HAND-MADE records, one constituent each, labeled.
it(`office hours plays the variant the constituent's records give (seed ${seed})`, () => {
  // Every variant keeps the plain arc's endings and what each keeps (promise,
  // meeting-set, relationship-strained, trust-lost), which is what the engines
  // read downstream: data equality, so none can go unreachable.
  expect(Object.keys(VARIANTS).sort()).toEqual([
    "eviction",
    "lost-job",
    "plain",
    "short-pay",
    "sick",
  ]);
  for (const [name, row] of Object.entries(VARIANTS)) {
    if (!row.arc) continue;
    expect(
      row.arc.endings.map((e) => [e.id, e.keeps]),
      `${name} keeps the plain endings`,
    ).toEqual(PLAIN_ENDINGS.map((e) => [e.id, e.keeps]));
  }

  // The route needs a town where a resident brought a problem to an official;
  // the probes need a town with an official and five residents. A small town
  // can go a season with no visit, so the two may be met in different draws.
  let routeSeen = false;
  let probed = false;
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "constituent-help-variants");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${attempt}, world seed ${place.seed}`;
    setBookkeeping(false);
    const {
      core,
      director,
      placeId: town,
    } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const officials: PersonId[] = [];
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) {
        director.watch(core, id);
        officials.push(id);
      }
    }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const visits = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "office.approached" &&
        director.ledger.people.has(String(row.facts?.officialId) as PersonId),
    );
    if (visits.length) routeSeen = true;
    else
      tried.push(
        `${where}: no resident brought a problem to one of its ${officials.length} full-person officials in ${DAYS} days`,
      );

    const yearOf = (personId: PersonId) => {
      const person = core.people.get(personId)!;
      const daily = (core.households.get(person.householdId)?.memberIds ?? [])
        .map((id) => core.people.get(id)?.livingCostDailyMinor ?? 0)
        .reduce((a, b) => a + b, 0);
      return (
        Math.max(person.livingCostDailyMinor, daily) *
        parameter("daysPerMeanYear", core.data.parameters)
      );
    };
    const pullFor = (askerId: PersonId, variant: string) => {
      const facets = VARIANTS[variant]!.pull ?? [];
      // The mean of the facets, held between -1 and 1 as the engine holds it.
      const mean = facets.length
        ? facets.reduce(
            (sum, facet) =>
              sum + (core.people.get(askerId)!.traits[facet] ?? 0),
            0,
          ) / facets.length
        : 0;
      return Math.max(-1, Math.min(1, mean));
    };
    const expected = (c: VariantChoice, askerId: PersonId, variant: string) => {
      const row = VARIANTS[variant]!;
      const world = (row.terms ?? []).reduce(
        (sum, t) => sum + t.weight * (c.reads[t.read] ?? 0),
        row.base,
      );
      return Math.max(0, world) * (1 + pullFor(askerId, variant));
    };

    // ---- The route: every visit the town made.
    const played = new Map<string, number>();
    const lines: string[] = [];
    for (const visit of visits) {
      const officialId = String(visit.facts!.officialId) as PersonId;
      const residentId = String(visit.facts!.constituentId) as PersonId;
      const here = `${where}: ${visit.id}`;
      const entry = director.ledger.people
        .get(officialId)!
        .schedule.find((row) => row.momentId.includes(visit.id));
      const result = purposeScene(core, director, officialId, entry!);
      expect(result?.kind, `${here}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const scene = result.scene;
      const chosen = scene.variant;
      expect(chosen, `${here}: no variant`).toBeTruthy();
      expect(chosen!.family, here).toBe("constituent-help");
      expect(chosen!.scores[0]!.variant, here).toBe(chosen!.variant);
      // A variant plays only for the problem the visit's case records: a
      // visitor who came about work never states a relative's illness.
      for (const s of chosen!.scores) {
        const gate = VARIANTS[s.variant]!.forCause;
        expect(
          !gate || gate.is === String(visit.facts!.problem),
          `${here}: ${s.variant} is open to a case about ${String(visit.facts!.problem)}`,
        ).toBe(true);
      }
      expect(scene.talk.purpose, here).toBe(chosen!.purpose);
      expect(scene.askerId, here).toBe(residentId);
      for (const s of chosen!.scores)
        expect(s.score, `${here}: ${s.variant}`).toBeCloseTo(
          expected(chosen!, residentId, s.variant),
          10,
        );

      // The reads are what the records give.
      const problem = String(visit.facts!.problem);
      expect(chosen!.reads["paid-under-floor"], here).toBe(
        problem === "paid-under-minimum-wage" ? 1 : 0,
      );
      expect(chosen!.reads["out-of-work"], here).toBe(
        problem === "looking-for-work" ? 1 : 0,
      );
      const layoffs = (
        api
          .moduleState(JOBS_MODULE_ID)
          .table("changes")
          .query("byPerson", [residentId]) as unknown as {
          kind: string;
          date: string;
        }[]
      ).filter(
        (row) =>
          row.kind === "layoff" &&
          row.date < visit.date &&
          (Date.parse(visit.date) - Date.parse(row.date)) / 86_400_000 <= 180,
      ).length;
      expect(chosen!.reads["laid-off"], here).toBeCloseTo(
        layoffs / (layoffs + 0.5),
        10,
      );
      const person = core.people.get(residentId)!;
      const notices = api
        .moduleState("housing")
        .table("cases")
        .query("byHousehold", [person.householdId])
        .filter((row) => (row as { open?: boolean }).open);
      expect(chosen!.reads["notice-served"], here).toBe(notices.length ? 1 : 0);
      expect(chosen!.reads["own-illness"], here).toBeCloseTo(
        careNeedOf(core, residentId),
        10,
      );
      const homeNeed = Math.max(
        0,
        ...(core.households.get(person.householdId)?.memberIds ?? [])
          .filter((id) => id !== residentId && core.people.get(id)?.alive)
          .map((id) => careNeedOf(core, id)),
      );
      expect(chosen!.reads["household-illness"], here).toBeCloseTo(
        homeNeed,
        10,
      );
      // A wage case is the short-pay scene, with the pay and the floor from
      // the case's own record.
      if (problem === "paid-under-minimum-wage") {
        const row = api
          .moduleState(CASES_MODULE_ID)
          .table("cases")
          .get(String(visit.facts!.caseId)) as unknown as {
          facts: { hourlyMinor: number; floorMinor: number };
        };
        expect(row.facts.hourlyMinor, here).toBeLessThan(row.facts.floorMinor);
        // The wage case scores short-pay by what the case holds; a very mild
        // asker can still be pulled to the plain arc, which has its own wage lines.
        expect(
          chosen!.scores.find((s) => s.variant === "short-pay")!.score,
          here,
        ).toBeGreaterThan(0);
        if (chosen!.variant === "short-pay") {
          expect(
            scene.facts.find((f) => f.key === "pay")?.recordIds,
            here,
          ).toContain(String(visit.facts!.caseId));
          expect(
            scene.facts.some((f) => f.key === "floor"),
            here,
          ).toBe(true);
        }
      }
      // The facts a line may name are on the scene only where their records
      // are, cited to them.
      const has = (key: string) => scene.facts.find((f) => f.key === key);
      if (chosen!.variant === "lost-job" && chosen!.reads["laid-off"]! > 0) {
        expect(has("employer")?.recordIds, here).toBeTruthy();
        expect(has("since"), here).toBeTruthy();
      }
      // The case's own facts (the case-help set, caseFacts): an employer only
      // for a job seeker whose layoff is on the books, cited to it.
      if (has("employer"))
        expect(has("employer")!.recordIds.length, here).toBeGreaterThan(1);
      if (problem === "paid-under-minimum-wage")
        expect(has("employer"), here).toBeUndefined();
      if (chosen!.reads["notice-served"] === 0)
        expect(has("owed"), here).toBeUndefined();
      if (chosen!.variant === "sick") {
        const own = chosen!.reads["own-illness"]!;
        const home = chosen!.reads["household-illness"]!;
        if (home > own) {
          const kin = (
            core.households.get(person.householdId)?.memberIds ?? []
          ).filter((id) => id !== residentId && core.people.get(id)?.alive);
          expect(
            kin.map((id) => core.people.get(id)!.givenName),
            here,
          ).toContain(has("relative")?.text);
        } else expect(has("relative"), here).toBeUndefined();
      }
      // The request is worded by the variant's own piece where it has one.
      const requestKey = scene.talk.state.parts[0]!;
      // A piece of the case-help move set serves every variant that has none.
      const requestUse = (
        sceneTalk as unknown as {
          parts: { key: string; uses: { purpose?: string; set?: string }[] }[];
        }
      ).parts.find((part) => part.key === requestKey)?.uses[0];
      expect(
        [chosen!.purpose, "constituent-help", "set:case-help"],
        `${here}: ${requestKey}`,
      ).toContain(
        requestUse?.set ? `set:${requestUse.set}` : requestUse?.purpose,
      );
      played.set(chosen!.variant, (played.get(chosen!.variant) ?? 0) + 1);
      lines.push(
        `${residentId} (${problem}) ${chosen!.variant} [${chosen!.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}] opens "${scene.talk.state.text}"`,
      );
    }
    if (visits.length)
      process.stdout.write(
        `CONSTITUENT HELP ROUTE ${where}: ${visits.length} visits, played ${[...played].map(([k, v]) => `${k} ${v}`).join(", ")}\n  ${lines.join("\n  ")}\n`,
      );

    // ---- Hand-made probes (labeled): records written on residents one at a
    // time, each on its own constituent, and the scores read before and after.
    if (probed) {
      if (routeSeen) return;
      continue;
    }
    if (!officials.length) {
      tried.push(`${where}: no full-person official to ask`);
      continue;
    }
    const asked = officials[0]!;
    const seen = new Set<PersonId>(officials);
    for (const v of visits)
      seen.add(String(v.facts!.constituentId) as PersonId);
    const residentsNow = () =>
      [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.placeId === town &&
            !seen.has(p.id) &&
            p.id !== core.playerId &&
            p.livingCostDailyMinor > 0,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
    // One resident with another living member at home carries the relative's
    // illness; the other probes each take a resident of another household.
    const mateOf = (id: PersonId) =>
      core.households
        .get(core.people.get(id)!.householdId)
        ?.memberIds.find((m) => m !== id && core.people.get(m)?.alive);
    const apartOf = (
      rows: readonly { id: PersonId; householdId: string }[],
    ) => {
      const kin = rows.find((p) => mateOf(p.id))?.id;
      return {
        kin,
        apart: rows.filter(
          (p) =>
            kin === undefined ||
            p.householdId !== core.people.get(kin)!.householdId,
        ),
      };
    };
    // A small town keeps few full people: the rest of its residents are in
    // the counts, and meeting one fills them in by the engine's own call.
    let filledIn = 0;
    const rt = residentsRuntime(core as CoreState);
    if (rt && apartOf(residentsNow()).apart.length < PROBE_RESIDENTS) {
      const heads: PersonId[] = [];
      for (const home of rt.store.liveHouseholds()) {
        if (home.placeId !== town || home.quarters) continue;
        const member = rt.store.countedMembers(home)[0];
        if (member !== undefined) heads.push(rt.store.ids[member]! as PersonId);
      }
      for (const id of heads.sort().slice(0, FILL_IN_MOST)) {
        if (apartOf(residentsNow()).apart.length >= PROBE_RESIDENTS) break;
        fillInPerson(core as CoreState, id);
        filledIn += 1;
      }
    }
    const residents = residentsNow();
    const { kin: sickKin, apart } = apartOf(residents);
    if (apart.length < PROBE_RESIDENTS) {
      tried.push(
        `${where}: too few residents to probe (${residents.length} full, ${filledIn} filled in from the counts)`,
      );
      continue;
    }
    const nextDay = addDays(makeIsoDate(core.date), 1);
    let n = 0;
    const pick = (askerId: PersonId, facts: Record<string, string> = {}) =>
      chooseVariant(core, {
        family: "constituent-help",
        askerId,
        askedId: asked,
        cause: { id: `probe-${(n += 1)}`, date: nextDay, facts },
        setting: "office",
      })!;
    const scoreOf = (c: VariantChoice, name: string) =>
      c.scores.find((s) => s.variant === name)!.score;
    const fact = (text: string, id: PersonId): Fact => ({
      text,
      sourceRecordIds: [id],
    });
    const wordsOf = (
      c: VariantChoice,
      askerId: PersonId,
      extra: Record<string, Fact>,
    ) => {
      const facts: Record<string, Fact> = {
        name: fact("Pat Rivera", askerId),
        first: fact(core.people.get(asked)!.givenName, asked),
        // What the case on the office's books gives every visit (caseFacts):
        // where the office refers it, and when it decides.
        agency: fact("the workforce office", askerId),
        "respond-in": fact("in seven days", askerId),
        ...extra,
      };
      for (const [k, v] of Object.entries(c.reads))
        if (v > 0) facts[`read-${k}`] = fact("yes", askerId);
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId: asked, causeId: `words-${(n += 1)}` },
        { ...TYPE, purpose: c.purpose, family: "constituent-help" },
        facts,
        {},
        {},
      );
      expect(result.kind, c.variant).toBe("composed");
      if (result.kind !== "composed") throw new Error("not composed");
      expect(result.talk.purpose).toBe(c.purpose);
      const own = new Set(
        (
          sceneTalk as unknown as {
            parts: { key: string; uses: { purpose: string }[] }[];
          }
        ).parts
          .filter((part) => part.uses.some((u) => u.purpose === c.purpose))
          .map((part) => part.key),
      );
      expect(
        own.has(result.talk.state.parts[0]!),
        `${c.variant} opens with its own piece`,
      ).toBe(true);
      expect(result.talk.state.text).not.toMatch(/[{}]/);
      return result.talk;
    };
    const notes: string[] = [];

    // PROBE (hand-made): a layoff on the constituent's record.
    const a = apart[0]!.id;
    const beforeA = pick(a);
    expect(beforeA.reads["laid-off"]).toBe(0);
    const org = [...core.organizations.values()][0]!;
    api
      .moduleState(JOBS_MODULE_ID)
      .table("changes")
      .put({
        id: `probe:job-lost:${a}`,
        date: core.date,
        personId: a,
        organizationId: org.id,
        jobId: `probe-job:${a}`,
        kind: "layoff",
        reasonKey: "probe",
        decidedBy: org.id,
        heads: 1,
        values: {},
      } as never);
    const afterA = pick(a);
    expect(afterA.reads["laid-off"]).toBeCloseTo(1 / 1.5, 10);
    expect(afterA.recordIds).toContain(`probe:job-lost:${a}`);
    expect(
      scoreOf(afterA, "lost-job") - scoreOf(beforeA, "lost-job"),
    ).toBeCloseTo(0.9 * (1 / 1.5) * (1 + pullFor(a, "lost-job")), 10);
    const layoffFacts = constituentFacts(
      core,
      a,
      { id: "probe-words", date: nextDay, facts: {} },
      afterA,
    );
    expect(layoffFacts.employer?.text.toLowerCase()).toBe(
      org.name.toLowerCase(),
    );
    expect(layoffFacts.since?.text).toBe("less than a month");
    expect(layoffFacts.employer?.sourceRecordIds).toContain(
      `probe:job-lost:${a}`,
    );
    // A layoff of another resident moves nothing for this one.
    const a2 = apart[1]!.id;
    expect(pick(a2).reads["laid-off"]).toBe(0);
    const talkA = wordsOf(afterA, a, layoffFacts);
    notes.push(
      `layoff took lost-job from ${scoreOf(beforeA, "lost-job").toFixed(2)} to ${scoreOf(afterA, "lost-job").toFixed(2)} (plain ${scoreOf(afterA, "plain").toFixed(2)}); opens "${talkA.state.text}"`,
    );

    // PROBE (hand-made): a rent notice open on the household.
    const b = apart[2]!.id;
    const beforeB = pick(b);
    expect(beforeB.reads["notice-served"]).toBe(0);
    const owedMinor = 184_700;
    api
      .moduleState("housing")
      .table("cases")
      .put({
        id: `probe:eviction:${b}`,
        leaseId: `probe-lease:${b}`,
        householdId: core.people.get(b)!.householdId,
        open: true,
        stage: "notice",
        owedAtNoticeMinor: owedMinor,
        noticeAt: core.date,
        cureBy: addDays(makeIsoDate(core.date), 14),
      } as never);
    const afterB = pick(b);
    expect(afterB.reads["notice-served"]).toBe(1);
    expect(afterB.reads["rent-owed"]).toBeCloseTo(
      owedMinor / (owedMinor + yearOf(b) + 1),
      10,
    );
    expect(afterB.recordIds).toContain(`probe:eviction:${b}`);
    expect(
      scoreOf(afterB, "eviction") - scoreOf(beforeB, "eviction"),
    ).toBeCloseTo(
      (0.8 + 0.6 * afterB.reads["rent-owed"]!) * (1 + pullFor(b, "eviction")),
      10,
    );
    expect(afterB.scores[0]!.variant).toBe("eviction");
    const evictionFacts = constituentFacts(
      core,
      b,
      { id: "probe-words", date: nextDay, facts: {} },
      afterB,
    );
    expect(evictionFacts.owed?.text).toBe("$1,847");
    expect(evictionFacts.deadline?.sourceRecordIds).toContain(
      `probe:eviction:${b}`,
    );
    const talkB = wordsOf(afterB, b, evictionFacts);
    notes.push(
      `notice took eviction from ${scoreOf(beforeB, "eviction").toFixed(2)} to ${scoreOf(afterB, "eviction").toFixed(2)}; owed ${evictionFacts.owed?.text} by ${evictionFacts.deadline?.text}; opens "${talkB.state.text}"`,
    );

    // PROBE (hand-made): a wage case, the pay under the floor the law sets.
    const c = apart[3]!.id;
    const caseId = `probe:case:${c}`;
    api
      .moduleState(CASES_MODULE_ID)
      .table("cases")
      .put({
        id: caseId,
        personId: c,
        officialId: asked,
        problem: "paid-under-minimum-wage",
        severity: 0.5,
        standing: 0,
        facts: { commitmentId: "probe", hourlyMinor: 650, floorMinor: 725 },
        opened: core.date,
        respondBy: nextDay,
        status: "open",
        handledBy: null,
        outcome: null,
      } as never);
    const noCase = pick(c, { problem: "looking-for-work", caseId });
    expect(noCase.reads["paid-under-floor"]).toBe(0);
    const wage = pick(c, { problem: "paid-under-minimum-wage", caseId });
    expect(wage.reads["paid-under-floor"]).toBe(1);
    expect(wage.reads.shortfall).toBeCloseTo(0.5, 10);
    expect(wage.recordIds).toContain(caseId);
    expect(scoreOf(wage, "short-pay")).toBeCloseTo(
      (1.0 + 0.5 * 0.5) * (1 + pullFor(c, "short-pay")),
      10,
    );
    expect(wage.scores[0]!.variant).toBe("short-pay");
    const wageFacts = constituentFacts(
      core,
      c,
      { id: "probe-words", date: nextDay, facts: { caseId } },
      wage,
    );
    expect(wageFacts.pay?.text).toBe("$6.50");
    expect(wageFacts.floor?.text).toBe("$7.25");
    const talkC = wordsOf(wage, c, wageFacts);
    notes.push(
      `wage case took short-pay to ${scoreOf(wage, "short-pay").toFixed(2)} (plain ${scoreOf(wage, "plain").toFixed(2)}); pay ${wageFacts.pay?.text} against ${wageFacts.floor?.text}; opens "${talkC.state.text}"`,
    );

    // PROBE (hand-made): a serious illness begun in the constituent's household
    // (theirs, and then another member's). The onset is heard the next day, so
    // this probe goes last and keeps those who are alive after it.
    const ill: PersonId[] = [];
    const sickOwn = apart[4]!.id;
    const kinOf = sickKin === undefined ? undefined : mateOf(sickKin);
    const beforeD = pick(sickOwn);
    const beforeE = sickKin === undefined ? undefined : pick(sickKin);
    for (const id of [sickOwn, ...(kinOf ? [kinOf] : [])])
      if (beginSeriousIllness(api, id)) ill.push(id);
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const nowIll = ill.filter(
      (id) => core.people.get(id)?.alive && careNeedOf(core, id) === 1,
    );
    let sickNote = `no serious illness survived two days (${ill.length} begun)`;
    if (nowIll.includes(sickOwn) && core.people.get(sickOwn)?.alive) {
      const day = addDays(makeIsoDate(core.date), 1);
      const own = chooseVariant(core, {
        family: "constituent-help",
        askerId: sickOwn,
        askedId: asked,
        cause: { id: "probe-sick-own", date: day, facts: {} },
        setting: "office",
      })!;
      expect(own.reads["own-illness"]).toBe(1);
      expect(scoreOf(own, "sick")).toBeGreaterThan(scoreOf(beforeD, "sick"));
      const homeKin = Math.max(
        0,
        ...(
          core.households.get(core.people.get(sickOwn)!.householdId)
            ?.memberIds ?? []
        )
          .filter((id) => id !== sickOwn && core.people.get(id)?.alive)
          .map((id) => careNeedOf(core, id)),
      );
      expect(own.reads["household-illness"]).toBeCloseTo(homeKin, 10);
      const ownFacts = constituentFacts(
        core,
        sickOwn,
        { id: "probe-words", date: day, facts: {} },
        own,
      );
      // The asker's own illness is named by no relative.
      if (homeKin < 1) expect(ownFacts.relative).toBeUndefined();
      const talkD = wordsOf(own, sickOwn, ownFacts);
      sickNote = `own illness took sick from ${scoreOf(beforeD, "sick").toFixed(2)} to ${scoreOf(own, "sick").toFixed(2)} (plain ${scoreOf(own, "plain").toFixed(2)}); opens "${talkD.state.text}"`;
    }
    if (
      sickKin !== undefined &&
      kinOf !== undefined &&
      beforeE !== undefined &&
      nowIll.includes(kinOf) &&
      core.people.get(sickKin)?.alive &&
      core.people.get(kinOf)?.alive
    ) {
      const day = addDays(makeIsoDate(core.date), 1);
      const kin = chooseVariant(core, {
        family: "constituent-help",
        askerId: sickKin,
        askedId: asked,
        cause: { id: "probe-sick-kin", date: day, facts: {} },
        setting: "office",
      })!;
      expect(kin.reads["household-illness"]).toBe(1);
      expect(scoreOf(kin, "sick")).toBeGreaterThan(scoreOf(beforeE, "sick"));
      expect(kin.recordIds).toContain(kinOf);
      const kinFacts = constituentFacts(
        core,
        sickKin,
        { id: "probe-words", date: day, facts: {} },
        kin,
      );
      expect(kinFacts.relative?.text).toBe(core.people.get(kinOf)!.givenName);
      const talkE = wordsOf(kin, sickKin, kinFacts);
      sickNote += `; a relative's illness took sick from ${scoreOf(beforeE, "sick").toFixed(2)} to ${scoreOf(kin, "sick").toFixed(2)}, naming ${kinFacts.relative?.text}; opens "${talkE.state.text}"`;
    }
    if (kinOf === undefined)
      sickNote +=
        "; no resident of this town shares a home with another full person, so no relative's illness was probed here";
    notes.push(sickNote);
    process.stdout.write(
      `CONSTITUENT HELP PROBES ${where} (${filledIn} residents filled in from the counts):\n  ${notes.join("\n  ")}\n`,
    );
    probed = true;
    if (routeSeen) return;
  }
  expect.fail(
    `seed ${seed}: ${routeSeen ? "" : "no drawn town had a visit to an official; "}${probed ? "" : "no drawn town could be probed; "}${tried.join("; ")}`,
  );
}, 3_600_000);
