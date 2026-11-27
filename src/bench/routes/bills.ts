// The bills screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import { billPaper } from "../legislature";
import {
  billStage,
  billPageView,
  followedBills,
  staffRedraft,
  keepStaffRedraft,
  moveOwnAmendment,
  callAmendmentVote,
  chooseOverrideVote,
  callOverrideVote,
  chooseOwnVote,
} from "../bill-stage";
import {
  deskView,
  deskDecide,
  floorView,
  floorDecide,
  ordersView,
  ordersDecide,
  nominationsView,
  nominationDecide,
} from "../office";
import type { PersonId } from "../../core2/types";
import type { Route } from "../session-state";
import { requireCore, sitDown, state } from "../session-state";

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
  // What the bill's page is built from: name, stage and day, sponsor, sections, tallies and reach.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill/page",
    run: async ({ url, send }) => {
      send(
        200,
        billPageView(
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
        url.searchParams.get("reason") ?? undefined,
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
      const asked = ordersDecide(
        requireCore(),
        url.searchParams.get("entryId") ?? "",
        url.searchParams.get("how") ?? "",
        url.searchParams.get("nomineeId") ?? undefined,
      );
      // Naming someone to a post asks them: the sit-down plays first.
      if (asked && state.player?.personId)
        send(200, sitDown(state.player.personId as PersonId, asked));
      else send(200, ordersView(requireCore()));
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
];
