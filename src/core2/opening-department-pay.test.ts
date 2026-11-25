import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  departmentOwnersOf,
  townGovernmentOf,
  withDistrictPayAuthority,
} from "./opening-department-pay";
import { corePlaceByKey } from "./place-lookup";
import type { OrganizationInput, WorkCommitmentInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const DRAWS = 200;

/**
 * A school district is paid by its place's own government, and where the place
 * has no local government (Guam, the Virgin Islands, American Samoa, the
 * Northern Marianas) by its territory's. A district with no paying government
 * holds no cash and its teachers are never paid. Places are drawn until one of
 * each kind comes up; the places passed over are named.
 */
it(`a district's pay authority is its town's government, else its territory's (seed ${seed})`, () => {
  const seen: Record<"town" | "territory", string | null> = {
    town: null,
    territory: null,
  };
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS && !(seen.town && seen.territory); draw++) {
    const drawn = drawPlace(`${seed}:${draw}`, "district-pay-authority");
    const place = corePlaceByKey(drawn.key);
    if (!place) continue;
    const local = townGovernmentOf(place);
    const kind = local ? "town" : "territory";
    if (seen[kind]) {
      passed.push(`${drawn.name} (${kind})`);
      continue;
    }
    const state = departmentOwnersOf(place).state;
    if (!local && !state) {
      passed.push(`${drawn.name} (no government at all)`);
      continue;
    }
    seen[kind] = drawn.name;
    const district = {
      id: `organization:public-schools:${drawn.key}`,
      source: {
        tag: "ESTIMATED",
        asOf: "2025-01-01",
        citation: "test",
        estimatedFrom: "test",
      },
    } as unknown as OrganizationInput;
    const commitment = {
      id: "work-commitment:test",
    } as unknown as WorkCommitmentInput;
    const result = withDistrictPayAuthority(
      {
        organizations: [],
        placeMetadata: { placeKey: drawn.key } as never,
        startedAt: "2025-01-01" as never,
      },
      district,
      [commitment],
    );
    const authority = result.district.publicPayAuthority;
    expect(authority, `${drawn.name}: the district has no payer`).toBeDefined();
    expect(authority!.workCommitmentIds).toEqual(["work-commitment:test"]);
    expect(result.commitments[0]!.publicPayAuthorityId).toBe(authority!.id);
    const government = local ?? state!;
    expect(authority!.jurisdictionId, drawn.name).toBe(
      government.identity.jurisdictionId,
    );
    expect(
      authority!.governmentKey === `jurisdiction:${authority!.jurisdictionId}`,
      `${drawn.name}: a territory's district keys on the territory`,
    ).toBe(!local);
  }
  expect(
    seen.territory,
    `no drawn place without a local government in ${DRAWS} draws (seed ${seed}); passed over ${passed.length}`,
  ).not.toBeNull();
  expect(seen.town).not.toBeNull();
}, 120_000);
