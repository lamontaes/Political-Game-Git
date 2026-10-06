import { describe, expect, it } from "vitest";
import { composeCampaignLossJournalChapter } from "./world39-journal";

describe("what a campaign loss carries into the Journal", () => {
  it("tells two different losses from their recorded people, money, and group", () => {
    const thin = composeCampaignLossJournalChapter({
      metPeople: [
        {
          personId: "person-mara",
          name: "Mara Bell",
          stillThinksWellOfCandidate: true,
        },
      ],
      helpers: [],
      money: {
        displayAmount: "$18.40",
        allowedUses: ["settling campaign bills"],
      },
      group: null,
    });
    const broad = composeCampaignLossJournalChapter({
      metPeople: [
        {
          personId: "person-dev",
          name: "Dev Shah",
          stillThinksWellOfCandidate: true,
        },
        {
          personId: "person-inez",
          name: "Inez Ward",
          stillThinksWellOfCandidate: false,
        },
        {
          personId: "person-luis",
          name: "Luis Green",
          stillThinksWellOfCandidate: true,
        },
        {
          personId: "person-ruth",
          name: "Ruth Okafor",
          stillThinksWellOfCandidate: false,
        },
      ],
      helpers: [
        { personId: "person-inez", name: "Inez Ward", stillClose: false },
        { personId: "person-dev", name: "Dev Shah", stillClose: true },
      ],
      money: {
        displayAmount: "$2,460",
        allowedUses: ["settling campaign bills", "a future campaign"],
      },
      group: {
        organizationId: "group-neighbors",
        name: "Neighbors for Safe Crossings",
        members: [
          { personId: "person-dev", name: "Dev Shah" },
          { personId: "person-luis", name: "Luis Green" },
        ],
      },
    });

    expect(thin).not.toBe(broad);
    expect(thin).toContain("one person");
    expect(thin).toContain("Mara Bell still thought well of me");
    expect(thin).toContain("$18.40");
    expect(thin).toContain("available only for settling campaign bills");
    expect(thin).not.toContain("Neighbors for Safe Crossings");

    expect(broad).toContain("four people");
    expect(broad).toContain("Dev Shah and Luis Green still thought well of me");
    expect(broad).toContain("Dev Shah helped me and remained close");
    expect(broad).toContain("$2,460");
    expect(broad).toContain(
      "available only for settling campaign bills and a future campaign",
    );
    expect(broad).toContain(
      "Neighbors for Safe Crossings carried on with Dev Shah and Luis Green",
    );

    for (const chapter of [thin, broad]) {
      expect(chapter).not.toMatch(/score|points|support\s*[:|]/i);
      expect(chapter).not.toMatch(/(?:^|\n)\s*\d+\s*[|:]/m);
      for (const money of chapter.matchAll(/\$[\d,.]+/g)) {
        expect(chapter.slice(money.index)).toMatch(/available only for/);
      }
    }
  });
});
