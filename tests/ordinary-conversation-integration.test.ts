import { describe, expect, it } from "vitest";
import { ordinaryConversationReplay } from "./support/ordinary-conversation-replay";

// Captured by running the identical replay after the accepted P2R2 prose repair.
// The PR79 consequence hook still has to preserve the complete records; this
// checkpoint moves only because those records deliberately carry the repaired
// player-facing wording.
// Digests cover complete canonical records, including IDs, provenance and wording.
const beforeIntegration = {
  household: {
    relationship: {
      count: 2,
      sha256:
        "a38cd338b860cfd3560bbf374da5cc6a6f4c41a5d28a62b351a6f10ca231b40b",
    },
    commitment: {
      count: 1,
      sha256:
        "b3fac7794b75cdc7cbbc6d353dc98769b9d4aa5ebe6c38024e62e3742df55efe",
    },
    aftermath: {
      count: 0,
      sha256:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    landed: {
      count: 2,
      sha256:
        "054a22b12e3478677bb63eed1a495f72767b25e3d81e7c38e16858ae8a1d06c9",
    },
    turns: {
      count: 2,
      sha256:
        "e6825bfbcff6d4c848b400c904a8c0629e8efbab9495239b442c4a3a4ce3d5ab",
    },
  },
  householdCallback: {
    relationship: {
      count: 2,
      sha256:
        "5edcc8aefe72b8862aa5d13d0bbf2d522b18132e6d262c8dbe5d877dba280681",
    },
    commitment: {
      count: 1,
      sha256:
        "2d70f39f81a7ad4221bc313daf0d40230e4de870183435baf38c0db9a69086af",
    },
    aftermath: {
      count: 1,
      sha256:
        "2c9cec868446574bc144565cdaaaa64ebe5bccc46ecea40dd9abd2789fa8cbaa",
    },
    landed: {
      count: 2,
      sha256:
        "fcffce4935d7ef7c14258c8df63f720c2438335ab7dc74583786ede4a7f68dfa",
    },
    turns: {
      count: 2,
      sha256:
        "7776acac1f0faff12920e675df24ea07e759c15969befcc208e083762f1fe988",
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
  it("keeps relationship, commitment, aftermath, landed and turn records byte-identical to the accepted prose baseline", () => {
    const after = ordinaryConversationReplay();
    expect(after).toEqual(beforeIntegration);
    expect(after.householdCallback.aftermath!.count).toBe(1);
    expect(after.householdCallback.commitment!.count).toBe(1);
  });
});
