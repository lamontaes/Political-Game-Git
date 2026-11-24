import { describe, expect, it } from "vitest";
import {
  classifyKind,
  ownerOf,
  renderReport,
  summarize,
} from "./stopgaps-report.mjs";

const row = (id: string, kind: string, status = "open") => ({
  id,
  kind,
  status,
});

describe("stopgaps report", () => {
  it("groups open rows by owner prefix and kind, skipping resolved ones", () => {
    const rows = [
      row("SG-GOV-a", "faked-mechanic"),
      row("SG-GOV-b", "uncalibrated-tunable"),
      row("SG-GOV-c", "faked-mechanic", "resolved"),
      row("SG-P8-d", "player-text-gap"),
    ];
    const s = summarize(rows);
    expect(s.open).toBe(3);
    expect(s.resolved).toBe(1);
    expect(s.owners.get("GOV")?.get("behavior")).toHaveLength(1);
    expect(s.owners.get("GOV")?.get("figure")).toHaveLength(1);
    expect(s.owners.get("P8")?.get("text")).toHaveLength(1);
  });

  it("reports a row with no owner or no clear kind as such", () => {
    expect(ownerOf({ id: "loose-id" })).toBe("unowned");
    expect(classifyKind({ kind: "" })).toBe("unclassified");
    expect(classifyKind({ kind: "zzz-unknown" })).toBe("unclassified");
    const text = renderReport([row("loose", "zzz-unknown")]);
    expect(text).toContain("### unowned (1)");
    expect(text).toContain("**unclassified** (1): loose");
  });

  it("counts a row with no status as open and says so", () => {
    const text = renderReport([{ id: "SG-CORE-x", kind: "faked-mechanic" }]);
    expect(text).toContain("Open stand-ins: 1");
    expect(text).toContain("1 with no status counted as open");
  });
});
