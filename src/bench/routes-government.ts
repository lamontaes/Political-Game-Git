import { parameter } from "../core2/parameters";
import { OPENING_EVENING_MINUTE } from "./opening";
import {
  deskDecide,
  floorDecide,
  floorView,
  ordersDecide,
  ordersView,
  deskView,
  colleagueDeal,
  nameHeadPick,
  nominationDecide,
  nominationsView,
  budgetLinePick,
  officeView,
} from "./office";
import { budgetView, setPriority } from "./budget";
import {
  chooseAtCounter,
  counterOpening,
  openBenchFilingVisit,
} from "./filing";
import { makeIsoDate } from "../core2/kernel/dates";
import { officeCases, decideCase } from "./office-cases";
import {
  fileForOffice,
  governmentView,
  joinPartyAs,
  localRaces,
  politicsStates,
  stateLegislators,
} from "./government";
import { governmentBodies } from "./government-bodies";
import { namesFor, requireCore, state, type Route } from "./server-state";

/** The government routes, tried in this order. */
export const governmentRoutes: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/budget",
    run: async ({ url, send }) => {
      send(200, budgetView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/budget/priority",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        setPriority(
          requireCore(),
          state.player.personId,
          url.searchParams.get("governmentId") ?? "",
          url.searchParams.get("line") ?? "",
          Number(url.searchParams.get("change")) || 0,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/desk",
    run: async ({ send }) => {
      send(200, state.player?.personId ? deskView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/desk",
    run: async ({ url, send }) => {
      deskDecide(
        requireCore(),
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("how") ?? "",
      );
      send(200, deskView(requireCore()));
      return;
    },
  },
  // A floor vote in Congress that holds the player's clock: the bills, and the player's own vote.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/floor",
    run: async ({ send }) => {
      send(200, state.player?.personId ? floorView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/floor",
    run: async ({ url, send }) => {
      floorDecide(
        requireCore(),
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("how") ?? "",
      );
      send(200, floorView(requireCore()));
      return;
    },
  },
  // Orders the governor's staff brings for signature, and the player's decision on each.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/orders",
    run: async ({ send }) => {
      send(200, state.player?.personId ? ordersView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/orders",
    run: async ({ url, send }) => {
      ordersDecide(
        requireCore(),
        url.searchParams.get("entryId") ?? "",
        url.searchParams.get("how") ?? "",
        url.searchParams.get("nomineeId") ?? undefined,
      );
      send(200, ordersView(requireCore()));
      return;
    },
  },
  // The president's open cabinet posts, and the player's nomination for one.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/nominations",
    run: async ({ send }) => {
      send(200, state.player?.personId ? nominationsView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/nominations",
    run: async ({ url, send }) => {
      nominationDecide(
        requireCore(),
        url.searchParams.get("post") ?? "",
        url.searchParams.get("nomineeId") ?? undefined,
        url.searchParams.get("how") === "leave",
      );
      send(200, nominationsView(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/office",
    run: async ({ url, send }) => {
      send(200, officeView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/office/name-head-pick",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        nameHeadPick(
          requireCore(),
          state.player.personId,
          url.searchParams.get("post") ?? "",
          url.searchParams.get("nomineeId") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/budget-line",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        budgetLinePick(
          requireCore(),
          state.player.personId,
          url.searchParams.get("line") ?? "",
          Number(url.searchParams.get("changeMinor")),
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/deal",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        colleagueDeal(
          requireCore(),
          state.player.personId,
          url.searchParams.get("memberId") ?? "",
          url.searchParams.get("deal") ?? "",
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
              ? OPENING_EVENING_MINUTE
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
            ? OPENING_EVENING_MINUTE
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
      state.filingVisit = openBenchFilingVisit(
        current,
        state.player.personId,
        filedWith,
        state.player.packet?.at.minuteOfDay ?? 12 * 60,
      );
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
      request.method === "GET" && url.pathname === "/api/government/state",
    run: async ({ url, send }) => {
      send(200, {
        states: politicsStates(),
        legislators: stateLegislators(
          requireCore(),
          url.searchParams.get("state") ?? "",
          url.searchParams.get("level") === "federal" ? "federal" : "state",
        ),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname === "/api/government/local-races",
    run: async ({ send }) => {
      send(200, localRaces(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/government/bodies",
    run: async ({ url, send }) => {
      const level = url.searchParams.get("level");
      send(
        200,
        governmentBodies(
          requireCore(),
          url.searchParams.get("id") ?? "",
          level === "state" || level === "federal" ? level : "local",
          url.searchParams.get("state") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/government",
    run: async ({ url, send }) => {
      send(
        200,
        governmentView(requireCore(), url.searchParams.get("id") ?? ""),
      );
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
  // Election day at the polls: the ballot, marked race by race, or left.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/office/cases",
    run: async ({ url, send }) => {
      send(
        200,
        officeCases(
          requireCore(),
          url.searchParams.get("id") ?? state.player?.personId ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/case",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const decision = url.searchParams.get("decision");
      send(
        200,
        decideCase(
          requireCore(),
          state.player.personId,
          url.searchParams.get("caseId") ?? "",
          decision === "help" ? "help" : "decline",
        ),
      );
      return;
    },
  },
];
