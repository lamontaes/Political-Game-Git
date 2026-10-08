import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { World, EntityId } from "../simulation";
import type { WorkPendingEntry } from "../simulation/time-work";
const readers = vi.hoisted(() => ({
  pending: vi.fn(),
  passed: vi.fn(),
  status: vi.fn(),
  role: vi.fn(),
  path: vi.fn(),
  eligible: vi.fn(),
}));
vi.mock("../simulation", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  workPendingEntriesFor: readers.pending,
  workItemOccasionHasPassed: readers.passed,
}));
vi.mock("../simulation/life-queries", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  workStatusAt: readers.status,
  workRoleAt: readers.role,
}));
vi.mock("../simulation/life-paths2", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  pathForRelationship: readers.path,
}));
vi.mock("../simulation/career-path7", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  careerEligibility: readers.eligible,
}));
import { WorkWorkspace } from "./ShellWorkspaces";
import { CAREER_PROVIDERS } from "../presentation/career-path7-provider";
const personId = "test:person" as EntityId;
const world = {
  control: { kind: "person", personId },
  history: { workRelationships: [], scheduledActivities: [] },
} as unknown as World;
const entry = (group: WorkPendingEntry["group"]) =>
  ({
    group,
    item: { id: "test:work", title: "Recorded task" },
  }) as WorkPendingEntry;
const render = () =>
  renderToStaticMarkup(
    <WorkWorkspace
      world={world}
      personId={personId}
      onWorldChange={() => undefined}
    >
      <p>Existing work records</p>
    </WorkWorkspace>,
  );
beforeEach(() => {
  readers.pending.mockReturnValue([]);
  readers.passed.mockReturnValue(false);
  readers.status.mockReturnValue(undefined);
  readers.role.mockReturnValue(undefined);
  readers.path.mockReturnValue(null);
  readers.eligible.mockReturnValue(null);
});
it("offers recorded career tasks in the live Work activity list", () => {
  const relationshipId = "test:work-relationship" as EntityId;
  (
    world as {
      history: { workRelationships: unknown[]; scheduledActivities: unknown[] };
    }
  ).history.workRelationships = [{ id: relationshipId, personId }];
  readers.status.mockReturnValue({ status: "active" });
  readers.role.mockReturnValue({ title: "Shop assistant" });
  readers.path.mockReturnValue({ id: "shop-assistant" });
  const html = render();
  expect(html).toContain('aria-label="Shop assistant"');
  expect(html).toContain('data-testid="schedule-career-task"');
  expect(html).toContain("Continue");
  expect(html).toContain(
    CAREER_PROVIDERS.find((provider) => provider.pathId === "shop-assistant")!
      .tasks[0]!.text,
  );
});
it("keeps other records without a decision heading when staff handle the pending work", () => {
  readers.pending.mockReturnValue([entry("staff-handling")]);
  const html = render();
  expect(html).not.toContain("Waiting on you");
  expect(html).not.toContain("Nothing needs a decision");
  expect(html).not.toContain('data-testid="work-empty"');
  expect(html).toContain("Existing work records");
});
it("shows an actual outstanding decision from its record", () => {
  readers.pending.mockReturnValue([entry("needs-you")]);
  const html = render();
  expect(html).not.toContain("Waiting on you");
  expect(html).toContain("Recorded task");
  expect(html).toContain("Existing work records");
});
it("omits the heading after the recorded occasion passed", () => {
  readers.pending.mockReturnValue([entry("needs-you")]);
  readers.passed.mockReturnValue(true);
  expect(render()).not.toContain("Waiting on you");
});
it("retains the empty-work message when there are no pending records", () => {
  expect(render()).toContain('data-testid="work-empty"');
  expect(render()).toContain("Existing work records");
});
