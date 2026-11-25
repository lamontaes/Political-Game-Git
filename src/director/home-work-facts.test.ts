/**
 * The scenes of home and work life carry what happened (pool item
 * director-scene-packets-carry-their-cause): the employer and the years of a
 * lost job, the school at a year's end, how long two were together, who died,
 * what a quarrel was over, the illness and how long it has run. In drawn
 * places (never pinned), the engines' own routes write the records (a layoff
 * through the business's own `layOffWorker`, a parting through
 * `setPartnersV1`, an illness through `beginSeriousIllness`); records the
 * played months write on their own (a hire, a graduation, a death, an
 * engagement, a quarrel) are read where they turned up. Every fact is checked
 * against the record it cites, and what no drawn place showed is printed by
 * name.
 *
 * HAND-STAGED: the layoff, the parting and the illness are begun through the
 * engines' own writers because a played year seldom shows them for the
 * people the director watches; the records, their events and the facts read
 * from them are the engines' own.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { beginSeriousIllness } from "../core2/modules/health";
import { JOBS_MODULE_ID, layOffWorker } from "../core2/modules/jobs";
import { HEALTH_RESCUED } from "../core2/modules/rescue";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, Source } from "../core2/types";
import { careFacts } from "./care-facts";
import { homeWorkFacts } from "./home-work-facts";
import { rescueFacts } from "./rescue-facts";
import { purposeScene } from "./purpose-scene";
import { graduationResults } from "./school";
import { employerWords } from "./words";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../core2/business-books";
import { schoolShortSaid, workplaceSaid } from "../english/workplace-words";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 5;
const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

/** The scene types whose packets read these records. */
const SCENE_TYPES = new Set([
  "layoff",
  "reach-out",
  "first-day",
  "diploma-home",
  "no-diploma-home",
  "last-day",
  "proposal",
  "breakup",
  "funeral",
  "apology",
  "argument",
  "reconciliation",
]);

/** What every run must show somewhere in its drawn places (the rest is printed by name when not seen). */
const REQUIRED = [
  "layoff: employer",
  "layoff: workplace",
  "school: school",
  "breakup: together",
  "care: since",
];

type Found = { where: string; line: string };

it(`the scenes of home and work life carry the employer, the years, the school, the time together, who died, what a quarrel was over and the illness (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen = new Map<string, Found>();
  const passedOver: string[] = [];
  const note = (name: string, where: string, line: string) => {
    if (!seen.has(name)) seen.set(name, { where, line });
  };
  const say = (core: CoreState) => (id: PersonId) =>
    core.people.get(id)?.givenName;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `home-work-facts:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      {
        twoLevel: true,
        placeKey: place.key,
      },
    );
    const api = coreAPI(core);
    const me = playerId as PersonId;
    const source = (): Source => ({
      tag: "ESTIMATED",
      asOf: core.date,
      citation: "A staged change of a life through the engine's own writer.",
      estimatedFrom: "Drawn place and seed of the test.",
    });
    const advance = (days: number) =>
      advanceCore(core, addDays(makeIsoDate(core.date), days));
    // Whose schedules are read for scenes at the end.
    const watched = new Set<PersonId>([me]);
    director.watch(core, me);
    advance(30);

    // The scenes the watched people's schedules staged: each composed scene
    // carries exactly the facts read from its cause record, with its ids. It
    // is read soon after the cause, before the log folds the record.
    const scanScenes = () => {
      for (const personId of watched) {
        const book = director.ledger.people.get(personId);
        for (const entry of book?.schedule ?? []) {
          const moment = book!.momentsById.get(entry.momentId)!;
          if (/job|work/.test(moment.label))
            note(
              `moment ${moment.label}`,
              where,
              `${moment.causeId} stages ${entry.bindings.map((row) => row.typeKey).join(", ") || "nothing"}`,
            );
          for (const bound of entry.bindings) {
            if (!SCENE_TYPES.has(bound.typeKey)) continue;
            const result = purposeScene(
              core,
              director,
              personId,
              { ...entry, bindings: [bound] },
              { typeKey: bound.typeKey, includeHeld: true },
            );
            if (result?.kind !== "composed") {
              passedOver.push(
                `${where}: ${bound.typeKey} on ${moment.causeId}: ${JSON.stringify(result)}`,
              );
              continue;
            }
            const { scene } = result;
            const given = homeWorkFacts(
              core,
              bound.typeKey,
              moment.causeId,
              scene.askerId,
              scene.askedId,
              (id) => scene.facts.find((row) => row.recordIds[0] === id)?.text,
            );
            for (const [key, expected] of Object.entries(given)) {
              if (key === "deceased") continue;
              const fact = scene.facts.find((row) => row.key === key);
              expect(fact?.text, `${where}: ${moment.causeId}: ${key}`).toBe(
                expected.text,
              );
              expect(fact?.recordIds, `${where}: ${key}`).toEqual(
                expected.sourceRecordIds,
              );
              note(
                `scene ${bound.typeKey}: ${key}`,
                where,
                `${moment.causeId}: ${expected.text}`,
              );
            }
            note(
              `scene ${bound.typeKey}`,
              where,
              `${moment.causeId}: facts ${scene.facts.map((row) => row.key).join(", ")}`,
            );
          }
        }
      }
    };

    // A layoff, through the business's own layoff, of a full person with an open job.
    // Preferring someone the player lives with, whose pay the household reads.
    const home = new Set(
      core.households.get(core.people.get(me)!.householdId)?.memberIds ?? [],
    );
    const working = [...core.people.values()]
      .filter((row) => {
        const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
        return row.alive && job && job.endsAt === undefined;
      })
      .sort(
        (a, b) =>
          Number(home.has(b.id)) - Number(home.has(a.id)) ||
          a.id.localeCompare(b.id),
      );
    const worker = working[0];
    if (worker?.jobId) {
      const jobId = worker.jobId;
      core.focusPersonIds.add(worker.id);
      watched.add(worker.id);
      director.watch(core, worker.id);
      const job = core.jobs.get(jobId)!;
      let laid = false;
      for (let tries = 0; tries < 4 && !laid; tries += 1) {
        const result = layOffWorker(api, jobId);
        if (result === "worked-today") advance(1);
        else {
          laid = typeof result === "object" && result !== null;
          break;
        }
      }
      advance(2);
      scanScenes();
      const lost = [...core.durableLog.values()].find(
        (row) =>
          row.kind === "work.job-lost" && row.personIds.includes(worker.id),
      );
      if (laid && lost) {
        const facts = homeWorkFacts(
          core,
          "layoff",
          lost.id,
          worker.id,
          worker.id,
          say(core),
        );
        const org = core.organizations.get(job.organizationId)!;
        const employer = employerWords(org);
        if (employer) {
          expect(facts.employer?.text, `${where}: ${lost.id}`).toBe(employer);
          expect(facts.employer?.sourceRecordIds, where).toContain(lost.id);
          expect(facts.employer?.sourceRecordIds, where).toContain(org.id);
          note("layoff: employer", where, `${lost.id}: ${employer}`);
          // The same record, said as a common noun from the words file.
          const classification =
            org.classification ??
            DEFAULT_BUSINESS_BOOKS_DATA.classifications.find(
              (row) =>
                row.kindId === core.finance.businesses.get(org.id)?.kindId,
            )?.classification;
          expect(facts.workplace?.text, `${where}: ${lost.id}`).toBe(
            workplaceSaid(classification),
          );
          expect(facts.workplace?.sourceRecordIds, where).toContain(org.id);
          note(
            "layoff: workplace",
            where,
            `${lost.id}: ${facts.workplace!.text}`,
          );
        } else expect(facts.employer, where).toBeUndefined();
        const reach = homeWorkFacts(
          core,
          "reach-out",
          lost.id,
          worker.id,
          worker.id,
          say(core),
        );
        expect(Object.keys(reach), where).toEqual(Object.keys(facts));
        // Under a year held says nothing of how long; a year or more says it.
        if (facts.tenure) {
          expect(facts.tenure.text, where).toMatch(/month|year/);
          expect(facts.tenure.sourceRecordIds, where).toContain(lost.id);
          note("layoff: tenure", where, `${lost.id}: ${facts.tenure.text}`);
          if (facts.years)
            note("layoff: years", where, `${lost.id}: ${facts.years.text}`);
        } else {
          expect(facts.years, where).toBeUndefined();
          passedOver.push(
            `${where}: layoff ${lost.id} had no year held on record`,
          );
        }
        for (const fact of Object.values(facts))
          expect(fact.text, where).not.toMatch(SLOP);
        // The same record with another type's name carries nothing.
        expect(
          homeWorkFacts(
            core,
            "funeral",
            lost.id,
            worker.id,
            worker.id,
            say(core),
          ),
          where,
        ).toEqual({});
      } else
        passedOver.push(
          `${where}: the layoff of ${jobId} did not write its record`,
        );
    } else passedOver.push(`${where}: no full person with an open job`);

    // A job begun: any hire of a full person the jobs engine recorded.
    const hires = (
      api
        .moduleState(JOBS_MODULE_ID)
        .table("changes")
        .query("byKind", ["hire"]) as unknown as {
        id: string;
        jobId: string;
        personId: string;
      }[]
    ).filter((row) => core.jobs.has(row.jobId as never));
    const hired = hires[0];
    if (hired) {
      const facts = homeWorkFacts(
        core,
        "first-day",
        hired.jobId,
        hired.personId as PersonId,
        hired.personId as PersonId,
        say(core),
      );
      const org = core.organizations.get(
        core.jobs.get(hired.jobId as never)!.organizationId,
      )!;
      if (employerWords(org)) {
        expect(facts.employer?.text, `${where}: ${hired.jobId}`).toBe(
          employerWords(org),
        );
        note(
          "first day: employer",
          where,
          `${hired.jobId}: ${facts.employer!.text}`,
        );
      }
    } else passedOver.push(`${where}: no hire of a full person in 30 days`);

    // A parting, through the partnerships writer, of two full partners.
    const link = [...core.familyLinks.values()].find(
      (row) =>
        row.kind === "partner" &&
        row.personIds.every((id) => core.people.get(id)?.alive),
    );
    if (link) {
      // The log keeps what names the people the director watches.
      core.focusPersonIds.add(link.personIds[0]);
      watched.add(link.personIds[0]);
      director.watch(core, link.personIds[0]);
      api.setPartnersV1({
        personIds: link.personIds,
        together: false,
        source: source(),
      });
      advance(2);
      scanScenes();
      const parted = [...core.durableLog.values()].find(
        (row) =>
          row.kind === "family.separated" && row.facts?.linkId === link.id,
      );
      expect(parted, `${where}: ${link.id}`).toBeDefined();
      const facts = homeWorkFacts(
        core,
        "breakup",
        parted!.id,
        link.personIds[0],
        link.personIds[1],
        say(core),
      );
      if (facts.together) {
        expect(facts.together.sourceRecordIds, where).toEqual([
          parted!.id,
          link.id,
        ]);
        expect(facts.together.text, where).toMatch(/month|year/);
        note(
          "breakup: together",
          where,
          `${parted!.id}: ${facts.together.text}`,
        );
      } else
        passedOver.push(`${where}: ${parted!.id} had no start of the union`);
      if (facts.child) {
        const kid = core.people.get(
          facts.child.sourceRecordIds.at(-1) as PersonId,
        )!;
        expect(kid.givenName, where).toBe(facts.child.text);
        note("breakup: child", where, `${parted!.id}: ${facts.child.text}`);
      }
    } else
      passedOver.push(
        `${where}: no partner link between two living full people`,
      );

    // The records the played months write on their own, read where they came.
    advance(120);
    scanScenes();
    for (const row of core.durableLog.values()) {
      if (row.kind === "family.engaged" && !seen.has("engaged: together")) {
        const facts = homeWorkFacts(
          core,
          "proposal",
          row.id,
          row.personIds[0]!,
          row.personIds[1]!,
          say(core),
        );
        if (facts.together)
          note("engaged: together", where, `${row.id}: ${facts.together.text}`);
        if (facts.child)
          note("engaged: child", where, `${row.id}: ${facts.child.text}`);
      }
      if (
        row.kind === "life.death" &&
        row.personIds.every((id) => core.people.has(id)) &&
        !seen.has("death: deceased")
      ) {
        const facts = homeWorkFacts(
          core,
          "funeral",
          row.id,
          row.personIds[0]!,
          row.personIds[0]!,
          say(core),
        );
        expect(facts.deceased?.text, `${where}: ${row.id}`).toBe(
          core.people.get(row.personIds[0]!)!.givenName,
        );
        note("death: deceased", where, `${row.id}: ${facts.deceased!.text}`);
        if (facts.cause)
          note("death: cause", where, `${row.id}: ${facts.cause.text}`);
      }
      if (row.kind === "family.quarrel" && !seen.has("quarrel: over money")) {
        const facts = homeWorkFacts(
          core,
          "apology",
          row.id,
          row.personIds[0]!,
          row.personIds[1]!,
          say(core),
        );
        expect(
          facts["over-money"]?.sourceRecordIds,
          `${where}: ${row.id}`,
        ).toContain(row.facts?.missedId);
        expect(new Set(facts["over-money"]?.sourceRecordIds).size, where).toBe(
          facts["over-money"]?.sourceRecordIds.length,
        );
        note("quarrel: over money", where, row.id);
        // The tie the quarrel strained cites the same record for argument and making up.
        for (const tie of core.relationships.values()) {
          if (tie.latestChange?.reason?.sourceId !== row.id) continue;
          for (const type of ["argument", "reconciliation"])
            expect(
              homeWorkFacts(
                core,
                type,
                tie.id,
                tie.actorId,
                tie.otherId,
                say(core),
              )["over-money"],
              `${where}: ${tie.id}`,
            ).toBeDefined();
          note("tie: over money", where, tie.id);
          break;
        }
      }
      if (row.kind === HEALTH_RESCUED && !seen.has("rescue: helper")) {
        const facts = rescueFacts(
          core,
          "rescue",
          row.id,
          row.personIds[1]!,
          row.personIds[0]!,
        );
        if (facts.helper) {
          expect(facts.helper.sourceRecordIds, where).toContain(row.id);
          note("rescue: helper", where, `${row.id}: ${facts.helper.text}`);
        }
      }
    }

    // A school year's end (the results the played months wrote): any graduation result a full person has.
    const graduate = [...core.people.values()]
      .map((row) => ({ row, result: graduationResults(core, row.id)[0] }))
      .find((row) => row.result);
    if (graduate?.result) {
      const type = graduate.result.passed ? "diploma-home" : "no-diploma-home";
      const facts = homeWorkFacts(
        core,
        type,
        graduate.result.id,
        graduate.row.id,
        graduate.row.id,
        say(core),
      );
      expect(Object.keys(facts), `${where}: ${graduate.result.id}`).toContain(
        graduate.result.passed ? "passed" : "not-passed",
      );
      expect(
        facts[graduate.result.passed ? "not-passed" : "passed"],
        where,
      ).toBeUndefined();
      if (facts.school) {
        expect(facts.school.sourceRecordIds, where).toContain(
          graduate.result.id,
        );
        expect(facts["school-short"]?.text, where).toBe(
          schoolShortSaid(facts.school.text),
        );
        note(
          "school: school",
          where,
          `${graduate.result.id}: ${facts.school.text}`,
        );
      } else
        passedOver.push(
          `${where}: ${graduate.result.id} had no school on record`,
        );
      note(
        graduate.result.passed ? "school: passed" : "school: not passed",
        where,
        graduate.result.id,
      );
    } else passedOver.push(`${where}: no full person with a graduation result`);

    // An illness, through the health engine's own start, and the visit to the ill.
    if (beginSeriousIllness(api, me)) {
      advance(21);
      const illness = [...core.durableLog.values()].find(
        (row) =>
          row.kind === "health.serious-illness" && row.personIds.includes(me),
      );
      const visitor = [...core.people.values()].find(
        (row) =>
          row.alive &&
          row.id !== me &&
          row.placeId === core.people.get(me)!.placeId,
      );
      if (illness && visitor) {
        const facts = careFacts(core, "care", illness.id, me, visitor.id);
        if (facts.illness) {
          expect(facts.illness.sourceRecordIds, where).toContain(illness.id);
          note("care: illness", where, `${illness.id}: ${facts.illness.text}`);
        } else
          passedOver.push(
            `${where}: ${illness.id} names no condition with a common name (${JSON.stringify(illness.facts)})`,
          );
        if (facts.since) {
          expect(facts.since.text, where).toMatch(/month|week|year|less than/);
          note("care: since", where, `${illness.id}: ${facts.since.text}`);
        }
      } else passedOver.push(`${where}: no illness record or no one to visit`);
    } else
      passedOver.push(`${where}: the health engine would not begin an illness`);

    if (REQUIRED.every((name) => seen.has(name))) break;
  }

  const missing = REQUIRED.filter((name) => !seen.has(name));
  process.stdout.write(
    [
      `HOME-WORK-FACTS seed ${seed}`,
      ...[...seen].map(
        ([name, row]) => `  saw ${name} at ${row.where}: ${row.line}`,
      ),
      ...passedOver.map((row) => `  passed over ${row}`),
      `  not seen anywhere: ${
        [
          "first day: employer",
          "school: school",
          "engaged: together",
          "death: deceased",
          "death: cause",
          "quarrel: over money",
          "rescue: helper",
          "care: illness",
        ]
          .filter((name) => !seen.has(name))
          .join(", ") || "nothing"
      }`,
    ].join("\n") + "\n",
  );
  expect(
    missing,
    `no drawn place showed ${missing.join(", ")}: ${passedOver.join("; ")}`,
  ).toEqual([]);
}, 3_600_000);
