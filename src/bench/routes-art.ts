import { readFile } from "node:fs/promises";
import { frontPng } from "./mannequin-plates";
import { occluderPath } from "./occluders";
import { figureAtPath, figurePng } from "./people-pack";
import { backdropPath } from "./scene";
import { NEWSPAPER_ART, type Route } from "./server-state";

/** The art routes, tried in this order. */
export const artRoutes: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname.startsWith("/art/people/"),
    run: async ({ url, response }) => {
      // A person: the pack's figure (people-pack.ts), a kit in the colors
      // the query names, a look as painted.
      const figure = figureAtPath(url.pathname);
      if (!figure) throw new Error("Unknown figure.");
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      });
      response.end(
        figurePng(figure, Object.fromEntries(url.searchParams.entries())),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname.startsWith("/art/people-rooms/fronts/"),
    run: async ({ url, response }) => {
      // The furniture a plate paints in front of a mannequin, as a mask.
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "max-age=3600",
      });
      response.end(
        frontPng(url.pathname.slice("/art/people-rooms/fronts/".length)),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname.startsWith("/art/backdrops/occluders/"),
    run: async ({ url, response }) => {
      // What stands in front of a spot: a mask the screen lays the picture through.
      const content = await readFile(
        occluderPath(url.pathname.slice("/art/backdrops/occluders/".length)),
      );
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname.startsWith("/art/backdrops/"),
    run: async ({ url, response }) => {
      const content = await readFile(
        backdropPath(url.pathname.slice("/art/backdrops/".length)),
      );
      response.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && NEWSPAPER_ART.test(url.pathname),
    run: async ({ response, url }) => {
      const newspaper = NEWSPAPER_ART.exec(url.pathname)!;
      // The newspaper art: engraved mastheads and front-page photos, cut
      // from the originals in art/newspaper-mockups (lineage in its README).
      const content = await readFile(
        new URL(
          newspaper[1]!,
          new URL("../../art/newspaper-mockups/derived/", import.meta.url),
        ),
      );
      response.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    },
  },
];
