import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gameStartDate } from "../core2/game-start";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { personOrFillIn } from "../core2/state";
import { wordOwnResult } from "./archive-words";
import { calendarItems, heardItems, newsItems } from "./calendar";
import { personCard } from "./card";
import { lawChanges } from "./changes";
import {
  applyChosenPerson,
  chosenBirthDate,
  readChosenPerson,
} from "./creator";
import controls from "./data/controls.json" with { type: "json" };
import { economyView, worldPanels } from "./economy";
import { officePlace } from "./filing";
import { writeLineGrade } from "./grade-line";
import { relatedGuideTerms, searchGuideTerms } from "./guide-terms";
import { loadingStory } from "./loading";
import { nationStories } from "./nation-news";
import { officeholders } from "./officeholders";
import { openingFrames } from "./opening";
import { patchNoteReleases } from "./patch-notes";
import { drawAheadNow } from "./people-pack";
import { townPlaces, visitPlace } from "./places";
import { BenchPlayer } from "./player";
import { pollingScene } from "./polling";
import { benchProgress } from "./progress";
import { electionResults, ownRace } from "./results";
import { backdropFile, faceOf, scenePlace } from "./scene";
import {
  namesFor,
  requireCore,
  sceneNow,
  state,
  type Route,
} from "./server-state";
import { budgetLineNames, policyNames } from "./words";
import { buildBenchWorld, buildBenchWorldInStages } from "./world";

/** The game routes, tried in this order. */
export const gameRoutes: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/newlife",
    run: async ({ url, send }) => {
      if (state.building)
        throw new Error("Opening generation is already running.");
      state.building = true;
      try {
        // The whole town, two-level (OPUS-CORE): full people for the
        // player's circle and officials, counts for everyone else.
        state.buildProgress = { stage: "people", done: 0, total: 0 };
        state.loadingPeek = null;
        // The person chosen in the creator, read before the build: the
        // player is the resident born nearest the chosen birthday.
        const chosen = url.searchParams.get("person")
          ? readChosenPerson(url.searchParams.get("person")!)
          : undefined;
        // Every game opens on the one start date (owner, Oct 14, 2026).
        const world = await buildBenchWorldInStages(
          url.searchParams.get("seed") ?? "",
          gameStartDate(),
          {
            twoLevel: true,
            onWorld: (built, id) => {
              if (id) state.loadingPeek = loadingStory(built, id);
            },
            ...(chosen
              ? {
                  playerBirthDate: chosenBirthDate(chosen),
                  playerGender: chosen.gender,
                }
              : {}),
            ...(url.searchParams.get("settings")
              ? { settings: JSON.parse(url.searchParams.get("settings")!) }
              : {}),
            ...(url.searchParams.get("placeKey")
              ? { placeKey: url.searchParams.get("placeKey")! }
              : {}),
          },
          (stage) => {
            state.buildProgress = { stage, done: 0, total: 0 };
          },
        );
        state.core = world.core;
        state.director = world.director;
        state.player = new BenchPlayer(world.core, world.director);
        state.conversation = undefined;
        state.placeId = world.placeId;
        state.placeName = world.place.displayName;
        const entrant = { personId: world.playerId! };
        // The person chosen in the creator becomes the player.
        if (chosen) applyChosenPerson(world.core, entrant.personId, chosen);
        state.player.select(entrant.personId);
        // Between the drawing steps the server answers the loading
        // screen, which plays the world's story meanwhile (loading.ts).
        const breathe = () => new Promise((resolve) => setImmediate(resolve));
        await breathe();
        // The opening is prepared during loading; its whole figures are files.
        state.opening = world.director.ledger.opening
          ? openingFrames(
              world.core,
              entrant.personId,
              world.director.ledger.opening,
            )
          : null;
        // The first screen's people and the faces the first menus show
        // (the player's card: household and closest ties) are drawn during
        // loading too, so they are there the moment the screen asks.
        await breathe();
        sceneNow(world.core, entrant.personId);
        await breathe();
        personCard(world.core, entrant.personId);
        await breathe();
        drawAheadNow();
        state.buildProgress = { stage: "done", done: 0, total: 0 };
        // A scene the director already staged for today (the address the
        // household watches that evening) plays first.
        const staged = world.director.ledger.people
          .get(entrant.personId)
          ?.schedule.find(
            (row) =>
              row.date === world.core.date &&
              row.outcome.startsWith("scene") &&
              row.bindings.length > 0,
          );
        send(200, {
          personId: entrant.personId,
          placeName: world.place.displayName,
          date: state.core.date,
          packet: state.player.packet,
          names: {},
          ...(staged ? { sceneMomentId: staged.momentId } : {}),
        });
      } finally {
        state.building = false;
      }
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/version",
    run: async ({ send }) => {
      // Source runs have no bundler define; the package's release number is the record.
      const { version } = JSON.parse(
        await readFile(new URL("../../package.json", import.meta.url), "utf8"),
      );
      send(200, { version });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/patch-notes",
    run: async ({ send }) => {
      // The title's Patch notes: the release machinery's own file, one
      // released section at a time (owner, Oct 28: "get them in").
      send(200, {
        releases: patchNoteReleases(
          await readFile(
            new URL("../../PATCH_NOTES.md", import.meta.url),
            "utf8",
          ),
        ),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname === "/api/advanced/officeholders",
    run: async ({ send }) => {
      send(200, officeholders(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname === "/api/advanced/officeholder-face",
    run: async ({ url, send }) => {
      const core = requireCore();
      const id = url.searchParams.get("id") ?? "";
      send(200, {
        face: core.people.has(id)
          ? faceOf(core, id, scenePlace(core, id).place)
          : null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/goto",
    run: async ({ url, send }) => {
      send(
        200,
        townPlaces(
          requireCore(),
          url.searchParams.get("id") ?? state.player?.personId ?? "",
          state.player?.packet,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/goto/counter-picture",
    run: async ({ url, send }) => {
      // The picture of the office that takes a contest's filings.
      send(200, {
        url: backdropFile(
          officePlace(url.searchParams.get("filedWith") ?? ""),
          state.player?.packet?.at.minuteOfDay ?? 12 * 60,
        ).url,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/goto/visit",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        visitPlace(
          requireCore(),
          state.player.personId,
          url.searchParams.get("org") ?? "",
          state.player.packet?.at.minuteOfDay ?? 12 * 60,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/changes",
    run: async ({ url, send }) => {
      send(200, lawChanges(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/guide",
    run: async ({ url, send }) => {
      // The Guide: researched terms, searched by term first, then definition.
      send(
        200,
        searchGuideTerms(url.searchParams.get("q") ?? "").map(
          ({ entry, matched }) => ({
            key: entry.semanticKey,
            term: entry.term,
            short: entry.shortDefinition,
            explanation: entry.explanation,
            contextNote: entry.contextNote ?? null,
            related: relatedGuideTerms(entry).map((row) => row.term),
            matched,
          }),
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/newlife/progress",
    run: async ({ send }) => {
      send(200, { ...state.buildProgress, story: state.loadingPeek !== null });
      return;
    },
  },
  // The loading screen's story, once the world exists (loading.ts).
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/newlife/story",
    run: async ({ send }) => {
      send(200, state.loadingPeek);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/controls",
    run: async ({ send }) => {
      // A position's name: a policy or law on the bill catalog, or a local
      // seat's budget line.
      send(200, {
        ...controls,
        policyNames: { ...policyNames(), ...budgetLineNames() },
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/progress",
    run: async ({ url, send }) => {
      send(
        200,
        benchProgress(
          requireCore(),
          state.placeId,
          url.searchParams.get("id") ?? undefined,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/results",
    run: async ({ url, send }) => {
      send(
        200,
        electionResults(requireCore(), url.searchParams.get("id") ?? ""),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/economy",
    run: async ({ send }) => {
      send(200, economyView(requireCore(), state.placeId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/world-panels",
    run: async ({ send }) => {
      send(200, worldPanels(requireCore(), state.placeId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/grade",
    run: async ({ url, send }) => {
      const grade = url.searchParams.get("grade");
      if (grade !== "good" && grade !== "bad")
        throw new Error("A grade is good or bad.");
      send(200, {
        i: writeLineGrade({
          parts: (url.searchParams.get("parts") ?? "")
            .split(",")
            .filter(Boolean),
          grade,
          note: url.searchParams.get("note") ?? undefined,
          text: url.searchParams.get("text") ?? undefined,
          momentId: url.searchParams.get("momentId") ?? undefined,
        }),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/calendar",
    run: async ({ url, send }) => {
      send(200, {
        date: requireCore().date,
        items: calendarItems(requireCore(), url.searchParams.get("id") ?? ""),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/news",
    run: async ({ url, send }) => {
      const id = url.searchParams.get("id");
      // What you heard first, then your town's public record; not every
      // news event in the world.
      const heard: { id: string; date: string }[] = id
        ? heardItems(requireCore(), id)
        : [];
      // Your own race's result, among what you heard by its date.
      const race = id ? ownRace(requireCore(), id) : null;
      const own = race && wordOwnResult(requireCore(), race, id!);
      if (own) {
        const at = heard.findIndex((row) => row.date < own.date);
        heard.splice(at < 0 ? heard.length : at, 0, own);
      }
      const seen = new Set(heard.map((row) => row.id));
      // A public record names who it is about: each fact that is a person
      // or a state.
      const core = requireCore();
      const stateNames = new Map([
        ...corePlaceStateIdentities().map(
          (row) => [row.jurisdictionKey, row.name] as const,
        ),
        ["US", "the United States"] as const,
      ]);
      send(
        200,
        [
          ...heard,
          ...newsItems(core).filter(
            (row) => row.visibility === "public" && !seen.has(row.id),
          ),
          // Laws other states passed lately, under the Nation heading.
          ...nationStories(core, controls.news.nation, id ?? undefined),
        ].map((row) => {
          const facts = (row as { facts?: Record<string, unknown> }).facts;
          const names: Record<string, string> = {};
          for (const value of Object.values(facts ?? {})) {
            if (typeof value !== "string") continue;
            const person = core.people.get(value);
            if (person)
              names[person.id] = `${person.givenName} ${person.familyName}`;
            // A state's jurisdiction by its name, not its key.
            const state = stateNames.get(value);
            if (state) names[value] = state;
          }
          return Object.keys(names).length ? { ...row, names } : row;
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/advance",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const result = state.player.advance(
        url.searchParams.get("mode") ?? "day",
        url.searchParams.get("date") ?? undefined,
      );
      send(200, {
        ...result,
        names: namesFor(result.packet),
        progress: benchProgress(
          requireCore(),
          state.placeId,
          state.player?.personId,
        ),
        pollingPlace: state.player.pollingPlace
          ? pollingScene(requireCore(), state.player.pollingPlace)
          : null,
        candidateMorning: state.player.candidateMorning ?? null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/resume",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const pauseId = url.searchParams.get("pauseId") ?? "";
      const result = state.player.resume({ kind: "stop", pauseId });
      send(200, {
        ...result,
        names: namesFor(result.packet),
        progress: benchProgress(
          requireCore(),
          state.placeId,
          state.player?.personId,
        ),
        pollingPlace: state.player.pollingPlace
          ? pollingScene(requireCore(), state.player.pollingPlace)
          : null,
        candidateMorning: state.player.candidateMorning ?? null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/play",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const id = url.searchParams.get("id") ?? "";
      personOrFillIn(requireCore(), id);
      state.player.select(id);
      if (state.conversation?.playerId !== state.player.personId)
        state.conversation = undefined;
      send(200, {
        personId: state.player.personId,
        packet: state.player.packet,
        selfChosen: state.player.selfChosen.slice(-50),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/build",
    run: async ({ url, send }) => {
      if (state.building)
        throw new Error("Opening generation is already running.");
      const seed = url.searchParams.get("seed") ?? "";
      const date = gameStartDate();
      // Stopgap SG-PLAY-bench-town-size: a smaller town plays at a usable
      // speed until the core's two-level population and speed work land.
      const size = Number(url.searchParams.get("size") ?? "") || undefined;
      state.building = true;
      try {
        // Two-level, as "New life" builds it (MEMORY-FLAT): a month of the
        // full population ran the bench out of memory. Tests that need every
        // resident as a full person ask for it with full=1.
        const world = buildBenchWorld(seed, date, {
          minimumPeople: size,
          twoLevel: url.searchParams.get("full") !== "1",
        });
        state.opening = undefined;
        const { place, residents } = world;
        const next = world.core,
          nextDirector = world.director;
        state.core = next;
        state.director = nextDirector;
        state.player = new BenchPlayer(next, nextDirector);
        state.conversation = undefined;
        state.placeId = place.context.jurisdiction.id;
        state.placeName = place.displayName;
        send(200, {
          seed: state.core.seed,
          date: state.core.date,
          placeId: place.context.jurisdiction.id,
          placeKey: place.key,
          placeName: place.displayName,
          jurisdictionKey: place.stateJurisdictionKey,
          residents,
          residentReferencesChecked: residents.length,
          peopleInCore: next.people.size,
          modules: [...next.modules.keys()],
          progress: benchProgress(next, place.context.jurisdiction.id),
          sourceHeads: JSON.parse(
            await readFile(
              new URL("integration-heads.json", import.meta.url),
              "utf8",
            ),
          ),
          gaps: [...state.core.gaps],
        });
      } finally {
        state.building = false;
      }
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/seed",
    run: async ({ send }) => {
      send(200, {
        seed: randomUUID(),
        date: gameStartDate(),
      });
      return;
    },
  },
];
