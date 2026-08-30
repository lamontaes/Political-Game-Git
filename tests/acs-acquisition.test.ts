import { describe, it, expect, vi } from "vitest";
import { acquireAcsStateArchive } from "../src/data/acs/acquisition";

vi.mock("node:https", () => ({
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (url: string, callback: any) => {
      const res = {
        statusCode: 200,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on: (event: string, handler: any) => {
          if (event === "data") handler(Buffer.from("dummy-data"));
          if (event === "end") handler();
          return res;
        },
      };
      setTimeout(() => callback(res), 10);
      return { on: () => {} };
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (url: string, callback: any) => {
    const res = {
      statusCode: 200,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (event: string, handler: any) => {
        if (event === "data") handler(Buffer.from("dummy-data"));
        if (event === "end") handler();
        return res;
      },
    };
    setTimeout(() => callback(res), 10);
    return { on: () => {} };
  },
}));

vi.mock("node:fs", () => ({
  default: {
    createWriteStream: () => ({
      write: () => {},
      end: () => {},
    }),
    statSync: () => ({ size: 100 }),
  },
  createWriteStream: () => ({
    write: () => {},
    end: () => {},
  }),
  statSync: () => ({ size: 100 }),
}));

describe("ACS PUMS Acquisition", () => {
  it("downloads and hashes state archives", async () => {
    const manifest = await acquireAcsStateArchive("ky", 2024, "/tmp");
    expect(manifest.state).toBe("ky");
    expect(manifest.vintageYear).toBe(2024);
    expect(manifest.housingHash).toBeDefined();
    expect(manifest.personHash).toBeDefined();
  });
});
