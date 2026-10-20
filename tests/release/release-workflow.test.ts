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

function job(name: string, next?: string): string {
  const start = workflow.indexOf(`  ${name}:`);
  expect(start, `job '${name}' is missing`).toBeGreaterThan(-1);
  const end = next
    ? workflow.indexOf(`  ${next}:`, start + 1)
    : workflow.length;
  return workflow.slice(start, end);
}

describe("the release event", () => {
  it("runs on main pushes with a manual final drain", () => {
    expect(workflow).toContain("push:\n    branches: [main]");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("pull_request_target");
  });

  it("waits for a candidate still validating, never cancels one", () => {
    // Per job, not per workflow: a newer push waits behind building,
    // validation, publishing and packaging; GitHub keeps only the newest
    // pending run, so nothing is canceled and every run finishes.
    expect(workflow).not.toMatch(/^concurrency:/m);
    for (const [name, next] of [
      ["build_candidate", "validate_candidate"],
      ["validate_candidate", "publish_candidate"],
    ] as const) {
      const row = job(name, next);
      expect(row).toContain("group: release-main-validate");
      expect(row).toContain("cancel-in-progress: false");
    }
    for (const [name, next] of [
      ["publish_candidate", "desktop_package"],
      ["desktop_package", "desktop_publish"],
      ["desktop_publish", undefined],
    ] as const) {
      const row = job(name, next);
      expect(row).toContain("group: release-main-publish");
      expect(row).toContain("cancel-in-progress: false");
    }
  });

  it("cannot recursively release its own commit", () => {
    expect(workflow).toContain("[release-automation]");
    expect(workflow).toContain(
      "!contains(github.event.head_commit.message, '[release-automation]')",
    );
  });
});

describe("privilege separation", () => {
  const builder = job("build_candidate", "validate_candidate");
  const validator = job("validate_candidate", "publish_candidate");
  const publisher = job("publish_candidate", "desktop_package");
  const desktopPublisher = job("desktop_publish");

  it("keeps dependency and repository-code execution in read-only jobs", () => {
    expect(builder).toContain("permissions:\n      contents: read");
    expect(builder).toContain("run: npm ci");
    expect(builder).not.toContain("contents: write");
    expect(validator).toContain("permissions:\n      contents: read");
    expect(validator).toContain("persist-credentials: false");
    expect(validator).toContain("run: npm ci");
  });

  it("blocks on the client only: build, typecheck, release declarations", () => {
    // Owner, Oct 15, 2026: the release gate is the client's only. The unit
    // suite, zero dice and the golden path run on pull requests.
    const steps = [
      "run: npm run build",
      "run: npm run typecheck",
      "run: npm run release:check",
    ];
    for (const step of steps) expect(validator).toContain(step);
    expect(validator.match(/^\s+run: (npm|node|npx)\b.*$/gm)).toEqual(
      expect.arrayContaining(
        steps.map((step) => expect.stringContaining(step)),
      ),
    );
    expect(validator.match(/^\s+run: (npm|node|npx)\b/gm)).toHaveLength(
      steps.length + 1, // and `npm ci`
    );
    expect(workflow).not.toContain("vitest");
    expect(workflow).not.toContain("validate_candidate_unit");
    expect(publisher).toContain("needs.validate_candidate.result == 'success'");
  });

  it("validates exactly the bundled candidate commit in every job", () => {
    expect(validator).toContain('== "$BUNDLE_SHA256" ]]');
    expect(validator).toContain('git bundle verify "$bundle"');
    expect(validator).toContain(
      '[[ "$(git rev-parse refs/candidates/release)" == "$CANDIDATE_SHA" ]]',
    );
    expect(validator).toContain('git checkout -q --detach "$CANDIDATE_SHA"');
  });

  it("proves the built game carries the new version", () => {
    expect(validator).toContain("Prove the built game shows the new version");
    expect(validator).toContain(
      'grep -rqF "v${NEXT_VERSION}" dist/client/assets',
    );
  });

  it("gives write authority only to the minimal publisher", () => {
    // The candidate's publisher and the desktop release's; neither runs
    // repository code.
    expect(workflow.match(/contents: write/g)).toHaveLength(2);
    expect(publisher).toContain("contents: write");
    expect(desktopPublisher).toContain("contents: write");
    expect(desktopPublisher).not.toContain("actions/checkout");
    expect(desktopPublisher).not.toMatch(/run:\s+npm\b/);
    expect(publisher).toContain("actions: read");
    expect(publisher).toContain("needs.build_candidate.result == 'success'");
    expect(publisher).not.toContain("actions/checkout");
    expect(publisher).not.toContain("uses: actions/setup-node");
    expect(publisher).not.toMatch(/run:\s+npm\b/);
    expect(publisher).not.toMatch(/run:\s+node\b/);
    expect(publisher).not.toContain("scripts/release");
  });

  it("treats the candidate as data and rejects unexpected paths or modes", () => {
    expect(publisher).toContain('sha256sum "$bundle"');
    expect(publisher).toContain('git bundle verify "$bundle"');
    expect(publisher).toContain('== "3"');
    expect(publisher).toContain('[[ -f "$patch" && ! -L "$patch" ]]');
    expect(publisher).toContain("Candidate contains forbidden delta");
    expect(publisher).toContain('"${entry%% *}" == "100644"');
    expect(publisher).toContain("Unsafe candidate path");
    expect(publisher).toContain("declaration_deletes");
  });

  it("publishes only behind explicit repository activation", () => {
    expect(publisher).toContain("vars.RELEASE_AUTOMATION == 'enabled'");
    expect(validator).toContain("vars.RELEASE_AUTOMATION != 'enabled'");
  });
});

describe("exact validated candidate identity", () => {
  it("creates the commit, bundles it, and validates the bundled commit", () => {
    expect(
      stepIndex("Apply and create the candidate commit locally"),
    ).toBeLessThan(
      stepIndex("Package the candidate commit as inert Git object data"),
    );
    expect(
      stepIndex("Check out the exact candidate commit from its bundle"),
    ).toBeLessThan(stepIndex("Build the exact clean candidate commit"));
    expect(stepIndex("Build the exact clean candidate commit")).toBeLessThan(
      stepIndex("Prove validation did not change candidate identity"),
    );
    // Nothing publishes until the whole validation has passed.
    expect(job("publish_candidate")).toContain("- validate_candidate\n");
  });

  it("binds commit, tree, parent and bundle digest across jobs", () => {
    const publisher = job("publish_candidate");
    expect(workflow).toContain("candidate_sha");
    expect(workflow).toContain("candidate_tree");
    expect(workflow).toContain("bundle_sha256");
    expect(publisher).toContain(
      '"$(git show -s --format=%P "$CANDIDATE_SHA")" == "$SOURCE_SHA"',
    );
    expect(publisher).toContain(
      '"$(git rev-parse "${CANDIDATE_SHA}^{tree}")" == "$CANDIDATE_TREE"',
    );
    expect(publisher).toContain('target="$CANDIDATE_SHA"');
    expect(publisher).toContain('git push origin "${target}:refs/heads/main"');
    expect(publisher).not.toMatch(/git push[^\n]*(--force|\s"?\+)/);
  });

  it("lays the release onto a main that moved, touching only release files", () => {
    const publisher = job("publish_candidate");
    // Main moves every few minutes and a validated candidate takes far
    // longer, so a fast-forward-only publisher never published at all.
    expect(publisher).not.toContain(
      "main advanced before publication. Nothing was published",
    );
    // The delta is re-applied only when every path it touches is still
    // byte-identical to the validated parent.
    expect(publisher).toContain('"${SOURCE_SHA}:${path}"');
    expect(publisher).toContain('"${main_tip}:${path}"');
    expect(publisher).toContain(
      "main changed $path after the candidate was validated. Nothing was published",
    );
    expect(publisher).toContain('git commit-tree "$tree" -p "$main_tip"');
    // The laid commit changes exactly what the validated candidate changed.
    expect(publisher).toContain(
      '"$(git diff-tree --no-commit-id --name-status -r "$main_tip" "$target")"',
    );
    expect(publisher).toContain(
      '"$(git diff-tree --no-commit-id --name-status -r "$SOURCE_SHA" "$CANDIDATE_SHA")"',
    );
  });

  it("retries a lost race, and makes a permission failure a failure", () => {
    const publisher = job("publish_candidate");
    expect(publisher).toContain("for attempt in 1 2 3 4 5; do");
    expect(publisher).toContain(
      "main kept moving through five attempts. Nothing was published",
    );
    expect(publisher).toContain(
      "Publication failed while main had not moved. Nothing was published.",
    );
  });
});

describe("declaration enforcement wiring", () => {
  it("passes exact base, head and comparison mode in both workflows", () => {
    expect(workflow).toContain("npm run release:check --");
    expect(workflow).toContain('--base "$DECLARATION_BASE"');
    expect(workflow).toContain('--head "$SOURCE_SHA"');
    expect(workflow).toContain("--mode push");
    expect(validate).toContain("RELEASE_DECLARATION_BASE");
    expect(validate).toContain("RELEASE_DECLARATION_HEAD");
    expect(validate).toContain("RELEASE_DECLARATION_MODE");
  });
});

describe("this repository's own release truth", () => {
  it("passes the deterministic metadata check", () => {
    expect(check(process.cwd())).toEqual([]);
  }, 30_000);
});

describe("the plan the event reads", () => {
  it("returns a blocked plan as data rather than as a failure", () => {
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
  }, 30_000);
});
