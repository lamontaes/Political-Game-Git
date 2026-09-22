import type { OwnershipPack } from "./ownership-packs";

/**
 * The ownership pack this build ships: fictional owners of the kinds that hold
 * American news outlets. Every name is a fictional composition; none is a real
 * company. The likelihoods, shares and review intervals are provisional
 * authored values, not measurements, and are expected to be replaced when the
 * real-world patterns come back from research.
 */
export const DEFAULT_MEDIA_OWNERSHIP_PACK: OwnershipPack = {
  id: "media-ownership.default",
  provenance: {
    kind: "authored-fiction",
    note: "Fictional media owners and provisional coordination practices. Names, likelihoods and shares are game-authored, not real companies or measured behavior.",
  },
  practices: [
    {
      key: "practice.cut-newsroom-staff",
      effect: "reduce-newsroom-staff",
      likelihoodPerReview: 0.3,
      description:
        "Eliminated newsroom positions across every outlet it owns in one cost-cutting round.",
      parameters: { shareOfPositions: 0.34, minimumPositionsKept: 1 },
    },
    {
      key: "practice.trim-newsroom-staff",
      effect: "reduce-newsroom-staff",
      likelihoodPerReview: 0.1,
      description:
        "Trimmed newsroom positions across its outlets during a budget review.",
      parameters: { shareOfPositions: 0.15, minimumPositionsKept: 1 },
    },
    {
      key: "practice.buy-outlets",
      effect: "acquire-outlet",
      likelihoodPerReview: 0.25,
      description: "Bought an independently owned outlet.",
    },
    {
      key: "practice.buy-outlets-occasionally",
      effect: "acquire-outlet",
      likelihoodPerReview: 0.08,
      description: "Bought an independently owned outlet.",
    },
    {
      key: "practice.share-content",
      effect: "share-content-across-outlets",
      likelihoodPerReview: 0.3,
      description:
        "Told its outlets to share stories and run one another's coverage.",
    },
    {
      key: "practice.must-run-segments",
      effect: "coordinate-editorial-line",
      likelihoodPerReview: 0.2,
      description:
        "Sent every outlet it owns the same commentary to run, word for word.",
    },
    {
      key: "practice.consolidate-newsrooms",
      effect: "consolidate-newsrooms",
      likelihoodPerReview: 0.05,
      description:
        "Merged the newsrooms of several of its outlets into one regional desk.",
    },
  ],
  owners: [
    {
      key: "owner.private-equity-chain",
      ownerKind: "private-equity",
      names: [
        "Harrow Street Capital",
        "Bellwether Ridge Partners",
        "Crosswater Equity Group",
      ],
      holds: {
        products: ["general-newspaper", "state-newsroom", "community-outlet"],
      },
      foundingWeight: 3,
      reviewEveryDays: 91,
      sellsOutlets: false,
      practices: [
        "practice.cut-newsroom-staff",
        "practice.buy-outlets",
        "practice.share-content",
        "practice.consolidate-newsrooms",
      ],
    },
    {
      key: "owner.family-newspaper-chain",
      ownerKind: "family-chain",
      names: [
        "Pemberton Family Newspapers",
        "Ashgrove Publishing Company",
        "Whitlock Newspaper Group",
      ],
      holds: { products: ["state-newsroom", "community-outlet"] },
      foundingWeight: 2,
      reviewEveryDays: 182,
      sellsOutlets: true,
      practices: [
        "practice.share-content",
        "practice.trim-newsroom-staff",
        "practice.buy-outlets-occasionally",
      ],
    },
    {
      key: "owner.broadcast-group",
      ownerKind: "broadcast-group",
      names: [
        "Keystone Signal Media",
        "Northbeam Broadcasting Holdings",
        "Tallgrass Media Group",
      ],
      holds: {
        products: ["public-affairs-broadcaster", "politics-publication"],
      },
      foundingWeight: 2,
      reviewEveryDays: 91,
      sellsOutlets: false,
      practices: ["practice.must-run-segments", "practice.trim-newsroom-staff"],
    },
    {
      key: "owner.nonprofit-trust",
      ownerKind: "nonprofit-trust",
      names: ["Civic Commons Media Trust", "The Lamplight Journalism Trust"],
      holds: {
        products: [
          "state-newsroom",
          "community-outlet",
          "politics-publication",
        ],
      },
      foundingWeight: 1,
      reviewEveryDays: 365,
      sellsOutlets: false,
      practices: ["practice.share-content"],
    },
    {
      key: "owner.independent",
      ownerKind: "independent",
      names: ["{outlet} Publishing Company", "{outlet} Media LLC"],
      perOutlet: true,
      holds: {},
      foundingWeight: 3,
      reviewEveryDays: 365,
      sellsOutlets: true,
      practices: [],
    },
  ],
};
