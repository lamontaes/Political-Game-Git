import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { partiesHere, partyTie } from "../core2/modules/parties";
import { sharedHistory } from "../core2/shared-history";
import { coreAPI } from "../core2/state";
import type { CoreState, JobInput, PersonId } from "../core2/types";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { withArticle } from "../english/journal-words";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { meetingFacts } from "./meeting-facts";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeJournal } from "./journal";
import type { TreeNode } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";

// A first meeting and a tie that grew each ask for something grounded in what
// the two share (owner, Nov 9: a purpose for every scene kind that lacks one;
// the golden path's "meet people"). The facts come from the records the world
// keeps: the employer and the job (jobs engine), the school (school engine),
// the party (parties engine) and the town a person lives in.
//
// A new hire at the player's employer is rare in a played year, so the cause
// of the first meeting is HAND-STAGED: the player and a second person are
// hired through the jobs engine's own writer (`startJob`, copying a real
// coworker's role as `hire` does), and the player's day is played with the
// clock (`advancePlayerV1`) so the director's own producer stages the scene.
// The becoming-friends cause is the relationship engine's own: time together
// until the tie turns. Everything after the cause is the director's.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
const HOURS_A_DAY = 6;
const MAX_DAYS = 30;

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

/** The paths whose end keeps a given thing. */
function endsKeeping(tree: TreeNode, keeps: string) {
  return paths(tree).flatMap((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.keeps === keeps
      ? [{ full, ending: node.end.ending }]
      : [];
  });
}

/** A person hired into a role as the jobs engine's `hire` does: the role's own commitment and calendar, copied. */
function hireLike(
  core: CoreState,
  personId: PersonId,
  template: JobInput,
  tag: string,
): string {
  const api = coreAPI(core);
  const commitment = [
    ...(core.work.commitmentsByPerson.get(template.personId) ?? []),
  ]
    .map((id) => core.work.commitments.get(id)!)
    .find((row) => row.jobId === template.id)!;
  const calendar = core.work.payrollCalendars.get(
    core.work.payrollCalendarByCommitment.get(commitment.id)!,
  )!;
  const jobId = `job:${tag}:${personId}`;
  const startsAt = addDays(makeIsoDate(core.date), 1);
  const commitmentId = `work-commitment:${jobId}`;
  const own = {
    ...calendar,
    id: `payroll-calendar:${jobId}`,
    workCommitmentIds: [commitmentId],
    basisRecordIds: [template.organizationId, template.id],
    effectiveFrom: [startsAt, calendar.effectiveFrom].sort().at(-1)!,
  };
  api.startJob(
    { ...template, id: jobId, personId, endsAt: undefined } as JobInput,
    {
      ...commitment,
      id: commitmentId,
      jobId,
      personId,
      payrollCalendarId: own.id,
      startsAt,
      heldSince: undefined,
      endsAt: undefined,
    } as never,
    own as never,
  );
  return jobId;
}

/** Plays the player's days with the clock, taking the first choice at each pause. */
function play(core: CoreState, playerId: PersonId, days: number) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(core.date), days), minuteOfDay: 0 },
    },
  );
  while (packet && packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
}

const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

it(`a new coworker introduces themselves and asks something from the records (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let done = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS && done < 2; attempt += 1) {
      const place = drawPlace(seed, `first-meeting:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const player = core.people.get(playerId!)!;
      const id = playerId as PersonId;
      // An employer with room to hire: three open jobs of other people.
      const open = (org: string) =>
        [...(core.finance.jobsByOrganization.get(org) ?? [])]
          .map((jobId) => core.jobs.get(jobId)!)
          .filter((job) => job && !job.endsAt && job.personId !== id)
          // A job the hire can copy: it has a commitment and a payroll calendar.
          .filter((job) =>
            [...(core.work.commitmentsByPerson.get(job.personId) ?? [])]
              .map((cid) => core.work.commitments.get(cid))
              .some(
                (row) =>
                  row?.jobId === job.id &&
                  core.work.payrollCalendarByCommitment.has(row.id),
              ),
          );
      const employer = [...core.finance.jobsByOrganization.keys()]
        .filter((org) => open(org).length >= 3)
        .sort(
          (a, b) => open(a).length - open(b).length || a.localeCompare(b),
        )[0];
      const jobless = [...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            row.id.startsWith("person_") &&
            !row.jobId &&
            row.id !== id &&
            row.householdId !== player.householdId,
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 8);
      if (!employer || !jobless.length) {
        tried.push(
          `${where}: no employer to hire into, or no one without work`,
        );
        continue;
      }
      const template = open(employer)[0]!;
      hireLike(core, id, template, "player");
      director.watch(core, id);
      core.focusPersonIds.add(id);
      // A baseline day at the new job.
      play(core, id, 2);
      const book = director.ledger.people.get(id)!;
      // A hire is a record of its day only, and the director stages one scene
      // from circumstance a day (a week between any two): the opening weeks
      // carry others (a governor's address in the hall), so one jobless
      // person is hired a day until a hire is the day's scene.
      let idle = jobless[0]!;
      let hiredId = "";
      let entry: (typeof book.schedule)[number] | undefined;
      for (const candidate of jobless) {
        idle = candidate;
        hiredId = hireLike(core, candidate.id, template, "newcomer");
        // (The clock reports a day closed only a day after it passes.)
        play(core, id, 2);
        entry = book.schedule.find(
          (row) =>
            row.momentId.includes(hiredId) &&
            row.bindings.some((bound) => bound.typeKey === "first-meeting"),
        );
        if (entry) break;
      }
      if (!entry) {
        tried.push(
          `${where}: ${jobless.length} hires staged no first-meeting scene (scenes: ${book.schedule
            .map((row) => row.bindings.map((b) => b.typeKey).join("+") || "-")
            .slice(-12)
            .join(",")})`,
        );
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      expect(moment.label, where).toBe("circumstance:new-coworker");
      const result = purposeScene(core, director, id, entry);
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("introduction");
      expect(scene.askerId, where).toBe(idle.id);
      expect(scene.askedId, where).toBe(id);
      const fact = (key: string) => scene.facts.find((row) => row.key === key);
      // The employer and the job, cited to the records they come from.
      const job = core.jobs.get(hiredId)!;
      expect(fact("employer")?.recordIds, where).toEqual(
        expect.arrayContaining([employer, hiredId]),
      );
      expect(fact("position")?.text, where).toBe(withArticle(job.title));
      // The two hold the same role, copied from one template.
      expect(fact("same-job"), where).toBeTruthy();
      // The town: said only where the newcomer lives elsewhere.
      // (A person whose place is only a state, not a town, names none.)
      expect(!!fact("hometown"), where).toBe(
        idle.placeId !== player.placeId &&
          !!corePlaceByJurisdictionId(idle.placeId as never),
      );
      // The party: said only where both belong to one.
      const api = coreAPI(core);
      const mine = partyTie(api, id);
      const theirs = partyTie(api, idle.id);
      expect(!!fact("party"), where).toBe(
        mine?.tie === "party" &&
          !!mine.partyId &&
          mine.partyId === theirs?.partyId &&
          !/^(blank|others?)$/i.test(
            partiesHere(api).find((row) => row.id === mine.partyId)?.name ?? "",
          ),
      );
      // The school the two share: said only where the school engine's rows say so.
      expect(!!fact("schoolmate"), where).toBe(
        sharedHistory(core, id, idle.id).some(
          (row) => row.kind === "schoolmate",
        ),
      );
      const said = scene.talk.lines.map((row) => row.text).join(" | ");
      const narration = scene.talk.narration.map((row) => row.text).join(" ");
      expect(narration, where).toContain(scene.talk.narration[0]!.text);
      // Up to four stances, a branch deeper than one, no gap at an ending.
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["agree", "promise", "ask", "deflect"], where).toContain(
          row.move,
        );
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      expect(
        scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
        where,
      ).toEqual([]);
      for (const row of scene.talk.lines)
        expect(row.text, where).not.toMatch(SLOP);
      // The one who asks does not say the player's name twice in a line.
      for (const row of scene.talk.lines)
        expect(
          (row.text.match(new RegExp(player.givenName, "g")) ?? []).length,
          `${where}: ${row.text}`,
        ).toBeLessThanOrEqual(1);
      // A promise settles the introduction and is written on the reply by id.
      const settled = endsKeeping(scene.talk.tree, "promise")[0];
      expect(settled, `${where}: no path keeps a promise`).toBeTruthy();
      const replyId = replyInScene(core, director, id, entry, settled!.full);
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("first-meeting");
      expect(reply?.facts?.causeId, where).toBe(moment.causeId);
      expect(reply?.facts?.ending, where).toBe("took-them-in-hand");
      expect(reply?.facts?.keeps, where).toBe("promise");
      // The kind of promise and the record that will settle it (promises.ts).
      expect(reply?.facts?.promise, where).toBe("show-around");
      expect(reply?.personIds, where).toContain(idle.id);
      // A put-off that is pressed strains the tie, on the same cause. Whether
      // it is pressed is the newcomer's own answer, led by their traits (no
      // dice): one who takes a put-off in stride has no such path.
      const sour = endsKeeping(scene.talk.tree, "relationship-strained")[0];
      const sourId = sour
        ? replyInScene(core, director, id, entry, sour.full)
        : null;
      if (sourId)
        expect(core.durableLog.get(sourId)?.facts?.keeps, where).toBe(
          "relationship-strained",
        );
      const told = composeJournal(core, director, id)
        .flatMap((chapter) => chapter.lines)
        .find((line) => line.momentIds.includes(replyId!));
      const note = `FIRST MEETING (hand-staged hire at ${employer}) ${where}: ${core.date}, cause ${moment.causeId}, ${id} with ${idle.id}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(takes a put-off in stride)"}; journal "${told?.text ?? "(other unnamed)"}"\n  ${narration} | ${said}`;
      if (process.env.SCENE_LOG)
        writeFileSync(process.env.SCENE_LOG, `${note}\n`, { flag: "a" });
      process.stdout.write(`${note}\n`);
      done += 1;
    }
    expect(
      done,
      `no first meeting played: ${tried.join("; ")} (seed ${seed})`,
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it(`a tie that grew asks for an invitation or a favor, from the two people's records (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(seed, "friend-ask");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      "2025-01-20",
      { twoLevel: true, placeKey: place.key },
    );
    const id = playerId as PersonId;
    const player = core.people.get(id)!;
    director.watch(core, id);
    const api = coreAPI(core);
    // A townsperson the player has no tie to yet, met as the encounters
    // engine meets a group's members, then time together until the tie turns
    // (the same cause tie-turns.test.ts reads).
    const stranger = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id.startsWith("person_") &&
          row.id !== id &&
          row.householdId !== player.householdId &&
          !player.familyIds.has(row.id) &&
          !sharedHistory(core, id, row.id as PersonId).length,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const otherId = stranger.id as PersonId;
    api.meet(id, otherId, {
      placeId: player.placeId,
      sourceId: "fixture-meeting",
      cause: "met-in-group",
      hours: 1,
    });
    const book = director.ledger.people.get(id)!;
    const grew = () =>
      book.threads.get(otherId)?.turns.find((turn) => turn.turn === "grew");
    for (let days = 0; days < MAX_DAYS && !grew(); days += 1) {
      api.relationship(id, otherId, "contact", HOURS_A_DAY);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }
    const turn = grew();
    expect(turn, `${where}: no grew turn`).toBeTruthy();
    const moment = book.momentsById.get(turn!.momentId!)!;
    const entry = book.schedule.find((item) => item.momentId === moment.id)!;
    expect(
      entry.bindings.some((bound) => bound.typeKey === "becoming-friends"),
      `${where}: ${moment.id} staged ${entry.outcome}`,
    ).toBe(true);
    const result = purposeScene(core, director, id, entry, {
      typeKey: "becoming-friends",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    expect(scene.purpose, where).toBe("friend-ask");
    expect(scene.askerId, where).toBe(otherId);
    expect(scene.askedId, where).toBe(id);
    const fact = (key: string) => scene.facts.find((row) => row.key === key);
    // The other's town, said only where it is not the player's.
    expect(!!fact("hometown"), where).toBe(
      stranger.placeId !== player.placeId &&
        !!corePlaceByJurisdictionId(stranger.placeId as never),
    );
    if (fact("hometown"))
      expect(fact("hometown")!.recordIds, where).toContain(stranger.placeId);
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expectUpToFourDifferent(root, where);
    for (const row of root)
      expect(["agree", "ask", "decline"], where).toContain(row.move);
    expect(scene.talk.depth, where).toBeGreaterThan(1);
    expect(
      scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
      where,
    ).toEqual([]);
    for (const row of scene.talk.lines)
      expect(row.text, where).not.toMatch(SLOP);
    const settled = endsKeeping(scene.talk.tree, "kept-in-scene")[0];
    expect(settled, `${where}: no path settles in the scene`).toBeTruthy();
    const before = core.relationships.get(
      [...(core.relationshipsByPerson.get(id) ?? [])].find(
        (rid) =>
          core.relationships.get(rid)?.actorId === otherId ||
          core.relationships.get(rid)?.otherId === otherId,
      )!,
    )!.lastContactDate;
    const replyId = replyInScene(core, director, id, entry, settled!.full, {
      typeKey: "becoming-friends",
    });
    const reply = core.durableLog.get(replyId!);
    expect(reply?.facts?.typeKey, where).toBe("becoming-friends");
    expect(reply?.facts?.causeId, where).toBe(moment.causeId);
    expect(reply?.facts?.ending, where).toBe("said-yes-to-friend");
    expect(reply?.facts?.keeps, where).toBe("kept-in-scene");
    expect(reply?.personIds, where).toContain(otherId);
    // The talk is time together: the tie's last contact is today.
    const tie = core.relationships.get(moment.causeId)!;
    expect(tie.lastContactDate >= before, where).toBe(true);
    // Whether a refusal is pressed is the asker's own answer, led by their
    // traits (no dice): a friend who takes a no gracefully has no strained path.
    const sour = endsKeeping(scene.talk.tree, "relationship-strained")[0];
    const sourId = sour
      ? replyInScene(core, director, id, entry, sour.full, {
          typeKey: "becoming-friends",
        })
      : null;
    if (sourId)
      expect(core.durableLog.get(sourId)?.facts?.ending, where).toBe(
        "turned-friend-down",
      );
    const note = `FRIEND ASK ${where}: ${core.date}, cause ${moment.causeId} (the tie ${tie.id}), ${id} with ${otherId}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(this friend takes a no gracefully)"}\n  ${scene.talk.narration.map((row) => row.text).join(" ")} | ${scene.talk.lines.map((row) => row.text).join(" | ")}`;
    if (process.env.SCENE_LOG)
      writeFileSync(process.env.SCENE_LOG, `${note}\n`, { flag: "a" });
    process.stdout.write(`${note}\n`);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it(`the shared facts come from the world's own records in drawn places (seed ${seed})`, () => {
  setBookkeeping(false);
  const found = new Set<string>();
  const lines: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `meeting-facts:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      // Into the school year, so the school engine has attended rows.
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const adults = [...core.people.values()]
        .filter(
          (row) =>
            row.alive && row.tier !== "husk" && row.id.startsWith("person_"),
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 400);
      const api = coreAPI(core);
      for (const a of adults)
        for (const b of adults) {
          if (a.id >= b.id) continue;
          const facts = meetingFacts(
            core,
            "becoming-friends",
            "cause",
            a.id,
            b.id,
          );
          for (const key of ["employer", "party", "schoolmate", "kids-school"])
            if (facts[key] && !found.has(key)) {
              found.add(key);
              // A fact is cited to the record it came from.
              const cited = facts[key]!.sourceRecordIds;
              expect(cited.length, `${where}: ${key}`).toBeGreaterThan(0);
              if (key === "employer")
                expect(
                  core.organizations.get(cited[0]!)?.name,
                  `${where}: ${key} cites the employer`,
                ).toBeTruthy();
              if (key === "party")
                expect(
                  partiesHere(api).some((row) => row.id === cited[0]),
                  `${where}: ${key} cites the party`,
                ).toBe(true);
              if (key === "kids-school") {
                expect(facts.child && facts.school, where).toBeTruthy();
                expect(
                  core.people.get(cited[1] as PersonId),
                  where,
                ).toBeTruthy();
              }
              if (key === "party")
                expect(facts.party!.text, where).toMatch(/Party$/);
              lines.push(
                `${where}: ${key} between ${a.id} and ${b.id} (${cited.join(", ")}) ${facts[key]!.text}`,
              );
            }
          if (found.size === 4) break;
        }
    }
    process.stdout.write(`MEETING FACTS\n${lines.join("\n")}\n`);
    for (const key of ["employer", "party", "schoolmate", "kids-school"])
      expect(
        found.has(key),
        `${key} found in no drawn place (seed ${seed}); ${lines.join("; ")}`,
      ).toBe(true);
    expect(
      meetingFacts(
        // A type that does not read them gets nothing.
        { people: new Map() } as never,
        "return",
        "cause",
        "a" as PersonId,
        "b" as PersonId,
      ),
    ).toEqual({});
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it("every line of the two purposes carries its own facts, with no name said twice and no stray words", () => {
  const parts = (
    sceneBank as unknown as {
      parts: {
        key: string;
        text: string;
        uses: {
          purpose?: string;
          step: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts.filter((part) =>
    part.uses.some(
      (use) => use.purpose === "introduction" || use.purpose === "friend-ask",
    ),
  );
  const count = (purpose: string) =>
    parts.filter((part) => part.uses.some((use) => use.purpose === purpose))
      .length;
  expect(count("introduction")).toBeGreaterThanOrEqual(25);
  expect(count("introduction")).toBeLessThanOrEqual(45);
  expect(count("friend-ask")).toBeGreaterThanOrEqual(25);
  expect(count("friend-ask")).toBeLessThanOrEqual(45);
  const base = new Set(["name", "first", "place"]);
  for (const part of parts) {
    const slots = [...part.text.matchAll(/\{([a-z-]+)\}/g)].map((m) => m[1]!);
    const use = part.uses.find(
      (row) => row.purpose === "introduction" || row.purpose === "friend-ask",
    )!;
    // A slot the line fills is a fact the line requires, unless it is a base fact.
    for (const slot of slots)
      if (!base.has(slot))
        expect(use.requiresFacts ?? [], `${part.key}: {${slot}}`).toContain(
          slot,
        );
    // No slot twice in a line: a name is not said twice.
    expect(new Set(slots).size, part.key).toBe(slots.length);
    // Alright, never "All right"; no fragment opening on a bare adverb.
    expect(part.text, part.key).not.toMatch(/\ball right\b/i);
    expect(part.text, part.key).not.toMatch(/^(well|look|so|um|uh),/i);
    // The newcomer cannot know the player's name before they meet: the
    // opening line asks for it, and later lines never use it.
  }
  // The newcomer's lines after the greeting never name the player they have just met.
  for (const part of parts.filter((row) =>
    row.uses.some(
      (use) => use.purpose === "introduction" && use.step !== "open",
    ),
  ))
    expect(part.text, part.key).not.toContain("{first}");
});
