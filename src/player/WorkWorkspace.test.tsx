import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { World, EntityId } from "../simulation";
import type { WorkPendingEntry } from "../simulation/time-work";
const readers = vi.hoisted(() => ({ pending: vi.fn(), passed: vi.fn() }));
vi.mock("../simulation", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  workPendingEntriesFor: readers.pending,
  workItemOccasionHasPassed: readers.passed,
}));
import { WorkWorkspace } from "./ShellWorkspaces";
const world = {} as World;
const personId = "test:person" as EntityId;
const entry = (group: WorkPendingEntry["group"]) =>
  ({
    group,
    item: { id: "test:work", title: "Recorded task" },
  }) as WorkPendingEntry;
const render = () =>
  renderToStaticMarkup(
    <WorkWorkspace world={world} personId={personId}>
      <p>Existing work records</p>
    </WorkWorkspace>,
  );
beforeEach(() => {
  readers.pending.mockReturnValue([]);
  readers.passed.mockReturnValue(false);
});
it("keeps other records without a decision heading when staff handle the pending work", () => {
  readers.pending.mockReturnValue([entry("staff-handling")]);
  const html = render();
  expect(html).not.toContain("Waiting on you");
  expect(html).not.toContain("Nothing needs a decision");
  expect(html).not.toContain('data-testid="work-empty"');
  expect(html).toContain("Existing work records");
});
it("shows an actual outstanding decision", () => {
  readers.pending.mockReturnValue([entry("needs-you")]);
  const html = render();
  expect(html).toContain("Waiting on you");
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
