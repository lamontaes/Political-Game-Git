import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { benchRequest, benchWorld, serialize } from "./handler";
import { handleDev } from "./dev-api";

// The developer listener. The play routes live in handler.ts, which the
// desktop shell also serves in-process; this file adds only the bench's own
// page files and Dev mode.
const assets = new Map([
  // The old developer page is folded into Dev mode (owner, Oct 14, 2026).
  ["/", { file: "dev.html", type: "text/html; charset=utf-8" }],
  ["/play", { file: "play.html", type: "text/html; charset=utf-8" }],
  ["/play.mjs", { file: "play.mjs", type: "text/javascript; charset=utf-8" }],
  ["/play.css", { file: "play.css", type: "text/css; charset=utf-8" }],
  // Dates and money in words, shared with the server (src/english).
  [
    "/english/plain-words.mjs",
    {
      file: "../english/plain-words.mjs",
      type: "text/javascript; charset=utf-8",
    },
  ],
]);
// The approved Kit 12/13 fonts and controls, served from public/.
const PUBLIC = new URL("../../public/", import.meta.url);
const publicFile =
  /^\/(fonts\/kit12\/[a-z0-9-]+\.ttf|ui\/kit1[23]\/[a-z0-9-]+\.svg|ui\/kit13\/calendar-[a-z]+\.png)$/;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://bench");
  const method = request.method ?? "GET";
  const send = (status: number, value: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(serialize(value));
  };
  try {
    // The play screen's shared parts (src/bench/ui/<part>.mjs).
    const part = /^\/ui\/([a-z-]+\.mjs)$/.exec(url.pathname);
    const asset =
      assets.get(url.pathname) ??
      (part && {
        file: `ui/${part[1]}`,
        type: "text/javascript; charset=utf-8",
      });
    if (method === "GET" && asset) {
      const content = await readFile(new URL(asset.file, import.meta.url));
      response.writeHead(200, { "Content-Type": asset.type });
      response.end(content);
      return;
    }
    // Dev mode's page and routes (dev-api.ts).
    if (
      await handleDev(
        request,
        url,
        send,
        (status, type, content) => {
          response.writeHead(status, { "Content-Type": type });
          response.end(content);
        },
        benchWorld,
      )
    )
      return;
    const shared = publicFile.exec(url.pathname);
    if (method === "GET" && shared) {
      const content = await readFile(new URL(shared[1]!, PUBLIC));
      response.writeHead(200, {
        "Content-Type": shared[1]!.endsWith(".svg")
          ? "image/svg+xml"
          : shared[1]!.endsWith(".png")
            ? "image/png"
            : "font/ttf",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    }
    const reply = await benchRequest(method, url, { developer: true });
    response.writeHead(reply.status, reply.headers);
    response.end(reply.body);
  } catch (error) {
    send(400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Engineering port matches the devcontainer's forwarded port; not a model value.
const port = Number(process.env.BENCH_PORT ?? 3000);
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`M0 bench: http://localhost:${port}\n`);
});
