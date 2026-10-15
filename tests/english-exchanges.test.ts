import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Exchange counts (EM-3b): how a reply follows a question in public-record
 * talk. Numbers only, keyed by question form and reply opener; any bank part
 * named as a reply opener must exist in that register's part bank.
 */

const ENGLISH = path.resolve(__dirname, "../data/english");
const DIR = path.join(ENGLISH, "exchanges");

type Shares = Record<string, number>;
type ExchangeFile = {
  schema: string;
  register: string;
  shippable: boolean;
  source: { document: string; license: string; url: string };
  counts: {
    documents: number;
    questionReplyPairs: number;
    questionFormShare: Shares;
    replyOpenerShareByForm: Record<string, Shares>;
    medianReplyWordsByForm: Shares;
    shareRepliesUnder10WordsByForm: Shares;
    bankPartOpensReply: Shares;
  };
};

const sum = (shares: Shares) =>
  Object.values(shares).reduce((total, value) => total + value, 0);

const files = readdirSync(DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({
    name,
    file: JSON.parse(
      readFileSync(path.join(DIR, name), "utf8"),
    ) as ExchangeFile,
  }));

describe("English exchange counts", () => {
  it("has at least one exchange file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { name, file } of files) {
    describe(name, () => {
      it("is counts-only and names its source", () => {
        expect(file.schema).toBe("english-exchanges/1");
        expect(`${file.register}.json`).toBe(name);
        expect(file.shippable).toBe(false);
        expect(file.source.license.trim()).not.toBe("");
        expect(file.source.url).toMatch(/^https:\/\//);
        expect(file.counts.questionReplyPairs).toBeGreaterThan(100);
      });

      it("has shares that add up for every question form", () => {
        const { counts } = file;
        expect(sum(counts.questionFormShare)).toBeCloseTo(1, 1);
        for (const form of Object.keys(counts.questionFormShare)) {
          expect(sum(counts.replyOpenerShareByForm[form]!)).toBeCloseTo(1, 1);
          expect(counts.medianReplyWordsByForm[form]).toBeGreaterThan(0);
          const under = counts.shareRepliesUnder10WordsByForm[form]!;
          expect(under).toBeGreaterThanOrEqual(0);
          expect(under).toBeLessThanOrEqual(1);
        }
      });

      it("names only parts that exist in the register's bank", () => {
        const bank = JSON.parse(
          readFileSync(
            path.join(ENGLISH, "parts", `${file.register}.json`),
            "utf8",
          ),
        ) as { parts: Array<{ key: string }> };
        const keys = new Set(bank.parts.map((part) => part.key));
        for (const [key, count] of Object.entries(
          file.counts.bankPartOpensReply,
        )) {
          expect(keys.has(key), key).toBe(true);
          expect(Number.isInteger(count)).toBe(true);
        }
      });
    });
  }
});
