import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A stored date reaches the player as "August 22, 2029", never as the
 * 2029-08-22 it is saved as. This catches the easy slip: a <time> element
 * that prints a date field straight from the record.
 */
const RAW_DATE_IN_TIME =
  /<time[^>]*>\{\s*[\w.!?]+(?:At|at|Date|date|On|on)\s*\}<\/time>/g;

function playerSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return playerSources(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("dates the player reads", () => {
  it("never print a stored date raw inside a <time> element", () => {
    const raw = playerSources("src/player").flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(RAW_DATE_IN_TIME)].map(
        (match) => `${file}: ${match[0]}`,
      ),
    );
    expect(raw).toEqual([]);
  });

  it("would catch the slip it is written for", () => {
    expect("<time>{entry.at}</time>".match(RAW_DATE_IN_TIME)).not.toBeNull();
    expect(
      "<time>{a.response!.occurredAt}</time>".match(RAW_DATE_IN_TIME),
    ).not.toBeNull();
  });
});
