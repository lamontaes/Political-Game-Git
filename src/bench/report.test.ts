import { beforeEach, expect, it } from "vitest";
import { benchRequest } from "./handler";
import { clearProblems } from "./report";

// "Report a bug": the report is shown before anything is sent, a failed
// request is in it, it holds nothing about the player's people, and sending
// is a separate act.
const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(`http://game${path}`), {
    developer: false,
  });
  return {
    status: reply.status,
    body: JSON.parse(String(reply.body)) as Record<string, unknown>,
  };
};

beforeEach(clearProblems);

it("shows what would be sent without sending, and notes a failed request", async () => {
  const empty = await ask("GET", "/api/report");
  expect(empty.status).toBe(200);
  expect(empty.body.problems).toEqual([]);
  // A request that fails (no resident chosen) is a problem in the report.
  const failed = await ask("POST", "/api/office/interview-outlet?outletId=x");
  expect(failed.status).toBe(400);
  const shown = await ask("GET", "/api/report");
  expect(
    (shown.body.problems as { route: string }[]).map((p) => p.route),
  ).toEqual(["/api/office/interview-outlet"]);
  // Looking again changes nothing: it is a read.
  expect((await ask("GET", "/api/report")).body).toEqual(shown.body);
});

it("sends only on the player's own act, as a named file", async () => {
  const sent = await ask("POST", "/api/report/send");
  expect(sent.status).toBe(200);
  expect(sent.body.file).toMatch(/^bug-report-\d{4}-\d{2}-\d{2}\.json$/);
  expect(Object.keys(sent.body.report as object).sort()).toEqual([
    "gameDate",
    "placeKey",
    "problems",
  ]);
  // A GET never sends.
  expect((await ask("GET", "/api/report/send")).status).toBe(404);
});
