import { describe, it, expect } from "vitest";
import { deriveLibrarySignature } from "../../src/character-assets/identity";
import { SYNTHETIC_LIBRARY_V1 } from "../../src/character-assets/fixtures";

describe("Library Identity Signature", () => {
  it("shuffled manifest/array order has no effect", () => {
    const shuffledLib = {
      ...SYNTHETIC_LIBRARY_V1,
      bodyFamilies: [...SYNTHETIC_LIBRARY_V1.bodyFamilies].reverse(),
      headAssets: [...SYNTHETIC_LIBRARY_V1.headAssets].reverse(),
    };

    expect(deriveLibrarySignature(shuffledLib)).toBe(
      deriveLibrarySignature(SYNTHETIC_LIBRARY_V1),
    );
  });

  it("identical library content has identical library identity", () => {
    const clonedLib = JSON.parse(JSON.stringify(SYNTHETIC_LIBRARY_V1));
    expect(deriveLibrarySignature(clonedLib)).toBe(
      deriveLibrarySignature(SYNTHETIC_LIBRARY_V1),
    );
  });

  it("adding a candidate changes library identity", () => {
    const grownLib = {
      ...SYNTHETIC_LIBRARY_V1,
      headFamilies: [
        ...SYNTHETIC_LIBRARY_V1.headFamilies,
        { id: "head_family_new", compatibleBodyFamilies: [] } as Parameters<
          typeof deriveLibrarySignature
        >[0]["headFamilies"][0],
      ],
    };
    expect(deriveLibrarySignature(grownLib)).not.toBe(
      deriveLibrarySignature(SYNTHETIC_LIBRARY_V1),
    );
  });

  it("removing a candidate changes library identity", () => {
    const shrunkLib = {
      ...SYNTHETIC_LIBRARY_V1,
      headFamilies: SYNTHETIC_LIBRARY_V1.headFamilies.slice(1),
    };
    expect(deriveLibrarySignature(shrunkLib)).not.toBe(
      deriveLibrarySignature(SYNTHETIC_LIBRARY_V1),
    );
  });
});
