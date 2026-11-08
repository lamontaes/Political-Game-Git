import {
  billStage,
  callAmendmentVote,
  callOverrideVote,
  chooseOverrideVote,
  chooseOwnVote,
  followedBills,
  keepStaffRedraft,
  moveOwnAmendment,
  staffRedraft,
} from "./bill-stage";
import { billPaper } from "./legislature";
import { requireCore, state, type Route } from "./server-state";

/** The bills routes, tried in this order. */
export const billsRoutes: readonly Route[] = [
  // A bill as one paper document, read from its own records.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill",
    run: async ({ url, send }) => {
      send(200, billPaper(requireCore(), url.searchParams.get("billId") ?? ""));
      return;
    },
  },
  // Where a bill is: its committee record, what members told you, the floor and override by name.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill/stage",
    run: async ({ url, send }) => {
      send(
        200,
        billStage(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // Bills before the state's chambers and Congress, followed from home.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bills/following",
    run: async ({ send }) => {
      send(200, followedBills(requireCore(), state.player?.personId));
      return;
    },
  },
  // The staff's redraft of one section, and the sponsor keeping it.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill/redraft",
    run: async ({ url, send }) => {
      send(
        200,
        staffRedraft(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          Number(url.searchParams.get("index")),
          state.player?.personId,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/redraft",
    run: async ({ url, send }) => {
      send(
        200,
        keepStaffRedraft(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          Number(url.searchParams.get("index")),
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // An amendment on a bill's section, and the body's vote on it.
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/amend",
    run: async ({ url, send }) => {
      send(
        200,
        moveOwnAmendment(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          Number(url.searchParams.get("index")),
          url.searchParams.get("direction") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/amendment-vote",
    run: async ({ url, send }) => {
      send(
        200,
        callAmendmentVote(
          requireCore(),
          url.searchParams.get("amendmentId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // The override of a veto: the player's own vote, and the body taking the message up.
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/override",
    run: async ({ url, send }) => {
      send(
        200,
        chooseOverrideVote(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          url.searchParams.get("vote") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/override-call",
    run: async ({ url, send }) => {
      send(
        200,
        callOverrideVote(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // The player's own vote on a bill before its floor day (the member's own choice).
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/vote",
    run: async ({ url, send }) => {
      send(
        200,
        chooseOwnVote(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          url.searchParams.get("vote") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
];
