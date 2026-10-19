import { describe, expect, it } from "vitest";
import type { World } from "../simulation/types";
import { latestOrganizationProfiles } from "./population";

const profile = (
  id: string,
  organizationId: string,
  effectiveAt: string,
  sequence: number,
) => ({ id, organizationId, effectiveAt, sequence });

describe("the opening's organization profile read", () => {
  it("takes the newest profile by effective date then sequence, ignoring later dates", () => {
    const world = {
      currentDate: "2021-01-01",
      history: {
        organizationProfiles: [
          profile("a1", "org-a", "2019-01-01", 5),
          profile("a2", "org-a", "2020-06-01", 2),
          profile("a3", "org-a", "2020-06-01", 3),
          profile("a4", "org-a", "2022-01-01", 9),
          profile("b1", "org-b", "2020-01-01", 1),
        ],
      },
    } as unknown as World;
    const latest = latestOrganizationProfiles(world);
    expect(latest.get("org-a" as never)?.id).toBe("a3");
    expect(latest.get("org-b" as never)?.id).toBe("b1");
  });
});
