import { drawAheadOn } from "./people-pack";
import { artRoutes } from "./routes-art";
import { billsRoutes } from "./routes-bills";
import { campaignRoutes } from "./routes-campaign";
import { gameRoutes } from "./routes-game";
import { governmentRoutes } from "./routes-government";
import { peopleRoutes } from "./routes-people";
import { talkRoutes } from "./routes-talk";
import { state, type BenchRequestOptions, type Route } from "./server-state";

export const serialize = (value: unknown) =>
  JSON.stringify(value, (_key, item) => {
    if (item instanceof Map) return Object.fromEntries(item);
    if (item instanceof Set) return [...item];
    if (typeof item === "bigint") return item.toString();
    return item;
  });

/** The world the developer view reads (dev-api.ts), the same engine state. */
export function benchWorld() {
  return {
    core: state.core,
    director: state.director,
    player: state.player,
    placeId: state.placeId,
  };
}

/** What the handler sends back: a status, headers and a body. */
export interface BenchReply {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}
// The play page never calls these; they are the bench's developer view.
const DEVELOPER_ROUTES = new Set(["/api/build"]);

/** The play server's routes: each area's, tried in this order; the first whose match holds answers. */
const ROUTES: readonly Route[] = [
  ...gameRoutes,
  ...artRoutes,
  ...talkRoutes,
  ...peopleRoutes,
  ...governmentRoutes,
  ...billsRoutes,
  ...campaignRoutes,
];

/**
 * One request to the play server's routes (`/api/*` and `/art/*`), host
 * neutral: the dev listener (server.ts) and the desktop shell's app protocol
 * both call it, so there is one set of routes.
 */
export async function benchRequest(
  method: string,
  url: URL,
  options: BenchRequestOptions,
): Promise<BenchReply> {
  // A game is being played: figures handed out are drawn ahead from now on.
  drawAheadOn();
  let reply: BenchReply = { status: 500, headers: {}, body: "" };
  const request = { method };
  const response = {
    writeHead: (status: number, headers: Record<string, string>) => {
      reply = { status, headers, body: "" };
    },
    end: (body: Uint8Array | string) => {
      reply = { ...reply, body };
    },
  };
  const send = (status: number, value: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(serialize(value));
  };
  try {
    if (!options.developer && DEVELOPER_ROUTES.has(url.pathname)) {
      send(404, { error: "Unknown bench route." });
      return reply;
    }
    const route = ROUTES.find((candidate) => candidate.match({ request, url }));
    if (route) await route.run({ request, url, options, send, response });
    else send(404, { error: "Unknown bench route." });
  } catch (error) {
    send(400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return reply;
}
