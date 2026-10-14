import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { benchRequest } from "./handler";

// The developer listener. The routes live in handler.ts, which the desktop
// shell serves in-process; this file adds only the bench's own page files.
const assets = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  [
    "/client.mjs",
    { file: "client.mjs", type: "text/javascript; charset=utf-8" },
  ],
  ["/play", { file: "play.html", type: "text/html; charset=utf-8" }],
  ["/play.mjs", { file: "play.mjs", type: "text/javascript; charset=utf-8" }],
  ["/play.css", { file: "play.css", type: "text/css; charset=utf-8" }],
]);
// The approved Kit 12/13 fonts and controls, served from public/.
const PUBLIC = new URL("../../public/", import.meta.url);
const publicFile =
  /^\/(fonts\/kit12\/[a-z0-9-]+\.ttf|ui\/kit1[23]\/[a-z0-9-]+\.svg)$/;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://bench");
  const method = request.method ?? "GET";
  try {
    const asset = assets.get(url.pathname);
    if (method === "GET" && asset) {
      const content = await readFile(new URL(asset.file, import.meta.url));
      response.writeHead(200, { "Content-Type": asset.type });
      response.end(content);
      return;
    }
    const shared = publicFile.exec(url.pathname);
    if (method === "GET" && shared) {
      const content = await readFile(new URL(shared[1]!, PUBLIC));
      response.writeHead(200, {
        "Content-Type": shared[1]!.endsWith(".svg")
          ? "image/svg+xml"
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
    response.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
});

// Engineering port matches the devcontainer's forwarded port; not a model value.
const port = Number(process.env.BENCH_PORT ?? 3000);
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`M0 bench: http://localhost:${port}\n`);
});
