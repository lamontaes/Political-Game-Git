/**
 * Dev mode in the installed game (owner, Nov 26: "dev mode is a part of the game... It just has different
 * permissions"). The play server is asked as the desktop app asks it, with the developer's build route
 * off. Dev mode's routes refuse until the page tells the server the in-game setting is on, then answer
 * through the same engines; what dev mode does is never recorded as a move of the life, so a saved life
 * loads the same with the setting on or off.
 */
import { randomBytes } from "node:crypto";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  benchRequest,
  benchWorld,
  emptyBench,
  saveLifeNow,
} from "../../../src/bench/handler";

// Any town will do: the seed is drawn, named in the title and replayed with DEV_MODE_SEED. The world is built twice.
const SEED = process.env.DEV_MODE_SEED ?? randomBytes(4).toString("hex");

const ask = async (method: string, path: string, body?: unknown) => {
  const reply = await benchRequest(
    method,
    new URL(path, "http://bench"),
    { developer: false },
    body === undefined ? "" : JSON.stringify(body),
  );
  return {
    status: reply.status,
    value: JSON.parse(String(reply.body)) as Record<string, unknown>,
  };
};

it(`dev mode answers only while the setting is on, and a saved life loads the same, seed ${SEED}`, async () => {
  const folder = (process.env.OCD_SAVE_DIR = mkdtempSync(
    join(tmpdir(), "dev-mode-installed-"),
  ));
  expect((await ask("POST", `/api/newlife?seed=${SEED}`)).status).toBe(200);

  // Off: refused, and the world is as it was.
  const date = benchWorld().core!.date;
  const closed = await ask("POST", "/api/dev/advance", { step: "day" });
  expect(closed.status).toBe(403);
  expect(benchWorld().core!.date).toBe(date);

  // On: the control's body reaches dev mode's own advance.
  expect((await ask("POST", "/api/devmode?on=1")).value).toEqual({ on: true });
  const opened = await ask("POST", "/api/dev/advance", { step: "day" });
  expect(opened.status, JSON.stringify(opened.value)).toBe(200);
  expect(benchWorld().core!.date).not.toBe(date);

  // A day the player plays after it, as the Stop control leaves it.
  const packet = (await ask("POST", "/api/advance?mode=day")).value.packet as
    { kind?: string; pauseId?: string } | undefined;
  if (packet?.pauseId && packet.kind !== "complete" && packet.kind !== "choice")
    await ask(
      "POST",
      `/api/resume?pauseId=${encodeURIComponent(packet.pauseId)}`,
    );

  // Dev mode's days are not a move of the life: its save holds the player's moves and no dev request.
  const save = saveLifeNow()!;
  expect(
    save.commands.filter((command) =>
      JSON.stringify(command.payload).includes("/api/dev"),
    ),
  ).toEqual([]);
  const live = benchWorld().core!.date;

  // Proofs go in a folder of the saves folder, which the list of lives never reads.
  const proof = await ask("POST", "/api/dev/proof/save", {});
  expect(proof.status).toBe(200);
  expect(readdirSync(join(folder, "dev-mode", "proofs"))).toHaveLength(1);

  // A restart and a load: the life replays without dev mode's days and without a failure.
  const personId = benchWorld().player!.personId!;
  emptyBench();
  const title = (await ask("GET", "/api/title")).value as {
    saves: { saveId: string }[];
  };
  expect(title.saves).toHaveLength(1);
  const loaded = await ask(
    "POST",
    `/api/load?save=${encodeURIComponent(title.saves[0]!.saveId)}`,
  );
  expect(loaded.status, JSON.stringify(loaded.value)).toBe(200);
  expect(benchWorld().player!.personId).toBe(personId);
  // SG-SCREENS-dev-days-not-saved: what dev mode moved is not in the life's save, so the load is the life
  // as it was played without it (one day behind the live one here). When dev mode's moves are saved, this
  // becomes the day the life left off.
  process.stdout.write(
    `dev mode, seed ${SEED}: live ${live}, loaded ${benchWorld().core!.date}, skipped ${JSON.stringify(loaded.value.skipped ?? null)}\n`,
  );
  expect(benchWorld().core!.date).not.toBe(live);
}, 240_000);
