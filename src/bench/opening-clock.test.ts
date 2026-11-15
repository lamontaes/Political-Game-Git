/**
 * On the opening evening the clock under the player's card reads the hour the
 * household gets home, the hour every talk, ask and scene of that evening is
 * told at, never 12:00 AM (Account lead, Nov 15: an ask on the opening night
 * opened "Late on January 20th." under a clock that read 12:00 AM). Place and
 * seed pinned: Mulford, Colorado, drawn once from all 56 with "opening-clock".
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { benchRequest } from "./handler";

const call = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: false,
  });
  const text =
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body).toString("utf8");
  expect(reply.status, `${method} ${path}: ${text.slice(0, 200)}`).toBe(200);
  return JSON.parse(text) as unknown;
};

it("the card's clock on the opening evening is the evening the household gets home", async () => {
  const place = drawPlace("opening-clock", "opening-clock");
  const where = `${place.name} (${place.key}), seed opening-clock`;
  const life = (await call(
    "POST",
    `/api/newlife?seed=${encodeURIComponent(place.seed)}&placeKey=${encodeURIComponent(place.key)}`,
  )) as { personId: string };
  const id = encodeURIComponent(life.personId);
  const opening = (await call("GET", `/api/opening?id=${id}`)) as {
    home?: { minuteOfDay: number };
  };
  const card = (await call("GET", `/api/card?id=${id}`)) as {
    at: { minuteOfDay: number };
  };
  expect(opening.home?.minuteOfDay, where).toBeGreaterThan(12 * 60);
  expect(card.at.minuteOfDay, where).toBe(opening.home!.minuteOfDay);
}, 60_000);
