import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RuntimeArtIncompleteError,
  initializeRuntimeArt,
  requiredRuntimeArtMetadata,
  runtimeArt,
  runtimeArtMetadata,
  runtimeArtSelection,
  runtimeArtUrls,
} from "./runtime-art";

const ID = "a".repeat(64);
const SHA = "b".repeat(64);

function snapshot(metadata: Record<string, object> = {}) {
  return {
    schema: "ocd-runtime-art/v1",
    id: ID,
    files: [
      {
        path: "art/generated/approved/pg-modular/example.png",
        sha256: SHA,
        mime: "image/png",
        bytes: 12,
      },
    ],
    metadata,
  };
}

function respond(
  body: unknown,
  { status = 200, json = true }: { status?: number; json?: boolean } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(
      json
        ? { "content-type": "application/json" }
        : { "content-type": "text/html" },
    ),
    json: async () => body,
  } as unknown as Response;
}

/** The page's origin, which is the whole question this module got wrong. */
function pageOn(protocol: string) {
  vi.stubGlobal("window", { location: { protocol } });
}

describe("ART-SOURCE1: the artwork snapshot loads on every origin that carries one", () => {
  beforeEach(() => {
    delete globalThis.__ocdRuntimeArt;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete globalThis.__ocdRuntimeArt;
  });

  for (const protocol of ["app:", "http:", "https:"]) {
    it(`selects the snapshot served on ${protocol}`, async () => {
      pageOn(protocol);
      const fetched = vi.fn(async () => respond(snapshot()));
      vi.stubGlobal("fetch", fetched);

      await initializeRuntimeArt();

      expect(fetched).toHaveBeenCalledWith("/__content/manifest.json", {
        cache: "no-store",
      });
      expect(runtimeArt()?.id).toBe(ID);
      expect(runtimeArtSelection()).toBe("installed-snapshot");
    });
  }

  it("addresses every file in the snapshot by its own content hash", async () => {
    pageOn("http:");
    vi.stubGlobal("fetch", async () => respond(snapshot()));

    await initializeRuntimeArt();

    expect(
      runtimeArtUrls()["art/generated/approved/pg-modular/example.png"],
    ).toBe(`/__content/${ID}/${SHA}`);
  });

  it("stays on the bundled art when a browser origin mounts no snapshot", async () => {
    pageOn("http:");
    vi.stubGlobal("fetch", async () => respond("not found", { status: 404 }));

    await initializeRuntimeArt();

    expect(runtimeArt()).toBeUndefined();
    expect(runtimeArtSelection()).toBe("bundled-fallback");
    expect(runtimeArtUrls()).toEqual({});
  });

  it("does not mistake a dev server's history fallback for a snapshot", async () => {
    // Vite answers an unknown path with the application's own index.html and a
    // 200. Parsed as a manifest that is not a 404, and it is not artwork.
    pageOn("http:");
    vi.stubGlobal("fetch", async () =>
      respond("<!doctype html>", { json: false }),
    );

    await initializeRuntimeArt();

    expect(runtimeArt()).toBeUndefined();
  });

  it("refuses a required snapshot the origin cannot supply", async () => {
    pageOn("http:");
    vi.stubGlobal("fetch", async () =>
      respond("<!doctype html>", { json: false }),
    );

    await expect(initializeRuntimeArt(true)).rejects.toThrow(
      /could not be loaded/,
    );
  });

  it("refuses an incompatible snapshot rather than composing from it", async () => {
    pageOn("https:");
    vi.stubGlobal("fetch", async () =>
      respond({ ...snapshot(), schema: "something-else" }),
    );

    await expect(initializeRuntimeArt()).rejects.toThrow(/incompatible/);
    expect(runtimeArt()).toBeUndefined();
  });

  it("has nothing to fetch outside a page", async () => {
    vi.stubGlobal("window", undefined);
    await expect(initializeRuntimeArt()).resolves.toBeUndefined();
    await expect(initializeRuntimeArt(true)).rejects.toThrow(/requires/);
  });
});

describe("ART-SOURCE1: a selected snapshot answers alone", () => {
  afterEach(() => {
    delete globalThis.__ocdRuntimeArt;
  });

  it("names what is missing instead of reaching into the bundled art", () => {
    globalThis.__ocdRuntimeArt = snapshot({
      "art/manifest/character_catalog.json": { assets: [] },
    }) as never;

    expect(
      requiredRuntimeArtMetadata("art/manifest/character_catalog.json", {
        assets: ["bundled"],
      }),
    ).toEqual({ assets: [] });

    expect(() =>
      requiredRuntimeArtMetadata(
        "art/manifest/character_candidate_kit41_registry.json",
        {
          assets: ["bundled"],
        },
      ),
    ).toThrow(RuntimeArtIncompleteError);
  });

  it("keeps the bundled default for a public checkout with no snapshot", () => {
    expect(
      requiredRuntimeArtMetadata("art/manifest/character_catalog.json", {
        assets: ["bundled"],
      }),
    ).toEqual({ assets: ["bundled"] });
    // An optional record is still optional; this is the contrast that matters.
    expect(runtimeArtMetadata("art/manifest/absent.json", null)).toBeNull();
  });
});
