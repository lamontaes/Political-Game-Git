// The talk screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import { personOrFillIn } from "../../core2/state";
import { openingArrivalMinute } from "../opening";
import { roomIds } from "../scene";
import {
  openConversation,
  meetOverTalk,
  noteHeard,
  say,
  sayNothing,
  noteSceneHeard,
} from "../../director/conversation";
import { parameter } from "../../core2/parameters";
import { composeJournal } from "../../director/journal";
import { chapterPicture } from "../journal-pictures";
import { SITUATION_LIBRARY } from "../../director/scheduling";
import { storyScene, storyReply } from "../story";
import { writeLineGrade } from "../grade-line";
import {
  Route,
  RouteContext,
  ServerState,
  gapMarker,
  namesFor,
  requireCore,
  sceneNow,
  state,
  talkView,
} from "../session-state";

export const talkRoutes: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/scene",
    run: async ({ url, send }) => {
      const current = requireCore();
      const id = url.searchParams.get("id") ?? "";
      // Someone still in the counts is filled in the moment they're looked at.
      if (!personOrFillIn(current, id))
        throw new Error("Resident does not exist in core records.");
      send(200, sceneNow(current, id));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/open",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const otherId = url.searchParams.get("otherId") ?? "";
      if (!personOrFillIn(requireCore(), otherId)?.alive)
        throw new Error("Talk to a living resident.");
      // A talk a scene opens is about the scene's moment.
      const occasionId = url.searchParams.get("momentId") ?? undefined;
      // The minute the talk is had at: the opening day is that evening at
      // home, when the household gets home (the opening's talks spend their
      // minutes from the clock's morning); else the clock.
      const clockMinute = state.player.packet?.at.minuteOfDay;
      const arrivalMinute =
        state.director?.ledger.opening?.date === requireCore().date
          ? openingArrivalMinute(requireCore(), state.player.personId)
          : undefined;
      const minuteOfDay =
        arrivalMinute === undefined
          ? clockMinute
          : Math.max(clockMinute ?? arrivalMinute, arrivalMinute);
      // The room is handed to the talk (the telling): who else is here hears
      // it, and nobody is asked after while they stand there.
      const openingDay =
        state.director?.ledger.opening?.date === requireCore().date;
      const room = roomIds(
        requireCore(),
        state.player.personId,
        state.player.packet,
        openingDay ? minuteOfDay : undefined,
      );
      state.conversation = openConversation(
        requireCore(),
        state.player.personId,
        otherId,
        state.director
          ? {
              director: state.director,
              presentIds: room,
              ...(occasionId ? { occasionId } : {}),
              ...(minuteOfDay !== undefined ? { minuteOfDay } : {}),
              // The place the player came to, so a goodbye knows it is said
              // at the speaker's work.
              ...(state.visit
                ? { visitOrganizationId: state.visit.organizationId }
                : {}),
            }
          : {},
      );
      // A talk with no line is no talk (owner, Nov 1), on every road: a scene,
      // the room, a workplace visit. Nothing opens, and the screen hands the
      // room back.
      if (!state.conversation.lines.length) {
        state.conversation = undefined;
        send(200, null);
        return;
      }
      // The player talked with them: the two have met (the encounters
      // engine's meeting, through the director's one entry for it).
      meetOverTalk(requireCore(), state.conversation);
      // What they said is heard today by the player (the telling's "said
      // today"): the next housemate says something else.
      noteHeard(requireCore(), state.conversation);
      send(200, talkView(state.conversation));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/say",
    run: async ({ url, send }) => {
      if (!state.conversation) throw new Error("No conversation is open.");
      try {
        state.conversation = say(
          requireCore(),
          state.conversation,
          url.searchParams.get("key") ?? "",
        );
      } catch (error) {
        // A press of a reply the talk has already moved past (a second press
        // that was in flight with the first, or a button from an older beat) is
        // answered with the talk as it stands now: nothing is said twice and
        // nothing is lost. The engine still refuses the stale key.
        if (
          !(error instanceof Error) ||
          !/^Not an offered line/.test(error.message)
        )
          throw error;
      }
      send(200, talkView(state.conversation));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/silent",
    run: async ({ send }) => {
      if (!state.conversation) throw new Error("No conversation is open.");
      state.conversation = sayNothing(requireCore(), state.conversation);
      send(200, talkView(state.conversation));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/gap",
    run: async ({ url, send }) => {
      // Mark the talk's newest line as a gap (play-mark-gap): one record
      // naming the scene and the line; no game time passes.
      if (!state.conversation) throw new Error("No conversation is open.");
      const view = talkView(state.conversation)!;
      const at = Number(url.searchParams.get("line") ?? view.lines.length - 1);
      const line = view.lines[at];
      if (!line) throw new Error("No such line.");
      const sceneId =
        state.conversation.occasion?.id ??
        `talk:${state.conversation.playerId}:${state.conversation.otherId}:${requireCore().date}`;
      send(200, gapMarker().markGap(sceneId, `${sceneId}#${at}`, line.text));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/gaps",
    run: async ({ send }) => {
      send(200, gapMarker().gaps());
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/leave",
    run: async ({ send }) => {
      // A talk spends its own length on the player's clock when it ends: the
      // lines said and heard, each a few minutes.
      const lines = state.conversation
        ? (talkView(state.conversation)?.lines.length ?? 0)
        : 0;
      state.conversation = undefined;
      const parameters = requireCore().data.parameters;
      // The opening evening comes before the player's first morning, and the
      // clock has not started: a talk then is part of that evening and holds
      // it. Spent, its minutes would run from tomorrow morning, and the next
      // Day would land a day late.
      const spent =
        lines > 0 && state.player?.personId && state.player.packet
          ? state.player.spend(
              (lines * parameter("talkMinutesPerLine", parameters)) /
                parameter("minutesPerHour", parameters),
            )
          : undefined;
      send(
        200,
        spent ? { packet: spent.packet, names: namesFor(spent.packet) } : {},
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/wait",
    run: async ({ url, send }) => {
      // Stay or wait where the player is: the hours asked for, at most a day,
      // spent on the existing clock.
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const parameters = requireCore().data.parameters;
      const asked = Number(url.searchParams.get("hours") ?? "");
      if (!Number.isFinite(asked) || asked <= 0)
        throw new Error("Wait for a number of hours.");
      const spent = state.player.spend(
        Math.min(asked, parameter("hoursPerDay", parameters)),
      );
      send(
        200,
        spent ? { packet: spent.packet, names: namesFor(spent.packet) } : {},
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/journal",
    run: async ({ url, send }) => {
      if (!state.director) throw new Error("Generate a town first.");
      const who = url.searchParams.get("id") ?? "";
      const chapters = composeJournal(
        requireCore(),
        state.director,
        who,
        // The player's own journal reads to their clock, which stands at
        // the start of a day the core has yet to run (a birthday morning).
        state.player?.packet && state.player.personId === who
          ? { through: state.player.packet.at.date }
          : {},
      );
      // A chapter carries the picture of the place its lines were written from;
      // with no place on record it carries none.
      send(
        200,
        chapters.map((chapter) => {
          const picture = chapterPicture(requireCore(), who, chapter);
          return picture ? { ...chapter, picture } : chapter;
        }),
      );
      return;
    },
  },
  // The player's interrupt setting (owner, Oct 14, 2026): which kinds of
  // scene may stop the day. A director record its scheduling reads.
  {
    match: ({ url }) => url.pathname === "/api/scene-filter",
    run: async ({ request, url, send }) => {
      if (!state.director || !state.player?.personId)
        throw new Error("Start a life first.");
      if (request.method === "POST") {
        const kinds = url.searchParams.get("kinds");
        state.director.setSceneFilter(
          state.player.personId,
          kinds === null || kinds === "all"
            ? null
            : kinds.split(",").filter(Boolean),
          requireCore().date,
        );
      }
      const filter = state.director.ledger.sceneFilters.get(
        state.player.personId,
      );
      send(200, {
        kinds: SITUATION_LIBRARY.types.map((row) => row.key),
        // Each kind's group (its tag's endpoint), for the Options screen.
        groups: Object.fromEntries(
          SITUATION_LIBRARY.types.map((row) => [
            row.key,
            (row as unknown as { tag?: { endpoint?: string } }).tag?.endpoint,
          ]),
        ),
        allowed: filter?.allowedKinds ?? null,
        ...(filter ? { recordId: filter.id } : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/story",
    run: async ({ url, send }) => {
      if (!state.player?.personId || !state.director)
        throw new Error("Choose a resident first.");
      send(
        200,
        storyScene(
          requireCore(),
          state.director,
          state.player.personId,
          url.searchParams.get("momentId") ?? "",
          // The opening day's scene is that evening at home (as /api/scene).
          state.player.packet?.at.minuteOfDay ??
            (state.director.ledger.opening?.date === requireCore().date
              ? openingArrivalMinute(requireCore(), state.player.personId)
              : 12 * 60),
          // ?held=1 on the play page: the grading view, held lines marked;
          // ?dev=1 in dev mode: each line says why it was placed.
          {
            held: url.searchParams.get("held") === "1",
            dev: url.searchParams.get("dev") === "1",
          },
        ),
      );
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
      request.method === "POST" && url.pathname === "/api/story/reply",
    run: async ({ url, send }) => {
      if (!state.player?.personId || !state.director)
        throw new Error("Choose a resident first.");
      // The scene's story is heard for the day: talk does not tell it again.
      noteSceneHeard(
        requireCore(),
        state.director,
        state.player.personId,
        url.searchParams.get("momentId") ?? "",
      );
      send(
        200,
        storyReply(
          requireCore(),
          state.director,
          state.player.personId,
          url.searchParams.get("momentId") ?? "",
          (url.searchParams.get("path") ?? "")
            .split(".")
            .filter(Boolean)
            .map(Number),
          {
            held: url.searchParams.get("held") === "1",
            ...(url.searchParams.get("typeKey")
              ? { typeKey: url.searchParams.get("typeKey")! }
              : {}),
          },
        ),
      );
      return;
    },
  },
];
