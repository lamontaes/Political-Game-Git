import { describe, expect, it } from "vitest";
import { ordinaryConversationReplay } from "./support/ordinary-conversation-replay";

// Captured by running the identical replay on unmodified main
// b61abf26118e50be351c09db5b3d0823333fc9ec (post-P1 prose migration), before
// adding subject consequences.
// Digests cover complete canonical records, including IDs, provenance and wording.
const beforeIntegration = {
  household: {
    relationship: {
      count: 2,
      sha256:
        "86c802e89363ade58a1e546ad34821fcf3af6d25921389aa1a146af92dda5760",
    },
    commitment: {
      count: 1,
      sha256:
        "5513a94417f706cdf4097d7a6dd2d87abee65271ccd9f3f4ba1c00103d36c560",
    },
    aftermath: {
      count: 0,
      sha256:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    landed: {
      count: 2,
      sha256:
        "f259d4a81682f642e343567dc51e2a432e62e78a555fcdea5cf0a2a19b429a3a",
    },
    turns: {
      count: 2,
      sha256:
        "1fa8b1865fc23d953e1a28f11afbcb67050c2071edf6bca6885d4469077617c6",
    },
  },
  householdCallback: {
    relationship: {
      count: 2,
      sha256:
        "156f35c6096eb2a5c609a362a8f563d8ccfc6a1bc7939455c09312213320cbd4",
    },
    commitment: {
      count: 1,
      sha256:
        "83d68caab6d9f2cfb5b73cd345e60d4ee38e1a31b499d10735b38a26c3e304be",
    },
    aftermath: {
      count: 1,
      sha256:
        "c9979ce1dc47ef1d0c8ee06662fb2084d9a950d512b778e6f7830f0eac9c1318",
    },
    landed: {
      count: 2,
      sha256:
        "6e8a68d347b5e794a751c1040b94dd52ae696acddce14c9b2035834ab10a3206",
    },
    turns: {
      count: 2,
      sha256:
        "ec90def8bc4908ff7e6d9ca03567cfd6d4d5d17e93e2ad374f66819739ef9314",
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
