// The government screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import { governmentMap } from "../map";
import { bankView } from "../bank";
import { metricsView } from "../metrics";
import { budgetView, setPriority } from "../budget";
import { lawChanges } from "../changes";
import { lawDid } from "../law-did";
import { economyView, worldPanels } from "../economy";
import { calendarItems } from "../calendar";
import {
  politicsStates,
  stateLegislators,
  localRaces,
  governmentView,
} from "../government";
import { governmentBodies } from "../government-bodies";
import type { Route } from "../session-state";
import { requireCore, state } from "../session-state";

export const governmentRoutes: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/map",
    run: async ({ send }) => {
      // The state's map with the player's districts and who holds each,
      // for Parties (owner, Oct 28, point 20: "bring it back").
      send(200, governmentMap(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bank",
    run: async ({ url, send }) => {
      send(200, bankView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/metrics",
    run: async ({ send }) => {
      send(200, metricsView(requireCore(), state.placeId));
      return;
    },
  },
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
      request.method === "GET" && url.pathname === "/api/changes",
    run: async ({ url, send }) => {
      send(200, lawChanges(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/law/did",
    run: async ({ url, send }) => {
      // What a law passed in play did: whom it reached, by record (law-did.ts).
      send(200, lawDid(requireCore(), url.searchParams.get("series") ?? ""));
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
];
