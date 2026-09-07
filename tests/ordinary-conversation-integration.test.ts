import { describe, expect, it } from "vitest";
import { ordinaryConversationReplay } from "./support/ordinary-conversation-replay";

// Captured by running the identical replay on unmodified main
// 1a91101ab4f5369aeec21c6e9f32c21114794c81, before adding subject consequences.
// Digests cover complete canonical records, including IDs, provenance and wording.
const beforeIntegration = {
  household: {
    relationship: {
      count: 2,
      sha256:
        "f5d271b9d423c52b949fcc1b920b45a96c476ea9594a0a2810033ad0b55c6074",
    },
    commitment: {
      count: 1,
      sha256:
        "4f7e301747c29555b3dc64f0ae8a60b76e5cc3554eb4e905ed3191dfef9b1903",
    },
    aftermath: {
      count: 0,
      sha256:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    landed: {
      count: 2,
      sha256:
        "2a63015be955f0a0fbdfef745fbd8398ebb52659b50a115955349dcbb3f7b20a",
    },
    turns: {
      count: 2,
      sha256:
        "579c577863a6086a56ffae87dfe27d9a594586c6ee84c5167d2c302ec0900822",
    },
  },
  householdCallback: {
    relationship: {
      count: 2,
      sha256:
        "ea2109ff01002691b99aa126c588339727b65346fc1da1450acd0044b1d2b5aa",
    },
    commitment: {
      count: 1,
      sha256:
        "af2fd29219fa2a720bd84061d2db3b8386fc818bde981d5819ea9a9992d90667",
    },
    aftermath: {
      count: 1,
      sha256:
        "a1d2697b669d93c1aebb584c01c50448bbafe1b2cbe9dec59a95f621cace8808",
    },
    landed: {
      count: 2,
      sha256:
        "e9a5f524dfbf8024cee3c1339407d4c181d6286aa8ae445ce8425dc2eb902fcd",
    },
    turns: {
      count: 2,
      sha256:
        "83b83c3dde7227dced6c2e5248c8a4b28cd06437d0c082a9616967dbd5ff1ba3",
    },
  },
  office: {
    relationship: {
      count: 1,
      sha256:
        "7f6b3e6e52f76b0b9904611cdcaa7d908bf822533b0a97bd630d65f24cf54da4",
    },
    commitment: {
      count: 0,
      sha256:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    aftermath: {
      count: 0,
      sha256:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    landed: {
      count: 2,
      sha256:
        "4d7a625becd2d4c913a8b493d577dd6beacf2425c8dd7b1c643f67b36c69374b",
    },
    turns: {
      count: 2,
      sha256:
        "49dfe29143f4a314c9419e9a49c688b1b3c4260f1f55ae0058ff93a1eaa6abb6",
    },
  },
};

describe("PR79 optional consequence hook preserves ordinary subjects", () => {
  it("keeps relationship, commitment, aftermath, landed and turn records byte-identical to main", () => {
    const after = ordinaryConversationReplay();
    expect(after).toEqual(beforeIntegration);
    expect(after.householdCallback.aftermath!.count).toBe(1);
    expect(after.householdCallback.commitment!.count).toBe(1);
  });
});
