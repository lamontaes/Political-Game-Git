import { describe, expect, it } from "vitest";
import baseline from "./pieces-one-place-baseline.json";
import { ALLOWED, copies, type Kind } from "./pieces-one-place-scan";

/**
 * The small pieces of a sentence are built in one place (CTO's story audit,
 * Nov 26, rows C1 to C6; owner, Nov 26: "It's all just going to be called story
 * now"). A person's name, a pronoun and a date are each said by one function
 * in src/english, and every other file asks it:
 *  - a person's name: said-as.ts (`personSlot`, `nameOnceThen`, `saidAs`);
 *  - a pronoun: said-as.ts and pronoun-words.ts (the owner: "avoid the
 *    pronoun or use the person's own", so never by gender alone);
 *  - a date: day-words.ts for speech ("June 7th"), plain-words.mjs for
 *    print ("June 7").
 *
 * A copy outside those files (`${x.givenName} ${x.familyName}`, a gender
 * ternary that picks "he" or "her", a month list or `toLocaleDateString`) is
 * counted per file in pieces-one-place-baseline.json. The count only shrinks:
 * fixing a copy means calling the one function, then lowering the number.
 *
 * Scope: the files that make words, src/director, src/english and src/bench.
 * The world's engines in src/core2 write records, and a record's own name
 * field is data, not a sentence.
 */

describe("a person's name, pronoun and date are built in one place", () => {
  const known = baseline.copies as Record<string, Record<string, number>>;
  const found = copies();

  it("finds the copies it is written to find", () => {
    const sample = copies(["a.ts"], () =>
      [
        "const a = `${p.givenName} ${p.familyName}`;",
        'const b = p.gender === "female" ? "her" : "their";',
        'const c = new Date(x).toLocaleDateString("en-US");',
      ].join("\n"),
    );
    expect(sample["a.ts"]).toEqual({ name: 1, pronoun: 1, date: 1 });
  });

  it("builds no further copy than before", () => {
    const over = Object.entries(found).flatMap(([file, kinds]) =>
      Object.entries(kinds)
        .filter(([kind, n]) => n > (known[file]?.[kind] ?? 0))
        .map(
          ([kind, n]) =>
            `${file}: ${n} ${kind} copies, ${known[file]?.[kind] ?? 0} known. Call ${ALLOWED[kind as Kind].join(" or ")} instead.`,
        ),
    );
    expect(over).toEqual([]);
  });

  it("only shrinks: lowers a count or drops a file as soon as it is fixed", () => {
    const stale = Object.entries(known).flatMap(([file, kinds]) =>
      Object.entries(kinds)
        .filter(([kind, n]) => (found[file]?.[kind] ?? 0) < n)
        .map(
          ([kind, n]) =>
            `${file}: lower ${kind} ${n} to ${found[file]?.[kind] ?? 0}`,
        ),
    );
    expect(
      stale,
      "edit tests/guards/english/pieces-one-place-baseline.json",
    ).toEqual([]);
  });
});
