import { afterEach, expect, it, vi } from "vitest";
import { privateModularInputs } from "../../src/presentation/private-test-inputs";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it("reports public missing inputs as NOT_TESTED, not a private pass", () => {
  vi.stubEnv("MODULAR_REQUIRE_PRIVATE", "0");
  const report = vi.spyOn(console, "info").mockImplementation(() => {});
  expect(
    privateModularInputs("control", ["/nonexistent/modular-test-input"]),
  ).toBe(false);
  expect(JSON.parse(report.mock.calls[0]![0])).toMatchObject({
    privateCoverage: "NOT_TESTED",
  });
});
it("required mode refuses a missing fixture and a missing library", () => {
  vi.stubEnv("MODULAR_REQUIRE_PRIVATE", "1");
  expect(() =>
    privateModularInputs("control", ["/nonexistent/modular-test-input"]),
  ).toThrow("Required private modular inputs missing");
  expect(() => privateModularInputs("control", [], false)).toThrow(
    "compatible installed candidate library",
  );
  expect(privateModularInputs("control", [])).toBe(true);
});
