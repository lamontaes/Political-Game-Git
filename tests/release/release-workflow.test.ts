/**
 * The safeguards that live in the event definition rather than in the updater.
 *
 * The updater's behaviour is proved elsewhere against real trees; what is left
 * here is what only the workflow can state — which token it uses, what it is
 * allowed to do with it, in what order it validates, and what it refuses to
 * treat as a trigger.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { check, main } from "../../scripts/release/cli";
import { declarationText, makeFixture } from "./fixtures";

const workflow = readFileSync(".github/workflows/release.yml", "utf8");
const validate = readFileSync(".github/workflows/validate.yml", "utf8");

function stepIndex(name: string): number {
  const at = workflow.indexOf(`- name: ${name}`);
  expect(at, `step '${name}' is missing`).toBeGreaterThan(-1);
  return at;
}

describe("the release event", () => {
  it("runs on merges to main, not on branches or pull requests", () => {
    expect(workflow).toContain("push:\n    branches: [main]");
    expect(workflow).not.toContain("pull_request");
  });

  it("serializes releases without discarding one", () => {
    expect(workflow).toContain("group: release-main");
    expect(workflow).toContain("cancel-in-progress: false");
  });

  it("cannot trigger itself", () => {
    // GitHub does not raise workflow-triggering events for pushes made with the
    // default GITHUB_TOKEN. The subject guard is the second line of defence.
    expect(workflow).toContain("[release-automation]");
    expect(workflow).toContain(
      "!contains(github.event.head_commit.message, '[release-automation]')",
    );
  });

  it("has a manual drain for a run whose push was refused", () => {
    expect(workflow).toContain("workflow_dispatch:");
  });
});

describe("permission scope", () => {
  it("defaults to read and grants write to the release job only", () => {
    const top = workflow.slice(0, workflow.indexOf("jobs:"));
    expect(top).toContain("permissions:\n  contents: read");
    const job = workflow.slice(workflow.indexOf("jobs:"));
    expect(job).toMatch(/permissions:\n(?:\s*#.*\n)*\s+contents: write/);
  });

  it("never runs on a pull request's code with the privileged token", () => {
    expect(workflow).not.toContain("pull_request_target");
    // Untrusted contributions stay on the read-only validation workflow.
    expect(validate).toContain("permissions:\n  contents: read");
    expect(validate).toContain("pull_request:");
  });

  it("publishes only behind an explicit repository-level enablement", () => {
    expect(workflow).toContain("vars.RELEASE_AUTOMATION == 'enabled'");
    expect(workflow).toContain("vars.RELEASE_AUTOMATION != 'enabled'");
  });
});

describe("what the version describes is what was validated", () => {
  it("validates after applying the release, and publishes after validating", () => {
    expect(stepIndex("Apply the release to the working tree")).toBeLessThan(
      stepIndex("Validate the released tree"),
    );
    expect(stepIndex("Validate the released tree")).toBeLessThan(
      stepIndex("Publish the release commit"),
    );
  });

  it("publishes with one push, so a refused push publishes nothing", () => {
    const publish = workflow.slice(stepIndex("Publish the release commit"));
    expect(publish.match(/git push/g)).toHaveLength(1);
    expect(publish).toContain("main advanced during this run");
  });

  it("fails loudly on a blocked release instead of publishing part of it", () => {
    const blocked = workflow.slice(stepIndex("Report a blocked release"));
    expect(blocked).toContain("Nothing was published");
    expect(blocked).toContain("exit 1");
  });
});

describe("this repository's own release truth", () => {
  it("passes the check that npm run validate runs", () => {
    expect(check(process.cwd())).toEqual([]);
  });
});

describe("the plan the event reads", () => {
  it("returns a blocked plan as data rather than as a failure", () => {
    // The workflow reads this JSON and then reports the block itself. If the
    // read failed, the run would stop before it could say why.
    const fixture = makeFixture({
      asRepository: true,
      declarations: {
        "b-feature": declarationText({
          id: "b-feature",
          impact: "minor",
          section: "Added",
          title: "A feature.",
          body: "Something new.",
        }),
      },
    });
    try {
      expect(main(["preview", "--json"], fixture.root)).toBe(0);
      expect(main(["preview"], fixture.root)).toBe(1);
    } finally {
      fixture.dispose();
    }
  });
});
