// The page screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import {
  drawName,
  drawCharacter,
  drawBirthday,
  ageAtStart,
  birthYears,
  creatorStates,
  creatorTowns,
} from "../creator";
import {
  lookForGender,
  drawnAppearance,
  appearanceRows,
  lookFaces,
  pickAppearance,
  readRecipe,
  moveAppearance,
} from "../appearance";
import { gameStartDate } from "../../core2/game-start";
import { readFile } from "node:fs/promises";
import { patchNoteReleases } from "../patch-notes";
import { searchGuideTerms, relatedGuideTerms } from "../guide-terms";
import controls from "../data/controls.json" with { type: "json" };
import { policyNames, budgetLineNames, actionNames } from "../words";
import { benchProgress } from "../progress";
import { stateRollCall } from "../states";
import type { Route } from "../session-state";
import { requireCore, state } from "../session-state";

export const pageRoutes: readonly Route[] = [
  {
    match: ({ url }) => url.pathname.startsWith("/api/creator/"),
    run: async ({ request, url, send }) => {
      // The New game creator (creator.ts, appearance.ts): draws and lists
      // that read no world, so they answer before one is built.
      const q = url.searchParams;
      const draw = Number(q.get("draw") ?? 0);
      const seed = q.get("seed") ?? "";
      const gender = q.get("gender") ?? "";
      const route = url.pathname.slice("/api/creator/".length);
      if (route === "name") send(200, drawName(seed, draw, gender));
      else if (route === "character") {
        const character = drawCharacter(seed, draw);
        const recipe = lookForGender(
          drawnAppearance(character.gender, seed, draw),
          character.gender,
        );
        send(200, {
          ...character,
          look: {
            recipe,
            rows: appearanceRows(recipe, character.gender),
            faces: lookFaces(recipe),
          },
        });
      } else if (route === "birthday") {
        const b = drawBirthday(seed, draw);
        send(200, { ...b, age: ageAtStart(b.year, b.month, b.day) });
      } else if (route === "years")
        send(200, {
          start: gameStartDate(),
          years: birthYears(Number(q.get("month")), Number(q.get("day"))),
        });
      else if (route === "states") send(200, creatorStates());
      else if (route === "towns")
        send(200, creatorTowns(q.get("state") ?? "", q.get("q") ?? "", seed));
      else if (route === "appearance") {
        const recipe = q.get("recipe")
          ? request.method === "POST"
            ? q.get("pick")
              ? pickAppearance(
                  readRecipe(q.get("recipe")!),
                  gender,
                  q.get("row") ?? "",
                  q.get("pick")!,
                )
              : moveAppearance(
                  readRecipe(q.get("recipe")!),
                  gender,
                  q.get("row") ?? "",
                  Number(q.get("by") ?? 1),
                )
            : readRecipe(q.get("recipe")!)
          : drawnAppearance(gender, seed, draw);
        const fitted = lookForGender(recipe, gender);
        // The look, its rows and the busts every screen will draw for it:
        // in its everyday top and in its formal clothes (the creator's tabs).
        send(200, {
          recipe: fitted,
          rows: appearanceRows(fitted, gender),
          faces: lookFaces(fitted),
        });
      } else send(404, { error: "Unknown bench route." });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/version",
    run: async ({ send }) => {
      // Source runs have no bundler define; the package's release number is the record.
      const { version } = JSON.parse(
        await readFile(
          new URL("../../../package.json", import.meta.url),
          "utf8",
        ),
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
            new URL("../../../PATCH_NOTES.md", import.meta.url),
            "utf8",
          ),
        ),
      });
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
      request.method === "GET" && url.pathname === "/api/controls",
    run: async ({ send }) => {
      // A position's name: a policy or law on the bill catalog, or a local
      // seat's budget line.
      send(200, {
        ...controls,
        policyNames: { ...policyNames(), ...budgetLineNames() },
        // An act's name for the journal of acts and a place's reasons.
        actions: actionNames(),
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
      request.method === "GET" && url.pathname === "/api/state/roll-call",
    run: async ({ url, send }) => {
      // Another state's change, its roll call in each chamber and its sponsor (states.ts).
      send(
        200,
        stateRollCall(requireCore(), url.searchParams.get("lawId") ?? ""),
      );
      return;
    },
  },
];
