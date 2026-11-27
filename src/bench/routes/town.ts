// The town screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import { townPlaces, visitPlace } from "../places";
import { backdropFile, benchScene } from "../scene";
import { officePlace } from "../filing";
import { parameter } from "../../core2/parameters";
import {
  homePapers,
  followsAnyOutlet,
  followChoices,
  followOutlet,
  wordOwnResult,
} from "../archive-words";
import { heardItems, newsItems } from "../calendar";
import { ownRace } from "../results";
import { corePlaceStateIdentities } from "../../core2/place-lookup";
import { nationStories } from "../nation-news";
import controls from "../data/controls.json" with { type: "json" };
import { storyPicture } from "../news-picture";
import { openingFrames } from "../opening";
import { knownCard, personCard } from "../card";
import { personOrFillIn } from "../../core2/state";
import { openingsView } from "../openings";
import { makeIsoDate } from "../../core2/kernel/dates";
import {
  Route,
  RouteContext,
  ServerState,
  namesFor,
  requireCore,
  sceneNow,
  shownMinute,
  state,
} from "../session-state";

export const townRoutes: readonly Route[] = [
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
          shownMinute() ?? 12 * 60,
        ).url,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/goto/home",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      // Whether the player is out at a place, and where the day has them
      // otherwise (its picture and who is there), for Travel's way home.
      const id = state.player.personId;
      const there = benchScene(requireCore(), id, state.player.packet);
      send(200, {
        away: Boolean(state.visit),
        picture: there.backdrop.url,
        who: there.people
          .filter((person) => person.personId !== id)
          .map((person) => person.name),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/goto/home",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      // Going home from a place is a trip like the one that took them there;
      // from home it is nothing.
      // stopgapId: SG-PLAY-trip-time-average
      const parameters = requireCore().data.parameters;
      const spent = state.visit
        ? state.player.spend(
            parameter("tripMinutes", parameters) /
              parameter("minutesPerHour", parameters),
          )
        : undefined;
      state.visit = undefined;
      send(200, {
        scene: sceneNow(requireCore(), state.player.personId),
        ...(spent
          ? { packet: spent.packet, names: namesFor(spent.packet) }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/goto/visit",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      // stopgapId: SG-PLAY-trip-time-average
      // The trip comes first: the average trip time, then the room is seen as
      // it stands at the arrival minute, then the errand's hour is spent; the
      // people at the next place are those there at that later hour.
      const parameters = requireCore().data.parameters;
      const trip = state.player.spend(
        parameter("tripMinutes", parameters) /
          parameter("minutesPerHour", parameters),
      );
      const visit = visitPlace(
        requireCore(),
        state.player.personId,
        url.searchParams.get("org") ?? "",
        shownMinute() ?? 12 * 60,
      );
      const spent =
        state.player.spend(parameter("visitHours", parameters)) ?? trip;
      const arrived = state.player.packet?.at;
      state.visit = arrived
        ? { organizationId: visit.organizationId, date: arrived.date }
        : undefined;
      send(200, {
        ...visit,
        ...(spent
          ? {
              packet: spent.packet,
              names: { ...visit.names, ...namesFor(spent.packet) },
            }
          : {}),
      });
      return;
    },
  },
  {
    // The player's own papers, which News shows from the first day.
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/news/home",
    run: async ({ url, send }) => {
      send(200, homePapers(requireCore(), url.searchParams.get("id") ?? ""));
    },
  },
  {
    // Whether the player follows any paper or station, for News's empty page.
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/news/follows",
    run: async ({ url, send }) => {
      send(200, {
        any: followsAnyOutlet(requireCore(), url.searchParams.get("id") ?? ""),
        outlets: followChoices(requireCore(), url.searchParams.get("id") ?? ""),
      });
    },
  },
  {
    // The player follows an outlet or stops: News's Follow control.
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/news/follow",
    run: async ({ url, send }) => {
      const done = followOutlet(
        requireCore(),
        url.searchParams.get("id") ?? "",
        url.searchParams.get("outlet") ?? "",
        url.searchParams.get("on") === "1",
      );
      send(done ? 200 : 400, { done });
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
      const reader = id ? core.people.get(id) : undefined;
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
          // The player's own paper: an outlet of the place they live in, which
          // News opens on (homePapers in archive-words.ts).
          const outlet = (row as { outlet?: { id: string } }).outlet;
          if (outlet && reader)
            row = {
              ...row,
              outlet: {
                ...outlet,
                home:
                  core.organizations.get(outlet.id as never)?.placeId ===
                  reader.placeId,
              },
            } as typeof row;
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
          // A story the paper can lead with carries the picture of what it
          // is about, chosen from its own record.
          const told = row as { headline?: string; lede?: string };
          const picture =
            (told.headline || told.lede) && facts
              ? storyPicture(
                  core,
                  facts,
                  (row as { sourceRecordIds?: string[] }).sourceRecordIds ?? [],
                )
              : null;
          return {
            ...row,
            ...(Object.keys(names).length ? { names } : {}),
            ...(picture ? { picture } : {}),
          };
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/opening",
    run: async ({ url, send }) => {
      const id = url.searchParams.get("id") ?? "";
      send(
        200,
        state.opening && state.player?.personId === id
          ? state.opening
          : state.director?.ledger.opening
            ? openingFrames(requireCore(), id, state.director.ledger.opening)
            : null,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/known",
    run: async ({ url, send }) => {
      send(
        200,
        knownCard(
          requireCore(),
          url.searchParams.get("id") ?? "",
          personOrFillIn(requireCore(), url.searchParams.get("other") ?? "")
            ?.id ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/openings",
    run: async ({ url, send }) => {
      send(200, openingsView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/card",
    run: async ({ url, send }) => {
      // The card also carries the clock a screen shows: the player's own while it runs, else the
      // world's day (a dev panel's run of days lets the character go and returns no packet), so a
      // screen that re-reads the card after any change shows today's date.
      const core = requireCore();
      send(200, {
        ...personCard(core, url.searchParams.get("id") ?? ""),
        at: state.player?.packet?.at
          ? {
              ...state.player.packet.at,
              minuteOfDay: shownMinute() ?? state.player.packet.at.minuteOfDay,
            }
          : { date: makeIsoDate(core.date), minuteOfDay: shownMinute() ?? 0 },
      });
      return;
    },
  },
];
