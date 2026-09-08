import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  sceneReferenceCorpus as seed,
  assertReferenceCatalog,
  parseReferenceCatalog,
  serializeReferenceCatalog,
  resolveVenueReferences,
  classifyVenueTopology,
} from "./index";
import type { ReferenceCatalog, SourceClaim } from "./types";

const copy = (): ReferenceCatalog => structuredClone(seed);
const query = (jurisdiction: string, options = {}) =>
  resolveVenueReferences(seed, {
    date: "2026-06-01",
    jurisdictionId: `jurisdiction.us.${jurisdiction}`,
    ...options,
  });

describe("bounded production scene-reference corpus", () => {
  it("validates authored identity and source links and covers contrasting jurisdictions", () => {
    expect(() => assertReferenceCatalog(seed)).not.toThrow();
    for (const state of [
      "ky",
      "va",
      "tn",
      "ca",
      "mn",
      "tx",
      "ny",
      "nd",
      "ne",
      "nm",
    ])
      expect(query(state).length).toBeGreaterThan(0);
    expect(seed.coverage.kind).toBe("bounded");
    expect(seed.sources.every((s) => s.rights === "unknown")).toBe(true);
  });
  it("routes Kentucky 2026 floor references to temporary chambers and reports closed historic rooms", () => {
    for (const body of ["house", "senate"]) {
      const found = query("ky", {
        institutionId: `institution.us.ky.${body}`,
        sceneType: "scene.chamber",
      });
      expect(
        found
          .filter((r) => r.availability === "available")
          .map((r) => r.venue.id),
      ).toEqual([`venue.us.ky.temporary.${body}`]);
      expect(
        found.find((r) => r.venue.id === `venue.us.ky.capitol.${body}`)
          ?.reasons,
      ).toContain("construction");
    }
    expect(
      query("ky", {
        officeRole: "role.governor",
        sceneType: "scene.working-office",
      }).map((r) => r.venue.buildingId),
    ).toEqual(["building.us.ky.high-street"]);
    expect(
      query("ky", {
        officeRole: "role.member",
        sceneType: "scene.working-office",
      }).every((r) => r.venue.buildingId === "building.us.ky.annex"),
    ).toBe(true);
    expect(
      query("ky", { sceneType: "scene.livestream-viewing" }).every(
        (r) => r.venue.roomId === null,
      ),
    ).toBe(true);
  });
  it("uses inclusive historical boundaries without inventing a reopening or extrapolating 2026", () => {
    const q = {
      jurisdictionId: "jurisdiction.us.ky",
      institutionId: "institution.us.ky.house",
      sceneType: "scene.chamber",
    };
    const before = resolveVenueReferences(seed, { ...q, date: "2025-08-19" });
    expect(
      before
        .filter((r) => r.availability === "available")
        .map((r) => r.venue.id),
    ).toEqual(["venue.us.ky.capitol.house"]);
    expect(
      resolveVenueReferences(seed, { ...q, date: "2025-08-20" }).filter(
        (r) => r.availability === "available",
      ),
    ).toEqual([]);
    expect(resolveVenueReferences(seed, { ...q, date: "2030-01-01" })).toEqual(
      [],
    );
    expect(() =>
      resolveVenueReferences(seed, { ...q, date: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      resolveVenueReferences(seed, { ...q, date: "2026-2-03" }),
    ).toThrow();
  });
  it("selects Minnesota Centennial and Senate Building while retaining State Office closure", () => {
    expect(
      query("mn", {
        institutionId: "institution.us.mn.house",
        sceneType: "scene.working-office",
      })
        .filter((r) => r.availability === "available")
        .map((r) => r.venue.buildingId),
    ).toEqual(["building.us.mn.centennial"]);
    expect(
      query("mn", {
        institutionId: "institution.us.mn.senate",
        sceneType: "scene.working-office",
      }).map((r) => r.venue.buildingId),
    ).toEqual(["building.us.mn.senate-building"]);
    const closed = query("mn").find(
      (r) => r.venue.buildingId === "building.us.mn.state-office",
    )!;
    expect(closed.availability).toBe("unavailable");
    expect(closed.era!.effective.end).toBeNull();
    expect(
      query("mn", { sceneType: "scene.hearing" })[0]!.era!.securityState,
    ).toBe("screening");
  });
  it("does not turn ceremonial or residence spaces into daily working offices", () => {
    expect(
      query("va", {
        officeRole: "role.governor",
        sceneType: "scene.working-office",
      }).map((r) => r.venue.buildingId),
    ).toEqual(["building.us.va.patrick-henry"]);
    expect(
      query("va", {
        officeRole: "role.governor",
        sceneType: "scene.residence",
      }).map((r) => r.venue.buildingId),
    ).toEqual(["building.us.va.executive-mansion"]);
    expect(
      query("tx", { sceneType: "scene.working-office" }).some(
        (r) => r.venue.id === "venue.us.tx.capitol.reception",
      ),
    ).toBe(false);
    const c = copy();
    const ceremonial = c.scenes.find(
      (s) => s.venueId === "venue.us.tx.capitol.reception",
    )!;
    ceremonial.sceneType = "scene.working-office";
    expect(
      resolveVenueReferences(c, {
        date: "2026-06-01",
        sceneType: "scene.working-office",
      }).find((r) => r.venue.id === ceremonial.venueId)!.reasons,
    ).toContain("ceremonial-only");
  });
  it("retains named North Dakota rooms and never creates a Nebraska House/Senate from table columns", () => {
    expect(
      seed.rooms.find((r) => r.id === "room.us.nd.capitol.peace-garden")!
        .verifiedName,
    ).toBe("Peace Garden Room");
    expect(
      seed.rooms.find((r) => r.id === "room.us.nd.capitol.brynhild-haugland")!
        .verifiedName,
    ).toBe("Brynhild Haugland Room");
    expect(
      query("ne", { sceneType: "scene.chamber" }).map(
        (r) => r.scene.institutionId,
      ),
    ).toEqual(["institution.us.ne.legislature"]);
  });
  it("keeps the six federal building families architecturally distinct and unassigned to occupants", () => {
    const results = query("federal", { sceneType: "scene.working-office" });
    const buildings = results.map((r) =>
      seed.buildings.find((b) => b.id === r.venue.buildingId)!,
    );
    expect(buildings.map((b) => b.name).sort()).toEqual([
      "Cannon House Office Building",
      "Dirksen Senate Office Building",
      "Hart Senate Office Building",
      "Longworth House Office Building",
      "Rayburn House Office Building",
      "Russell Senate Office Building",
    ]);
    expect(new Set(buildings.map((b) => b.assetFamily)).size).toBe(6);
    expect(new Set(buildings.map((b) => b.baseGeometryFamily)).size).toBe(6);
    expect(
      results.every(
        (r) =>
          r.venue.roomId === null && r.scene.assignment === "building-family",
      ),
    ).toBe(true);
  });
  it("preserves meeting-specific evidence as a date-specific reference, not a permanent body occupant", () => {
    const meetingId = "meeting.us.nm.house-appropriations-finance.2025-03-08";
    expect(
      resolveVenueReferences(seed, { date: "2025-03-08", meetingId }).map(
        (r) => r.venue.roomId,
      ),
    ).toEqual(["room.us.nm.capitol.room-307"]);
    expect(
      resolveVenueReferences(seed, { date: "2026-03-08", meetingId }),
    ).toEqual([]);
    expect(
      resolveVenueReferences(seed, {
        date: "2025-03-08",
        jurisdictionId: "jurisdiction.us.nm",
      }),
    ).toEqual([]);
  });
});

describe("topology and institutional identity", () => {
  it("distinguishes same room, same building, same campus and off-campus", () => {
    const v = "venue.us.ky.capitol.house";
    expect(classifyVenueTopology(seed, v, v)).toBe("same-room");
    expect(classifyVenueTopology(seed, v, "venue.us.ky.capitol.senate")).toBe(
      "same-building",
    );
    expect(
      classifyVenueTopology(seed, v, "venue.us.ky.annex.house-office"),
    ).toBe("same-campus-different-building");
    expect(classifyVenueTopology(seed, v, "venue.us.ky.governor.working")).toBe(
      "off-campus",
    );
    expect(
      classifyVenueTopology(
        seed,
        "venue.us.congress.cannon.office",
        "venue.us.congress.cannon.office",
      ),
    ).toBe("same-building");
    expect(() => classifyVenueTopology(seed, v, "venue.missing")).toThrow();
  });
  it("keeps unknown campus membership unknown", () => {
    const c = copy();
    c.buildings.find((b) => b.id === "building.us.ky.high-street")!.campusId =
      null;
    expect(
      classifyVenueTopology(
        c,
        "venue.us.ky.capitol.house",
        "venue.us.ky.governor.working",
      ),
    ).toBe("unknown");
  });
  it("allows two different bodies to use one actual room without merging identity", () => {
    const c = copy();
    const first = c.scenes.find(
      (s) => s.venueId === "venue.us.nd.capitol.peace-garden",
    )!;
    const second = {
      ...first,
      id: "scene-reference.fixture.second-body",
      institutionId: "institution.fixture.review-board",
    };
    c.scenes.push(second);
    const found = resolveVenueReferences(c, { date: "2026-06-01" }).filter(
      (r) => r.venue.id === first.venueId,
    );
    expect(found.map((r) => r.scene.institutionId).sort()).toEqual(
      [first.institutionId, second.institutionId].sort(),
    );
    expect(new Set(found.map((r) => r.venue.roomId)).size).toBe(1);
    expect(
      classifyVenueTopology(c, found[0]!.venue.id, found[1]!.venue.id),
    ).toBe("same-room");
    expect(c.scenes).toContainEqual(first);
  });
});

describe("evidence, discrepancies and deterministic serialization", () => {
  it("retains UNKNOWN temporary geometry and blocks inherited historic dimensions", () => {
    const dims = seed.geometry.filter(
      (g) => g.subjectId === "room.us.ky.temporary.house",
    );
    expect(dims.length).toBeGreaterThan(0);
    expect(
      dims.every(
        (g) => g.value.state === "unknown" && !("magnitude" in g.value),
      ),
    ).toBe(true);
    const historic = seed.geometry.find(
      (g) => g.id === "measurement.room.us.ky.capitol.house.length",
    )!;
    expect(historic.value).toEqual({
      state: "reported",
      magnitude: { kind: "scalar", value: 76 },
      unit: "ft",
      confidence: "exact",
    });
    const resolved = query("ky", { sceneType: "scene.chamber" });
    expect(resolved.every((r) => r.exactRender.state === "blocked")).toBe(true);
    expect(
      resolved.find((r) => r.venue.id === "venue.us.ky.capitol.house")!
        .exactRender.blockers,
    ).toContain(`primary-geometry-evidence-missing:${historic.id}`);
  });
  it.each([
    "exact",
    "plan-derived",
    "specified",
    "bounded-estimate",
    "visual-estimate",
  ] as const)(
    "preserves %s evidence class without promotion across JSON",
    (confidence) => {
      const c = copy();
      const g = c.geometry.find((g) => g.value.state === "reported")!;
      if (g.value.state !== "reported") throw new Error("test fixture");
      g.value.confidence = confidence;
      const roundtrip = parseReferenceCatalog(serializeReferenceCatalog(c));
      expect(roundtrip.geometry.find((x) => x.id === g.id)!.value).toEqual(
        g.value,
      );
    },
  );
  it("unresolved controlling claims fail closed even when renderBlocking is erroneously false", () => {
    for (const controls of ["geometry", "location"] as const) {
      const c = copy();
      const target = c.scenes.find(
        (s) => s.venueId === "venue.us.va.patrick-henry.governor",
      )!;
      const claim: SourceClaim = {
        ...c.claims[0]!,
        id: `claim.fixture.disputed-${controls}`,
        controls,
        discrepancy: "unresolved",
        conflictingSourceIds: ["source.authority.18j"],
        renderBlocking: false,
      };
      c.claims.push(claim);
      target.claimIds.push(claim.id);
      const found = resolveVenueReferences(c, {
        date: "2026-06-01",
        institutionId: target.institutionId,
      }).find((r) => r.scene.id === target.id)!;
      expect(found.exactRender.blockers).toContain(`claim:${claim.id}`);
    }
  });
  it("does not block an unrelated venue because another room has a disputed claim", () => {
    const c = copy();
    const before = resolveVenueReferences(c, {
      date: "2026-06-01",
      jurisdictionId: "jurisdiction.us.va",
    });
    c.claims.find((x) => x.id === "claim.backbone.ky")!.renderBlocking = true;
    expect(
      resolveVenueReferences(c, {
        date: "2026-06-01",
        jurisdictionId: "jurisdiction.us.va",
      }),
    ).toEqual(before);
  });
  it("preserves ranges, source uncertainty and missing heights instead of deriving a rectangle from a circle", () => {
    const round = parseReferenceCatalog(serializeReferenceCatalog(seed));
    expect(
      round.geometry.find(
        (g) =>
          g.id === "measurement.building.us.ky.capitol.dais-height-unassigned",
      )!.value,
    ).toEqual({
      state: "reported",
      magnitude: { kind: "range", min: 28, max: 30 },
      unit: "in",
      confidence: "exact",
    });
    expect(
      round.geometry.find(
        (g) => g.id === "measurement.room.us.nm.capitol.house.height",
      )!.value.state,
    ).toBe("unknown");
    expect(
      round.geometry.some(
        (g) =>
          g.subjectId === "room.us.nm.capitol.house" &&
          g.dimension === "dimension.width",
      ),
    ).toBe(false);
  });
  it("produces stable ordering and IDs independent of record order and inspection", () => {
    const c = copy();
    const before = serializeReferenceCatalog(c);
    for (const values of [
      c.sources,
      c.claims,
      c.campuses,
      c.buildings,
      c.rooms,
      c.geometry,
      c.venues,
      c.eras,
      c.scenes,
    ])
      values.reverse();
    expect(serializeReferenceCatalog(c)).toBe(before);
    expect(resolveVenueReferences(c, { date: "2026-06-01" })).toEqual(
      resolveVenueReferences(seed, { date: "2026-06-01" }),
    );
    expect(serializeReferenceCatalog(seed)).toBe(before);
  });
  it("rejects cross-building rooms, missing provenance, invalid ranges and overlapping eras", () => {
    const corruptions: ((c: ReferenceCatalog) => void)[] = [
      (c) => {
        c.venues.find((v) => v.roomId !== null)!.buildingId =
          "building.us.ky.high-street";
      },
      (c) => {
        c.claims[0]!.sourceId = "source.missing";
      },
      (c) => {
        c.eras[0]!.observedDuring.end = "2025-01-01";
      },
      (c) => {
        c.eras.push({ ...c.eras[0]!, id: "era.fixture.overlap" });
      },
      (c) => {
        c.rooms[0]!.id = c.rooms[1]!.id;
      },
      (c) => {
        c.geometry.find((g) => g.value.state === "reported")!.value = {
          state: "reported",
          magnitude: { kind: "range", min: 30, max: 20 },
          unit: "ft",
          confidence: "exact",
        };
      },
    ];
    for (const corrupt of corruptions) {
      const c = copy();
      corrupt(c);
      expect(() => assertReferenceCatalog(c)).toThrow();
    }
  });
  it("rejects fabricated numbers on UNKNOWN geometry and unrecognized confidence", () => {
    const c = copy();
    const g = c.geometry.find((g) => g.value.state === "unknown")!;
    Object.assign(g.value, { value: 0 });
    expect(() => parseReferenceCatalog(JSON.stringify(c))).toThrow();
    const other = copy();
    Object.assign(
      other.geometry.find((g) => g.value.state === "reported")!.value,
      { confidence: "approximately-exact" },
    );
    expect(() => assertReferenceCatalog(other)).toThrow();
  });
  it("contains no travel duration, live World adapter or presentation dependency", () => {
    const directory = new URL("./", import.meta.url);
    for (const file of readdirSync(directory).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    )) {
      const source = readFileSync(new URL(file, directory), "utf8");
      expect(source).not.toMatch(
        /from ["'][^"']*(?:source\/|player\/|presentation\/|react)/,
      );
      expect(source).not.toMatch(/Math\.random|Date\.now|fetch\(/);
    }
    expect(JSON.stringify(seed)).not.toMatch(
      /"(?:travelMinutes|durationMinutes|occupantId|campaignSigns|familyPhotos)"/,
    );
    expect(query("federal").every((r) => !("travelMinutes" in r))).toBe(true);
  });
});

describe("admission boundary adversarial cases", () => {
  it("rejects invented travel fields, unknown era discriminators, missing keys and malformed JSON", () => {
    const c = copy();
    Object.assign(c.venues[0]!, { travelMinutes: 5 });
    expect(() => parseReferenceCatalog(JSON.stringify(c))).toThrow();
    const d = copy();
    Object.assign(d.eras[0]!, { state: "probably-open" });
    expect(() => parseReferenceCatalog(JSON.stringify(d))).toThrow();
    expect(() => parseReferenceCatalog("null")).toThrow();
    expect(() => parseReferenceCatalog("{}")).toThrow();
    expect(() => parseReferenceCatalog("not JSON")).toThrow();
  });
  it("requires availability evidence and rejects stale supersession cycles", () => {
    const c = copy();
    const s = c.scenes[0]!;
    c.eras = c.eras.filter((e) => e.venueId !== s.venueId);
    const found = resolveVenueReferences(c, { date: "2026-06-01" }).find(
      (r) => r.scene.id === s.id,
    )!;
    expect(found.availability).toBe("unknown");
    expect(found.exactRender.state).toBe("blocked");
    const claim = c.claims[0]!;
    claim.discrepancy = "superseded";
    claim.supersededBy = claim.id;
    claim.resolutionNote = "Invalid self-reference fixture.";
    expect(() => assertReferenceCatalog(c)).toThrow(/cycle/);
  });
  it("can resolve a non-US fixture without modifying the algorithm or inheriting Kentucky defaults", () => {
    const c = copy();
    // Relabel a fully linked subgraph through explicit fixture identifiers, never names.
    const rewrite = (value: unknown): unknown =>
      typeof value === "string"
        ? value
            .replaceAll("jurisdiction.us.va", "jurisdiction.fixture.region")
            .replaceAll("government.us.va", "government.fixture.region")
            .replaceAll("institution.us.va", "institution.fixture.region")
        : Array.isArray(value)
          ? value.map(rewrite)
          : value && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, rewrite(v)]),
              )
            : value;
    const fixture = parseReferenceCatalog(JSON.stringify(rewrite(c)));
    const found = resolveVenueReferences(fixture, {
      date: "2026-06-01",
      jurisdictionId: "jurisdiction.fixture.region",
      officeRole: "role.governor",
      sceneType: "scene.working-office",
    });
    expect(found.map((r) => r.venue.buildingId)).toEqual([
      "building.us.va.patrick-henry",
    ]);
    expect(
      resolveVenueReferences(fixture, {
        date: "2026-06-01",
        jurisdictionId: "jurisdiction.fixture.unencoded",
      }),
    ).toEqual([]);
  });
  it("does not let callers mutate the imported reference corpus through a resolved result", () => {
    const result = query("va")[0]!;
    expect(() => {
      result.venue.roomId = "room.fixture.invented";
    }).toThrow();
    expect(() => seed.scenes.push({ ...seed.scenes[0]! })).toThrow();
  });
});

describe("18J transcription integrity", () => {
  it("matches chamber scalar measurements to the preserved source row rather than a second expected-number table", () => {
    for (const g of seed.geometry.filter(
      (g) =>
        g.subjectId.startsWith("room.us.") &&
        g.subjectId.includes(".capitol.") &&
        g.value.state === "reported",
    )) {
      const [, , state, , body] = g.subjectId.split(".");
      const claim = seed.claims.find(
        (c) => c.id === `claim.geometry.${state}`,
      )!;
      const columns = claim.statement.split("|").map((s) => s.trim());
      const reported = columns[body === "house" ? 3 : 4]!;
      const sourceNumbers = [...reported.matchAll(/(\d+)'/g)].map((m) =>
        Number(m[1]),
      );
      const dimension = g.dimension.slice("dimension.".length);
      const index =
        dimension === "diameter"
          ? 0
          : ["length", "width", "height"].indexOf(dimension);
      if (g.value.state !== "reported") throw new Error("test guard");
      expect(g.value.magnitude, `${g.id}: ${reported}`).toEqual({
        kind: "scalar",
        value: sourceNumbers[index],
      });
      expect(g.value.confidence).toBe(columns[7]!.replaceAll("`", ""));
      expect(g.primaryEvidence).toBe("not-supplied");
      expect(claim.renderBlocking).toBe(true);
    }
  });
});
