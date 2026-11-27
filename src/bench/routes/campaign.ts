// The campaign screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import {
  campaignView,
  runningMatePicked,
  runningMateAsked,
  playerRecord,
  donationAsksView,
  answerAsk,
  campaignAct,
  speechBegin,
  speechView,
  speechPick,
  speechGive,
  campaignDay,
  debateAnswer,
  debateAccept,
} from "../campaign";
import type { PersonId } from "../../core2/types";
import {
  counterOpening,
  openBenchFilingVisit,
  NothingAtCounter,
  chooseAtCounter,
} from "../filing";
import { openingArrivalMinute } from "../opening";
import { makeIsoDate } from "../../core2/kernel/dates";
import { parameter } from "../../core2/parameters";
import { joinPartyAs, announceForOffice, fileForOffice } from "../government";
import {
  Route,
  RouteContext,
  ServerState,
  namesFor,
  requireCore,
  shownMinute,
  sitDown,
  state,
} from "../session-state";

export const campaignRoutes: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/campaign",
    run: async ({ url, send }) => {
      send(200, campaignView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  // A player running for governor takes "Choose for me": the strongest of the people offered
  // who would say yes is named, with no scene (asking someone is /api/campaign/running-mate/ask).
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/campaign/running-mate",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        runningMatePicked(
          requireCore(),
          state.player.personId,
          url.searchParams.get("filingId") ?? "",
        ),
      );
      return;
    },
  },
  // A player running for governor asks one of the people offered to be their running mate:
  // the ask plays as a scene on the clock, and only its ending names anyone (brief J).
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/campaign/running-mate/ask",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const asked = runningMateAsked(
        requireCore(),
        state.player.personId,
        url.searchParams.get("filingId") ?? "",
        url.searchParams.get("personId") ?? "",
      );
      send(200, sitDown(state.player.personId as PersonId, asked));
      return;
    },
  },
  // The player's record in office, as voters read it: what the Campaigns screen plans a re-run from.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/campaign/record",
    run: async ({ url, send }) => {
      send(200, playerRecord(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/campaign/asks",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(200, donationAsksView(requireCore(), state.player.personId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/asks/answer",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        answerAsk(requireCore(), state.player.personId, {
          askId: url.searchParams.get("askId") ?? "",
          answer: url.searchParams.get("answer") ?? "",
          amountMinor: Number(url.searchParams.get("amountMinor")) || undefined,
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/act",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const number = (key: string) =>
        Number(url.searchParams.get(key)) || undefined;
      send(
        200,
        campaignAct(requireCore(), state.player.personId, {
          filingId: url.searchParams.get("filingId") ?? "",
          kind: url.searchParams.get("kind") ?? "",
          amountMinor: number("amountMinor"),
          sampleSize: number("sampleSize"),
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/campaign/speech/begin",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      state.speechBuild = speechBegin(requireCore(), state.player.personId);
      send(200, speechView(state.speechBuild));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/speech/pick",
    run: async ({ url, send }) => {
      if (!state.speechBuild) throw new Error("No speech is being built.");
      state.speechBuild = speechPick(
        requireCore(),
        state.speechBuild,
        url.searchParams.get("key") ?? "",
      );
      send(200, speechView(state.speechBuild));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/speech/give",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      if (!state.speechBuild) throw new Error("No speech is being built.");
      const given = speechGive(
        requireCore(),
        state.player.personId,
        state.speechBuild,
        {
          filingId: url.searchParams.get("filingId") ?? "",
          venue: url.searchParams.get("venue") ?? "",
        },
      );
      state.speechBuild = undefined;
      send(200, given);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/day",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const day = campaignDay(requireCore(), state.player.personId, {
        filingId: url.searchParams.get("filingId") ?? "",
        kind: url.searchParams.get("kind") ?? "",
        outletId: url.searchParams.get("outletId") ?? undefined,
      });
      // A doors outing stages its porch scene now, while the player is out
      // (the director stages it at the day's close otherwise).
      if (url.searchParams.get("kind") === "canvass")
        state.director?.stageDoors(requireCore(), state.player.personId);
      // The outing's hours come off the same clock the packet reports.
      const spent = state.player.spend(day.hours);
      send(200, {
        ...day,
        ...(spent
          ? { packet: spent.packet, names: namesFor(spent.packet) }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/debate",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const answers = JSON.parse(url.searchParams.get("answers") ?? "[]") as {
        question: string;
        position: number | null;
      }[];
      send(
        200,
        debateAnswer(
          requireCore(),
          state.player.personId,
          url.searchParams.get("debateId") ?? "",
          answers,
        ),
      );
      return;
    },
  },
  // The player accepts a debate's invitation; the director stages the sitting.
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/campaign/debate/accept",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        debateAccept(
          requireCore(),
          state.player.personId,
          url.searchParams.get("debateId") ?? "",
        ),
      );
      return;
    },
  },
  // When the office that takes these filings is next open (its clerk's own
  // hours); `opens` is absent while it is open now.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/filing/hours",
    run: async ({ url, send }) => {
      const current = requireCore();
      const opens = counterOpening(
        current,
        url.searchParams.get("filedWith") ?? "",
        state.player?.packet?.at ?? {
          date: current.date,
          minuteOfDay:
            state.director?.ledger.opening?.date === current.date
              ? openingArrivalMinute(current, state.player?.personId ?? "")
              : 12 * 60,
        },
      );
      send(200, opens ? { opens } : {});
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/filing/open",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const filedWith = url.searchParams.get("filedWith") ?? "";
      const current = requireCore();
      // The office keeps its clerk's hours: going to a closed one plays the
      // visit at its next opening, the clock moving there (owner, Nov 1:
      // "it should have started the next day").
      const now = state.player.packet?.at ?? {
        date: current.date,
        minuteOfDay:
          state.director?.ledger.opening?.date === current.date
            ? openingArrivalMinute(current, state.player.personId)
            : 12 * 60,
      };
      const opens = counterOpening(current, filedWith, now);
      if (opens) {
        const reachedOpening = () => {
          const at = state.player?.packet?.at;
          return (
            !!at &&
            (at.date > opens.date ||
              (at.date === opens.date && at.minuteOfDay >= opens.minuteOfDay))
          );
        };
        // A fresh clock first lives to the morning's start; the wait goes on
        // from there until it stands at the opening.
        let waited: ReturnType<typeof state.player.waitUntil> | undefined;
        for (let tries = 0; tries < 3 && !reachedOpening(); tries += 1) {
          waited = state.player.waitUntil({
            date: makeIsoDate(opens.date),
            minuteOfDay: opens.minuteOfDay,
          });
          if (!waited || state.player.packet?.kind !== "complete") break;
        }
        // Something came up on the way: it is lived first, the counter
        // waits for the next try.
        const reached = state.player.packet?.at;
        if (
          !waited ||
          state.player.packet?.kind !== "complete" ||
          !reached ||
          !reachedOpening()
        ) {
          send(200, { waiting: true, packet: state.player.packet });
          return;
        }
      }
      try {
        state.filingVisit = openBenchFilingVisit(
          current,
          state.player.personId,
          filedWith,
          shownMinute() ?? 12 * 60,
        );
      } catch (error) {
        // Nothing to file and no petition out: no scene at the counter
        // (Fable A, Nov 13, rule 19).
        if (!(error instanceof NothingAtCounter)) throw error;
        state.filingVisit = undefined;
        send(200, { nothing: true });
        return;
      }
      send(
        200,
        opens
          ? { ...state.filingVisit, waited: state.player.packet }
          : state.filingVisit,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/filing/choose",
    run: async ({ url, send }) => {
      if (!state.filingVisit) throw new Error("No filing visit is open.");
      const before = state.filingVisit.result;
      state.filingVisit = chooseAtCounter(
        requireCore(),
        state.filingVisit,
        url.searchParams.get("key") ?? "",
        {
          platform: url.searchParams.getAll("stance"),
          party: url.searchParams.get("party") || null,
        },
      );
      // Filing takes the afternoon at the counter: taking out the
      // petition, the clerk's questions, the wait. The hours come off the
      // same clock the packet reports.
      const filed = state.filingVisit.result as { status?: string } | undefined;
      const spent =
        filed && filed !== before && filed.status !== "refused"
          ? state.player?.spend(
              parameter("filingVisitHours", requireCore().data.parameters),
            )
          : undefined;
      send(200, {
        ...state.filingVisit,
        ...(spent
          ? { packet: spent.packet, names: namesFor(spent.packet) }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/filing/leave",
    run: async ({ send }) => {
      state.filingVisit = undefined;
      send(200, {});
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/party/join",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        joinPartyAs(
          requireCore(),
          state.player.personId,
          url.searchParams.get("partyId") ?? "",
        ),
      );
      return;
    },
  },
  // Announce for a race whose filing opens later (owner, Nov 17: "Run now,
  // file on the date").
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/announce",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        announceForOffice(
          requireCore(),
          state.player.personId,
          url.searchParams.get("contestId") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/file",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        fileForOffice(
          requireCore(),
          state.player.personId,
          url.searchParams.get("contestId") ?? "",
        ),
      );
      return;
    },
  },
];
