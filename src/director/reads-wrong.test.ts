import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import openingSpeechBank from "../../data/english/parts/opening-speech.json" with { type: "json" };
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { composeLocalAddress } from "./local-address";
import { spoken, stateInSentence } from "./words";
import { personStance } from "../core2/campaign-views";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { resolveMunicipalRecallRule } from "../core2/gov-rules/municipal-ballot-rules";
import { draftBill, holdVote } from "../core2/modules/legislature";
import { recallsOf } from "../core2/modules/recalls";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import {
  bodyOf,
  executiveOf,
  memberKey,
  members,
  scheduleVote,
} from "../core2/modules/legislature";
import { openConversation } from "./conversation";
import { purposeScene } from "./purpose-scene";
import { titleInSentence } from "./swearing-in";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";

// Lines that read wrong once the game filled them (pool item
// words-batch-4-reads-wrong). Each test plays a scene in a generated world
// drawn from all 56 places and reads the line the way play says it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`office hours is a one-on-one: no town-hall beat plays in it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "reads-wrong-office-hours");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    for (const row of townSeats(coreAPI(core))) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    const visits = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "office.approached" &&
        director.ledger.people.has(String(row.facts?.officialId) as PersonId),
    );
    if (!visits.length) {
      tried.push(place.name);
      continue;
    }
    for (const visit of visits) {
      const officialId = String(visit.facts!.officialId) as PersonId;
      const entry = director.ledger.people
        .get(officialId)!
        .schedule.find((row) => row.momentId.includes(visit.id));
      const result = purposeScene(core, director, officialId, entry!);
      expect(result?.kind, where).toBe("composed");
      if (result?.kind !== "composed") continue;
      const said = JSON.stringify(result.scene.talk);
      expect(said, where).not.toMatch(
        /microphone|moderator|Somebody in the back|Next question|town hall|starts clapping|near the back lean/i,
      );
    }
    return;
  }
  throw new Error(`no office visit in ${tried.join("; ")} (seed ${seed})`);
}, 600_000);

// A line written for one place is not said in another: the narration after
// the arrival line, and the lines the people say, follow the room the scene
// is set in. [purpose, what the line says, the one setting it was written for]
const WRITTEN_FOR: readonly (readonly [string, RegExp, string])[] = [
  ["ask-vote", /at your desk when .* knocks on the open door/, "office"],
  ["ask-vote", /catches you outside the chamber/, "chamber"],
  [
    "owed-apology",
    /After the meeting, .* waits until the room is nearly empty/,
    "public",
  ],
  ["owed-apology", /rather do it out here/, "public"],
  ["donor-ask", /Thanks for taking my call/, "phone"],
  ["ask-support", /opens the door|comes to the door before/, "other-home"],
  ["recall-confront", /folding table|card table/, "public"],
  ["law-reaches", /on the street|crosses the street/, "public"],
  [
    "appointment-offer",
    /calls (?:while|from)|Do you have ten minutes/,
    "phone",
  ],
  ["veto-call", /Your phone lights up/, "phone"],
  ["scandal-comment", /Your phone rings|isn't a call I like/, "phone"],
  ["cut-argument", /Sorry to come in like this/, "office"],
  ["staff-news", /comes into your office/, "office"],
  ["section-bargain", /break in the meeting/, "chamber"],
  ["victory-night", /The room is loud|in the ballroom/, "venue"],
];

interface Played {
  where: string;
  scenes: {
    typeKey: string;
    kind: string;
    recordId: string;
    purpose: string;
    facts: { key: string; text: string; recordIds: string[] }[];
    said: string;
    narration: string;
    /** The talk's narration lines and the first thing said, before any ask is answered. */
    opening: string;
    reasonFacts: string[];
    /** Lines of narration besides the arrival, and lines of the talk's own narration. */
    leadLines: number;
    talkLines: number;
  }[];
  /** The kinds of the lines the player's own scenes opened with, by scene. */
}

let played: Played | undefined;
/** One generated year at a drawn place; every staged scene played as the player meets it. */
function playedYear(): Played {
  if (played) return played;
  const scenes: Played["scenes"] = [];
  const talks: Played["talks"] = [];
  const world = stageWorldHeld({
    id: "reads-wrong",
    seed,
    days: 365,
    onStaged: (staged, _scene, core, director) => {
      const entry = director.ledger.people
        .get(staged.watchedId as PersonId)
        ?.schedule.find((row) => row.momentId === staged.momentId);
      if (!entry) return;
      // The talk the scene hands to, as the game opens it for the one it is staged for.
      const watcher = staged.watchedId as PersonId;
      const other = staged.castIds.find((id) => id !== watcher);
      if (other) {
        const moment = director.ledger.people
          .get(watcher)
          ?.momentsById.get(staged.momentId);
        const opened = openConversation(core, watcher, other as PersonId, {
          director,
          occasionId: staged.momentId,
          presentIds: staged.castIds as PersonId[],
        });
        talks.push({
          typeKey: staged.typeKey,
          label: moment?.label ?? "",
          kinds: opened.lines.map((line) => line.kind),
        });
      }
      const result = purposeScene(
        core,
        director,
        staged.watchedId as PersonId,
        entry,
      );
      if (result?.kind !== "composed") return;
      scenes.push({
        typeKey: staged.typeKey,
        kind: staged.setting.kind,
        recordId: staged.setting.recordId,
        purpose: result.scene.purpose,
        facts: result.scene.facts,
        said: JSON.stringify(result.scene.talk),
        opening: [
          ...result.scene.talk.narration.map((line) => line.text),
          result.scene.talk.state.text,
        ].join(" "),
        reasonFacts: result.scene.facts.map((row) => row.key),
        leadLines: Math.max(0, (_scene?.narration ?? []).length - 1),
        talkLines: result.scene.talk.narration.length,
        narration: (_scene?.narration ?? []).map((line) => line.text).join(" "),
      });
    },
  });
  const { place } = world.report;
  played = {
    where: `${place.name} (${place.key}), seed ${seed}`,
    scenes,
    talks,
  };
  return played;
}

it(`a scene's lines name the room the scene is set in (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  expect(scenes.length, where).toBeGreaterThan(0);
  for (const scene of scenes) {
    const fact = scene.facts.find((row) => row.key === `setting-${scene.kind}`);
    expect(fact?.recordIds, `${where}: ${scene.typeKey}`).toContain(
      scene.recordId,
    );
    for (const [purpose, line, written] of WRITTEN_FOR) {
      if (scene.purpose === purpose && scene.kind !== written)
        expect(
          scene.said,
          `${where}: ${scene.typeKey} in ${scene.kind}`,
        ).not.toMatch(line);
    }
  }
}, 1_200_000);

it(`an office is said in sentence case, and the oath names the office with its article (seed ${seed})`, () => {
  // The conversion every office fact goes through, on titles written both ways.
  expect(titleInSentence("Council member")).toBe("council member");
  expect(titleInSentence("Mayor")).toBe("mayor");
  expect(titleInSentence("County Commissioner")).toBe("County Commissioner");
  // And every office the played year names: a drawn year may stage none (no
  // one filed or was sworn in), which leaves only the check above.
  const { where, scenes } = playedYear();
  let named = 0;
  for (const scene of scenes) {
    const office = scene.facts.find((row) => row.key === "office");
    if (!office) continue;
    named += 1;
    // "Council member" is "council member" inside a sentence.
    expect(office.text, `${where}: ${scene.typeKey}`).not.toMatch(
      /^[A-Z][^A-Z]*$/,
    );
    expect(scene.said, `${where}: ${scene.typeKey}`).not.toMatch(
      /work of (?!the )[a-z]/,
    );
  }
  process.stdout.write(`OFFICE ${where}: ${named} scenes named an office\n`);
}, 1_200_000);

it("no piece asks for the work of an office without its article", () => {
  const parts = (sceneTalkBank as unknown as { parts: { text: string }[] })
    .parts;
  expect(parts.filter((part) => /work of \{office\}/.test(part.text))).toEqual(
    [],
  );
});

it(`a mayor's and a governor's address name the town and the state, never "this town" (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "reads-wrong-address");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const town = corePlaceByJurisdictionId(
      core.people.get(core.playerId!)!.placeId as never,
    )!;
    let said = 0;
    for (const level of ["town", "state"] as const) {
      const story = composeLocalAddress(core, level);
      if (!story) {
        tried.push(`${place.name} (${level})`);
        continue;
      }
      said += 1;
      const name =
        level === "town"
          ? spoken(town)
          : stateInSentence(town.withinName ?? spoken(town));
      expect(story.text, `${where}: ${level}`).not.toMatch(
        /this (town|state)/i,
      );
      expect(story.text, `${where}: ${level}`).toContain(name);
    }
    if (said) return;
  }
  throw new Error(`no address could be composed in ${tried.join("; ")}`);
}, 600_000);

it(`a scene's talk never asks about news it has not said (seed ${seed})`, () => {
  const { where, talks } = playedYear();
  expect(talks.length, where).toBeGreaterThan(0);
  for (const talk of talks)
    expect(
      talk.kinds,
      `${where}: ${talk.typeKey} (${talk.label})`,
    ).not.toContain("news");
}, 1_200_000);

it(`a refusal of a trade answers the trade, and the address promises no reason it never gives (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  for (const scene of scenes)
    expect(scene.said, `${where}: ${scene.typeKey}`).not.toMatch(
      /That's not mine to give/,
    );
  const parts = (openingSpeechBank as unknown as { parts: { text: string }[] })
    .parts;
  expect(parts.filter((part) => /You'll see why/.test(part.text))).toEqual([]);
  const refusals = (
    sceneTalkBank as unknown as { parts: { text: string }[] }
  ).parts.filter((part) => /not mine to give/.test(part.text));
  expect(refusals).toEqual([]);
}, 1_200_000);

it(`a lead never calls someone "Someone" after the arrival line named them (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  for (const scene of scenes)
    expect(scene.narration, `${where}: ${scene.typeKey}`).not.toMatch(
      /Someone is calling/,
    );
}, 1_200_000);

it(`a filing scene says what is being filed for before the clerk asks anything (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  for (const scene of scenes) {
    if (scene.typeKey !== "filing") continue;
    const office = scene.facts.find((row) => row.key === "office");
    expect(office, `${where}: the filing names its office`).toBeTruthy();
    expect(scene.opening, `${where}: filing`).toContain(office!.text);
  }
}, 1_200_000);

it(`every staged scene says why before the first ask: a lead or a line of the talk's own narration (seed ${seed})`, () => {
  const { where, scenes } = playedYear();
  expect(scenes.length, where).toBeGreaterThan(0);
  for (const scene of scenes)
    expect(
      scene.leadLines + scene.talkLines,
      `${where}: ${scene.typeKey} opens on the arrival alone`,
    ).toBeGreaterThan(0);
}, 1_200_000);

it(`the outcome of a recall is a scene only for the person who organized it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    let place = drawPlace(`${seed}:${draw}`, "recall-outcome-cast");
    for (
      let redraw = 1;
      redraw < 60 &&
      !resolveMunicipalRecallRule(place.state.slice(3)).circulationDays;
      redraw += 1
    )
      place = drawPlace(`${seed}:${draw}:${redraw}`, "recall-outcome-cast");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).filter(
      (s) =>
        s.office.kind === "council" &&
        s.holder?.personId &&
        core.people.get(s.holder.personId)?.alive,
    );
    if (council.length < 2) {
      tried.push(`${where}: no council of full people`);
      continue;
    }
    const members = new Set(council.map((s) => s.holder!.personId!));
    core.playerId = [...members].sort()[0]!;
    for (const id of members) {
      core.focusPersonIds.add(id as never);
      director.watch(core, id as never);
    }
    // The town's residents are watched too: the outcome is public news.
    for (const person of [...core.people.values()]
      .filter(
        (p) =>
          p.alive && p.placeId === core.people.get(core.playerId!)!.placeId,
      )
      .slice(0, 64))
      director.watch(core, person.id);
    const divisive = [...PLATFORM_QUESTIONS].sort(
      (a, b) =>
        Math.abs(personStance(1, b)) - Math.abs(personStance(1, a)) ||
        a.localeCompare(b),
    );
    for (const question of divisive) {
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: council[0]!.holder!.personId!,
        provisions: [{ kind: "policy-question", question, value: 1 }],
      });
      if (bill.status === "blocked") continue;
      if (
        ["enacted", "signed", "overridden"].includes(
          holdVote(api, bill.id).status,
        )
      )
        break;
    }
    const start = makeIsoDate(core.date);
    const open = () =>
      recallsOf(api).find(
        (r) => r.status === "circulating" && members.has(r.memberId),
      );
    for (let day = 1; day <= 60 && !open(); day += 1)
      advanceCore(core, addDays(start, day));
    const recall = open();
    if (!recall) {
      tried.push(`${where}: no petition`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(recall.due), 2));
    const outcomeId = [...core.durableLog.keys()].find((id) =>
      id.startsWith(`recall-outcome:${recall.id}:`),
    );
    expect(outcomeId, `${where}: no outcome record`).toBeTruthy();
    let staged = 0;
    for (const [personId, book] of director.ledger.people)
      for (const entry of book.schedule)
        for (const binding of entry.bindings) {
          if (
            binding.typeKey !== "recall" ||
            !entry.momentId.includes(outcomeId!)
          )
            continue;
          staged += 1;
          expect(
            binding.roles.find((row) => row.role === "petitioners")?.personIds,
            `${where}: ${personId} is cast as the petitioner of ${recall.id}`,
          ).toEqual([recall.organizerId]);
        }
    process.stdout.write(`RECALL OUTCOME ${where}: ${staged} scenes\n`);
    return;
  }
  throw new Error(`no recall in ${tried.join("; ")}`);
}, 900_000);

const WEEK = 7;

/** The sponsor's scene for a signature or a veto in one drawn place, composed as play composes it. */
function signingScene(attemptSeed: string) {
  const place = drawPlace(attemptSeed, "signing-narration");
  const seed = attemptSeed;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  // A body of several members that is the town's or county's own, with the
  // sponsor and (where its form of government has one) the executive full people.
  const lawmaking = townSeats(api)
    .filter(
      (row) =>
        row.holder?.personId &&
        core.people.has(row.holder.personId) &&
        ["city", "county", "state"].includes(row.office.level) &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    )
    // The town's own body votes within weeks; a state chamber waits for its session.
    .sort(
      (a, b) =>
        Number(a.office.level === "state") - Number(b.office.level === "state"),
    );
  if (!lawmaking.length) {
    console.log(`SCENES ${place.name} ${seed}\nno body here with full members`);
    return null;
  }
  // A question the body's government may enact, from the place's own grant
  // of authority (policy-authority.ts). A government granted none here has
  // no bill this test can draft; another body, or another place, is read.
  const allowedPolicy = (level: string) =>
    billCatalog(api, level as "city" | "county" | "state")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed);
  const seats = lawmaking.filter((row) => allowedPolicy(row.office.level));
  if (!seats.length) {
    console.log(
      `SIGNING ${place.name} ${seed}\nno catalog question its ${[...new Set(lawmaking.map((row) => row.office.level))].join(", ")} bodies may enact`,
    );
    return null;
  }
  const withExecutive = seats.find((row) => {
    const id = executiveOf(api, row.office.id).term?.personId;
    return id && id !== row.holder!.personId && core.people.has(id);
  });
  const seat = withExecutive ?? seats[0];
  const sponsorId = seat!.holder!.personId!;
  const executiveId = executiveOf(api, seat!.office.id).term?.personId;
  // A state official is a full person under the key the legislature gives them.
  const everyone = members(api, seat!.office.id).flatMap((term) =>
    core.people.has(memberKey(term)) ? [memberKey(term)] : [],
  );
  for (const id of [
    sponsorId,
    ...everyone,
    ...(executiveId ? [executiveId] : []),
  ])
    director.watch(core, id);
  const policy = allowedPolicy(seat!.office.level)!;
  const bill = draftBill(api, {
    bodyOfficeId: seat!.office.id,
    sponsorId,
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
  scheduleVote(api, bill.id);
  // Played a week at a time until the executive acts, so the vote and the
  // act are read within weeks of happening: a watched resident's older
  // moments fold into the director's summaries (its memory window; the
  // player keeps all of theirs).
  const end = addDays(
    makeIsoDate(core.date),
    seat!.office.level === "state" ? 400 : 120,
  );
  while (core.date < end && !core.durableLog.has(`executive-action:${bill.id}`))
    advanceCore(core, [addDays(makeIsoDate(core.date), WEEK), end].sort()[0]!);

  const acted = core.durableLog.get(`executive-action:${bill.id}`);
  const action = acted?.facts?.action;
  const type =
    action === "signed" ? "bill-signed" : action === "vetoed" ? "veto" : null;
  if (!acted || !type || acted.facts?.executiveId === sponsorId) return null;
  const entry = (director.ledger.people.get(sponsorId)?.schedule ?? []).find(
    (row) =>
      row.momentId.includes(`executive-action:${bill.id}`) &&
      row.bindings.some((binding) => binding.typeKey === type),
  );
  if (!entry) return null;
  const result = purposeScene(core, director, sponsorId as PersonId, entry, {
    typeKey: type,
  });
  return {
    where: `${place.name} (${place.key}), seed ${attemptSeed}`,
    type,
    number: String(acted.facts?.number ?? ""),
    result,
  };
}

it(`a signed or vetoed bill's scene plays and says which bill and who acted (seed ${seed})`, () => {
  let checked = 0;
  for (let attempt = 0; attempt < 8 && checked < 1; attempt += 1) {
    const found = signingScene(`${seed}:${attempt}`);
    if (!found) continue;
    checked += 1;
    const skipped = found.result?.kind === "skipped" ? found.result.reason : "";
    expect(
      found.result?.kind,
      `${found.where}: ${found.type}: ${skipped}`,
    ).toBe("composed");
    if (found.result?.kind !== "composed") continue;
    // The executive's post comes from the office record of the bill's body.
    expect(
      found.result.scene.facts.find((row) => row.key === "executive"),
      `${found.where}: ${found.type}: the post of whoever acted`,
    ).toBeTruthy();
    const said = [
      ...found.result.scene.talk.narration.map((line) => line.text),
      found.result.scene.talk.state.text,
    ].join(" ");
    expect(said, `${found.where}: ${found.type}`).toMatch(
      /\b[A-Z]{1,4} ?\d|Ordinance|Bill|Resolution|Act/,
    );
  }
  expect(
    checked,
    `no signature or veto on another's bill from seed ${seed}`,
  ).toBeGreaterThan(0);
}, 1_800_000);
