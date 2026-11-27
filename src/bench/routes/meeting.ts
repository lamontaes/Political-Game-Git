// The meeting screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import { officeholders } from "../officeholders";
import { faceOf, scenePlace } from "../scene";
import {
  seatView,
  seatAskOptions,
  isByRequest,
  seatAsk,
  seatAct,
} from "../legislature";
import {
  meetingSceneView,
  meetingItem,
  meetingSpeak,
  meetingAttend,
  meetingAdjourn,
  officeView,
  askHead,
  officeStops,
  hireAide,
  budgetLinePick,
  colleagueDeal,
} from "../office";
import { calendarItems } from "../calendar";
import type { PersonId } from "../../core2/types";
import { applyForOpeningAs, leaveJobAs } from "../openings";
import { officeCases, decideCase } from "../office-cases";
import {
  Route,
  RouteContext,
  ServerState,
  requireCore,
  shownMinute,
  sitDown,
  state,
} from "../session-state";

export const meetingRoutes: readonly Route[] = [
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
      request.method === "GET" && url.pathname === "/api/seat",
    run: async ({ url, send }) => {
      send(200, seatView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  // The officeholder's day (OFFICE-LOCAL): the meeting scene, the desk and the stops.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/meeting",
    run: async ({ send }) => {
      send(
        200,
        state.player?.personId
          ? meetingSceneView(
              requireCore(),
              state.player.personId,
              shownMinute() ?? 18 * 60,
            )
          : null,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/item",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      meetingItem(
        requireCore(),
        url.searchParams.get("meetingId") ?? "",
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("vote") ?? "",
      );
      send(
        200,
        meetingSceneView(
          requireCore(),
          state.player.personId,
          shownMinute() ?? 18 * 60,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/speak",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      meetingSpeak(
        requireCore(),
        url.searchParams.get("meetingId") ?? "",
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("position") ?? "",
      );
      send(
        200,
        meetingSceneView(
          requireCore(),
          state.player.personId,
          shownMinute() ?? 18 * 60,
        ),
      );
      return;
    },
  },
  {
    // A resident marks a body's posted meeting to attend, or takes the mark back (Calendar).
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/attend",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      meetingAttend(
        requireCore(),
        url.searchParams.get("officeId") ?? "",
        url.searchParams.get("date") ?? "",
        url.searchParams.get("attend") === "true",
      );
      send(200, {
        date: requireCore().date,
        items: calendarItems(requireCore(), state.player.personId),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/adjourn",
    run: async ({ url, send }) => {
      meetingAdjourn(requireCore(), url.searchParams.get("meetingId") ?? "");
      send(200, null);
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
  // The official asks someone offered for one of their open posts: the ask
  // plays as a scene, and only its ending names anyone (brief J).
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/ask-head",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const asked = askHead(
        requireCore(),
        state.player.personId,
        url.searchParams.get("post") ?? "",
        url.searchParams.get("nomineeId") ?? "",
      );
      send(200, sitDown(state.player.personId as PersonId, asked));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/stops",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        officeStops(
          requireCore(),
          state.player.personId,
          url.searchParams.get("key") ?? "",
          url.searchParams.get("on") === "true",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/hire-aide",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        hireAide(
          requireCore(),
          state.player.personId,
          url.searchParams.get("personId") ?? "",
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
  // Who an executive may ask to carry the bill just drafted, the likeliest yes marked.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/seat/ask-options",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const q = (key: string) => url.searchParams.get(key) ?? undefined;
      send(
        200,
        seatAskOptions(requireCore(), state.player.personId, {
          officeId: q("officeId"),
          series: q("series"),
          question: q("question"),
          line: q("line"),
          value: q("value") === undefined ? undefined : Number(q("value")),
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/seat/act",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const q = (key: string) => url.searchParams.get(key) ?? undefined;
      if (isByRequest(requireCore(), state.player.personId, q("officeId"))) {
        send(
          200,
          seatAsk(requireCore(), state.player.personId, {
            officeId: q("officeId"),
            series: q("series"),
            question: q("question"),
            line: q("line"),
            value: q("value") === undefined ? undefined : Number(q("value")),
            memberId: q("memberId"),
          }),
        );
        return;
      }
      send(
        200,
        seatAct(requireCore(), state.player.personId, {
          kind: q("kind") ?? "",
          officeId: q("officeId"),
          series: q("series"),
          question: q("question"),
          line: q("line"),
          value: q("value") === undefined ? undefined : Number(q("value")),
          // A phase-in: each step's amount and the day it takes effect.
          ...(q("steps")
            ? {
                steps: (
                  JSON.parse(q("steps")!) as {
                    value: number;
                    effectiveDate: string;
                  }[]
                ).map((step) => ({
                  value: Number(step.value),
                  effectiveDate: String(step.effectiveDate),
                })),
              }
            : {}),
          // A phase-in by a percent a year.
          ...(q("risePercent")
            ? {
                risePerYear: {
                  percent: Number(q("risePercent")),
                  years: Number(q("riseYears")),
                  firstDate: String(q("riseFirstDate")),
                },
              }
            : {}),
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/job/apply",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        applyForOpeningAs(
          requireCore(),
          url.searchParams.get("position") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/job/leave",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(200, leaveJobAs(requireCore(), state.player.personId));
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
