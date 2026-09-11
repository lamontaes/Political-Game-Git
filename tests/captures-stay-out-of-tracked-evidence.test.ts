import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * An ordinary browser run does not rewrite tracked historical evidence.
 *
 * This exists because of a failure that reached a published head. Five capture
 * sites wrote screenshots straight into `docs/agent/evidence/...`, which is
 * tracked. Every suite run therefore rewrote identified historical captures as
 * a side effect, and it happened twice inside commits that declared something
 * else entirely — once "repair the four cases I broke", once "record the
 * browser attribution". The second is what failed the push-scope release
 * declaration gate: a range whose only changes were a report and a silently
 * redrawn PNG, with nothing declaring either.
 *
 * The damage is not the gate failure, it is the evidence. A capture that moves
 * without anyone saying so stops being evidence of the run it is named after,
 * and nobody notices, because a screenshot that changed by nineteen bytes looks
 * exactly like one that did not.
 *
 * The repository already refuses this at RUN time: `verify-evidence.ts` hashes
 * every tracked file under `docs/agent/evidence` before and after the suite and
 * throws "Ordinary browser tests modified historical evidence". That guard is
 * correct and stays. It has one blind spot, and the blind spot is what happened
 * here — it compares against the tree as it stands when the run starts, so
 * committing the drift makes the changed bytes the next run's baseline and the
 * guard goes quiet. Detection after the fact can be laundered by a commit;
 * a capture that was never authored at a tracked path cannot.
 *
 * So the rule is also structural: a capture goes to the run's own artifact
 * directory, and banking one into tracked evidence takes an explicit
 * environment gate and a commit that says so — the convention
 * `people-snapshot6` already established.
 *
 * The check is deliberately syntactic and reads the specs rather than running
 * them: a test that proved this by writing would have already done the damage
 * it is checking for. A gated spec still names its tracked directory, in a
 * constant and in the comment explaining the gate — what it never does is name
 * one as the literal destination of a write.
 */
describe("browser captures", () => {
  const specDirectory = resolve(import.meta.dirname, "..", "tests", "e2e");
  const TRACKED_EVIDENCE = /["'`]docs\/(?:agent|plans)\//;
  const WRITES = /\bscreenshot\(|\bwriteFileSync\(|\bcopyFileSync\(/;

  it("never write to a tracked evidence path named at the write itself", () => {
    const specs = readdirSync(specDirectory).filter((name) =>
      name.endsWith(".spec.ts"),
    );
    expect(specs.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const spec of specs) {
      const lines = readFileSync(resolve(specDirectory, spec), "utf8").split(
        "\n",
      );
      /*
       * Scan forward from each write call to the end of its argument list
       * rather than looking back a fixed number of lines. A comment explaining
       * the destination sits between the call and its `path:` option, and a
       * fixed window silently steps over it — which this check did on its first
       * draft, passing a deliberately reintroduced offender.
       */
      lines.forEach((line, index) => {
        if (!WRITES.test(line)) return;
        let depth = 0;
        for (let cursor = index; cursor < lines.length; cursor++) {
          const current = lines[cursor] ?? "";
          if (TRACKED_EVIDENCE.test(current)) {
            offenders.push(`${spec}:${cursor + 1}: ${current.trim()}`);
            break;
          }
          depth += (current.match(/\(/g) ?? []).length;
          depth -= (current.match(/\)/g) ?? []).length;
          if (cursor > index && depth <= 0) break;
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
