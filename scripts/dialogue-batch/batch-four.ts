/**
 * Batch 4 for the owner (Nov 9, 2026): scenes, not snippets. Worlds drawn from
 * all 56 places are played the way the game plays them; each scene the director
 * stages is composed by the game's own functions (`purposeScene`, `composeScene`,
 * the talk, the speech builder) and walked at every choice. Nothing is written
 * by hand: the narration, each line with the bank piece that said it, and every
 * option's label come from the engine.
 *
 *   node --import tsx scripts/dialogue-batch/batch-four.ts --world 0   # play a world, cache its scenes
 *   node --import tsx scripts/dialogue-batch/batch-four.ts --build     # choose, number and write the batch
 *
 * Writes docs/coordination/batches/2026-11-09-batch-4.json and .md. Development
 * tooling; shipped play never imports it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { seatAct, seatView } from "../../src/bench/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import {
  draftBill,
  members,
  memberKey,
} from "../../src/core2/modules/legislature";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
} from "../../src/core2/modules/elections";
import { lawChain } from "../../src/core2/modules/laws";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { considerBribe } from "../../src/core2/modules/corruption";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import {
  beginSpeech,
  chooseSpeechPart,
  speechText,
  type SpeechBuild,
} from "../../src/director/speech-builder";
import { dateSaid } from "../../src/english/day-words";
import { drawPlace } from "../core2-year/place";
import { readMapPieces } from "./grade-map";
import {
  composeNarrated,
  composeUnit,
  flattenAdaptive,
  setupOf,
  unitsOf,
  type BatchScene,
  type Node,
} from "./batch-four-lib";
import { buildOutputs, type Candidate } from "./batch-four-build";

const arg = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? "") : undefined;
};
const SEED = process.env.BATCH4_SEED ?? "batch-4-nov-9";
const CACHE = process.env.BATCH4_CACHE ?? "docs/coordination/batches/.cache";
const WORLDS = Number(process.env.BATCH4_WORLDS ?? 3);
const log = (line: string) => process.stderr.write(`${line}\n`);

/** Plays world `index` of the seed and returns every scene its players met. */
function playWorld(index: number): {
  world: Candidate["world"];
  found: Candidate[];
} {
  const place = drawPlace(`${SEED}:${index}`, "batch-four");
  setBookkeeping(false);
  log(
    `world ${index}: ${place.name} (${place.key}), seed ${SEED}:${index}, world seed ${place.seed}`,
  );
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = built;
  const api = coreAPI(core);
  const templates = new Map(
    [...readMapPieces({}).entries()].map(([key, row]) => [key, row.text]),
  );
  const world = {
    index,
    place: place.name,
    placeKey: place.key,
    seed: `${SEED}:${index}`,
    worldSeed: place.seed,
  };
  const found: Candidate[] = [];
  const seenEntries = new Set<string>();
  /** The clock a scene plays at: the game takes it from the player's day; here it varies by cause. */
  const MINUTES = [
    9 * 60,
    10 * 60 + 30,
    12 * 60 + 30,
    14 * 60,
    16 * 60,
    18 * 60 + 30,
  ];
  const minuteFor = (cause: string) => {
    let hash = 0;
    for (const ch of cause) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return MINUTES[hash % MINUTES.length]!;
  };
  const who = (id: PersonId) => {
    const row = core.people.get(id);
    return row ? `${row.givenName} ${row.familyName}` : id;
  };
  /** Composes every new scene of `me`: an exchange with a purpose, else the narrated scene and its talk. */
  const sweep = (me: PersonId, by: string) => {
    const book = director.ledger.people.get(me);
    if (!book) return;
    for (const entry of book.schedule) {
      if (entry.outcome === "journal-line") continue;
      const stamp = `${me}|${entry.momentId}`;
      if (seenEntries.has(stamp)) continue;
      seenEntries.add(stamp);
      let purposed = false;
      for (const unit of unitsOf(entry)) {
        const scene = composeUnit(core, director, me, entry, unit);
        if (!scene) continue;
        purposed = true;
        const typeKey = unit.split("|")[0]!;
        const { nodes, depth } = flattenAdaptive(scene, templates, 4, 30);
        found.push({
          world,
          by,
          player: who(me),
          depth,
          kindKey: scene.variant?.variant
            ? `${typeKey}/${scene.variant.variant}`
            : typeKey,
          scene: {
            id: "",
            kind: "",
            source: {
              typeKey: scene.typeKey,
              purpose: scene.purpose,
              ...(scene.variant?.variant
                ? { variant: scene.variant.variant }
                : {}),
              causeId: scene.cause.id,
              date: core.date,
            },
            setup: setupOf(
              core,
              director,
              me,
              entry,
              scene,
              minuteFor(entry.momentId),
            ),
            nodes,
          },
        });
      }
      if (purposed) continue;
      try {
        const narrated = composeNarrated(
          core,
          director,
          me,
          entry,
          minuteFor(entry.momentId),
          2,
          templates,
        );
        if (!narrated) continue;
        found.push({
          world,
          by,
          player: who(me),
          depth: narrated.talked ? 2 : 0,
          kindKey: narrated.scene.source.typeKey,
          scene: narrated.scene,
        });
      } catch (error) {
        log(
          `narrated scene skipped (${entry.bindings[0]?.typeKey}): ${(error as Error).message}`,
        );
      }
    }
  };
  const day = (n = 1) => advanceCore(core, addDays(makeIsoDate(core.date), n));
  const me0 = built.playerId as PersonId;
  const watched = new Set<PersonId>();
  const watch = (id: PersonId) => {
    const row = core.people.get(id);
    if (!row?.alive || row.tier === "husk") return;
    watched.add(id);
    if (!director.ledger.people.has(id)) director.watch(core, id);
  };
  const player0 = core.people.get(me0)!;
  for (const id of [me0, ...player0.familyIds, ...player0.knownIds]) watch(id);
  for (const row of townSeats(api)) {
    const id = row.holder?.personId;
    if (id) watch(id);
  }
  for (const row of core.people.values())
    if (watched.size < 60 && row.placeId === player0.placeId) watch(row.id);
  log(`  watching ${watched.size} people`);
  const spin = (days: number, by: string) => {
    for (let n = 0; n < days; n += 1) {
      day();
      for (const id of watched) sweep(id, by);
    }
  };

  log("  the opening");
  spin(30, "opening");
  // A layoff through dev mode, the way the game's own control brings one about:
  // the player's circle first, a worker who did not work today.
  const dev = new DevMode(
    core,
    director,
    new BenchPlayer(core, director),
    built.placeId,
  );
  let laidOff = false;
  for (let attempt = 0; attempt < 4 && !laidOff; attempt += 1) {
    for (const id of [
      me0,
      ...player0.familyIds,
      ...player0.knownIds,
      ...watched,
    ]) {
      const row = core.people.get(id);
      if (!row?.alive || !row.jobId || row.tier === "husk") continue;
      try {
        dev.forceLayoff(id);
        laidOff = true;
        log(`  layoff forced for ${who(id)}`);
        break;
      } catch {
        /* worked today, or a counted worker: the next one */
      }
    }
    spin(attempt === 0 ? 1 : 2, "layoff");
  }
  spin(3, "layoff");

  // The town's largest body, and a bill on each question it can pass.
  const full = (officeId: string) =>
    members(api, officeId)
      .map(memberKey)
      .filter((id) => core.people.get(id)?.alive)
      .sort();
  const body = [
    ...new Map(
      townSeats(api)
        .filter(
          (row) =>
            ["city", "county", "township"].includes(row.office.level) &&
            full(row.office.id).length > 2,
        )
        .map((row) => [row.office.id, row.office] as const),
    ).values(),
  ].sort((a, b) => full(b.id).length - full(a.id).length)[0];
  let seat: PersonId | undefined;
  if (body) {
    const seated = full(body.id);
    seat = seated[0]! as PersonId;
    core.playerId = seat;
    for (const id of seated) {
      core.focusPersonIds.add(id as PersonId);
      watch(id as PersonId);
    }
    const drafted = seatView(core, seat)
      .questions.slice(0, 6)
      .flatMap((question) => {
        try {
          return [
            seatAct(core, seat!, {
              kind: "draft",
              officeId: body.id,
              question,
              value: 1,
            }).number,
          ];
        } catch {
          return [];
        }
      });
    log(`  drafted ${drafted.length} bills in ${body.bodyName ?? body.id}`);
  } else log("  no town body with three full-person members");

  // A filer in the next race for a seat on a town body, with bills pending
  // before that body as the campaign starts, so a donor has one to raise.
  const race = [...openContests(api)]
    .filter((row) => row.filingDeadline >= core.date)
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate))
    .find((row) =>
      townSeats(api).some(
        (seat) =>
          seat.office.id === row.officeId &&
          members(api, row.officeId).length > 1,
      ),
    );
  let candidate: PersonId | undefined;
  if (race) {
    const clerkId = filingClerkFor(api, race.id)?.personId;
    const sponsor = members(api, race.officeId)[0];
    if (sponsor)
      for (const policy of billCatalog(
        api,
        race.level as "city" | "county" | "state",
      )
        .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
        .filter(
          (row) => row.kind === "policy-question" && row.authority.allowed,
        )
        .slice(0, 6))
        draftBill(api, {
          bodyOfficeId: race.officeId,
          sponsorId: memberKey(sponsor),
          provisions: [
            provisionFor({ policyId: policy.id, operation: "enact" }),
          ],
        });
    const filed = new Set(
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as {
          personId: string;
        }[]
      ).map((row) => row.personId),
    );
    const town = lawChain(api).townPlaceId;
    candidate = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== clerkId &&
          !filed.has(p.id) &&
          p.placeId === town &&
          ageOnDate(p.birthDate, core.date) >= 18,
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 12)
      .find((p) => {
        watch(p.id);
        return ["petitioning", "on-ballot"].includes(
          fileCandidacy(api, {
            personId: p.id,
            contestId: race.id,
            platform: [],
          }).status ?? "",
        );
      })?.id;
    log(
      `  race ${race.id} on ${race.electionDate}; candidate ${candidate ? who(candidate) : "none"}`,
    );
  }

  // An offer to the seat.
  const offerTo = seat ?? me0;
  let offered = false;
  const offer = () => {
    offered = true;
    const mine = core.people.get(offerTo)!;
    const offerers = [...core.people.values()]
      .filter(
        (row) =>
          row.id !== offerTo &&
          row.alive &&
          row.placeId === mine.placeId &&
          row.liquidMinor > 0,
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor);
    for (const offerer of offerers.slice(0, 40)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: offerTo,
        stakeMinor: offerer.liquidMinor * 1000,
        subjectId: "bill:batch-four",
      });
      if (record?.offered) {
        log(`  bribe offered by ${who(offerer.id)} to ${who(offerTo)}`);
        return;
      }
    }
  };
  const until = race
    ? addDays(makeIsoDate(race.electionDate), 2)
    : addDays(makeIsoDate(core.date), 150);
  const capped = addDays(makeIsoDate(core.date), 330);
  const stop = until < capped ? until : capped;
  log(`  playing to ${stop}`);
  while (core.date < stop) {
    day();
    for (const id of watched) sweep(id, "campaign");
    if (!offered && core.date > addDays(makeIsoDate(gameStartDate()), 70))
      offer();
  }

  // A speech the player gives part by part, every option at the first two
  // stages and the first at the rest, shared where the choices are the same.
  const speaker = candidate ?? seat ?? me0;
  const speech = speechScene(speaker);
  if (speech)
    found.push({
      world,
      by: "speech",
      player: who(speaker),
      depth: 4,
      kindKey: "speech-builder",
      scene: speech,
    });
  return { world, found };

  function speechScene(speakerId: PersonId): BatchScene | null {
    const first = beginSpeech(core, speakerId);
    if (!first) return null;
    const nodes: Node[] = [];
    const bySignature = new Map<string, string>();
    const name = who(speakerId);
    const build = (state: SpeechBuild, follow: number): string => {
      const signature = `${state.picked.length}|${state.choices.map((c) => c.key).join(",")}`;
      const known = bySignature.get(signature);
      if (known) return known;
      const id = `${nodes.length + 1}`;
      bySignature.set(signature, id);
      const stage = [
        "the opening",
        "the first main part",
        "the second main part",
        "the closing",
      ][state.picked.length];
      const node: Node = {
        id,
        speaker: name,
        key: "speech-builder",
        text: state.done
          ? speechText(state)
          : `(your speech so far: ${state.picked.length ? speechText(state) : "nothing yet"}; now choose ${stage})`,
        choices: [],
      };
      nodes.push(node);
      if (state.done) {
        node.end = "the speech is given";
        return id;
      }
      node.choices = state.choices.map((choice, at) => ({
        id: `${id}.${String.fromCharCode(97 + at)}`,
        label: choice.text,
        tests: `${choice.stage}${choice.subject ? `; subject: ${choice.subject}` : ""}${choice.stand ? `; takes a stand to ${choice.stand.desiredChange} ${choice.stand.question}` : ""}`,
        key: choice.partKey,
        text: choice.text,
        next: null,
      }));
      state.choices.forEach((choice, at) => {
        const picks = state.picked.length;
        const allowed = picks < 2 || at < follow;
        if (allowed)
          node.choices[at]!.next = build(
            chooseSpeechPart(core, state, choice.key),
            follow,
          );
        else node.choices[at]!.cut = true;
      });
      return id;
    };
    build(first, 1);
    return {
      id: "",
      kind: "",
      source: {
        typeKey: "speech-builder",
        causeId: `speech:${speakerId}:${core.date}`,
        date: core.date,
      },
      setup: {
        narration: [],
        narrationKeys: [],
        when: `${dateSaid(core.date)}, ${core.date.slice(0, 4)}`,
        where: "the speech screen (no narrator beat is written for it)",
        who: [name],
      },
      nodes,
    };
  }
}

const worldFile = (index: number) => `${CACHE}/world-${index}.json`;
const world = arg("world");
if (world !== undefined) {
  const out = playWorld(Number(world));
  mkdirSync(dirname(worldFile(Number(world))), { recursive: true });
  writeFileSync(worldFile(Number(world)), JSON.stringify(out));
  log(`world ${world}: ${out.found.length} scenes cached`);
} else if (process.argv.includes("--build")) {
  const caches: { world: Candidate["world"]; found: Candidate[] }[] = [];
  for (let index = 0; index < WORLDS; index += 1)
    if (existsSync(worldFile(index)))
      caches.push(JSON.parse(readFileSync(worldFile(index), "utf8")));
  buildOutputs(caches, SEED);
} else {
  log("use --world <n> to play a world, then --build");
}
