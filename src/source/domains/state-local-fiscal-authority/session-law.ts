import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const ALASKA_SESSION_LAW_PDF_ARTIFACT_ID =
  "ak-ch-74-sla-1985-enrolled-session-law";
export const ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID =
  "ak-ch-74-sla-1985-enrolled-session-law-selected-pages";

/**
 * Pages needed to verify the foundational enactment and effective date.
 *
 * Page 102 and pages 136-138 correct the earlier incomplete page declaration:
 * the city property-tax sentence continues onto 102, while the sales/use-tax
 * provisions are on 136-138 rather than the three pages named for other rules.
 */
export const ALASKA_SESSION_LAW_PAGES = [
  101, 102, 116, 136, 137, 138, 150, 211,
] as const;

export const ALASKA_SESSION_LAW_SELECTION_PREDICATE =
  "PDF.js 6.3.289 text items from one-based PDF pages 101, 102, 116, 136, 137, 138, 150, and 211, in ascending order; join items with spaces, collapse whitespace, retain decoded characters, and prefix each page with `PDF PAGE <number>`.";

function normalizedPageText(items: readonly unknown[]): string {
  return items
    .flatMap((item) =>
      typeof item === "object" &&
      item !== null &&
      "str" in item &&
      typeof item.str === "string"
        ? [item.str]
        : [],
    )
    .join(" ")
    .replace(/[\s\u00a0\u2007\u202f]+/g, " ")
    .trim();
}

/** Deterministically decode the cited pages from the retrieved publisher PDF. */
export async function cutAlaskaSessionLawEvidence(
  parentBytes: Buffer,
): Promise<Buffer> {
  const loading = getDocument({
    data: new Uint8Array(parentBytes),
    useSystemFonts: true,
  });
  const document = await loading.promise;
  try {
    if (document.numPages !== 211) {
      throw new Error(
        `Expected the enrolled session law to contain 211 PDF pages; found ${document.numPages}.`,
      );
    }
    const sections: string[] = [];
    for (const pageNumber of ALASKA_SESSION_LAW_PAGES) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizedPageText(content.items);
      if (text === "") {
        throw new Error(`PDF page ${pageNumber} decoded to no text.`);
      }
      sections.push(`PDF PAGE ${pageNumber}\n${text}`);
      page.cleanup();
    }
    return Buffer.from(`${sections.join("\n")}\n`, "utf-8");
  } finally {
    await loading.destroy();
  }
}

/** Parse the committed extract without pretending its page labels are law. */
export function readAlaskaSessionLawEvidencePages(
  bytes: Uint8Array,
): ReadonlyMap<number, string> {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const matches = [
    ...text.matchAll(/^PDF PAGE (\d+)\n([\s\S]*?)(?=^PDF PAGE \d+\n|\s*$)/gm),
  ];
  const pages = new Map<number, string>();
  for (const match of matches) {
    const page = Number(match[1]);
    if (pages.has(page))
      throw new Error(`Session-law extract repeats page ${page}.`);
    pages.set(page, (match[2] ?? "").trim());
  }
  if (
    pages.size !== ALASKA_SESSION_LAW_PAGES.length ||
    ALASKA_SESSION_LAW_PAGES.some((page) => !pages.has(page))
  ) {
    throw new Error(
      `Session-law extract must contain exactly pages ${ALASKA_SESSION_LAW_PAGES.join(", ")}.`,
    );
  }
  return pages;
}

/** OCR-insensitive comparison that never rewrites the preserved source text. */
export function canonicalSessionLawOcr(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "");
}

const REQUIRED_PAGE_CLAIMS: Readonly<
  Record<number, readonly [label: string, canonicalExcerpt: string][]>
> = {
  101: [
    [
      "borough property-tax grant",
      "aboroughmaylevy1anareawidepropertytaxforareawidefunctions",
    ],
  ],
  102: [
    [
      "city property-tax grant",
      "ahomeruleorfirstclasscitymaylevyapropertytaxsubjecttoas29455502945560asecondclasscitymaylevyapropertytaxsubjecttoas2945590",
    ],
  ],
  116: [
    [
      "three-percent tax limitation",
      "amunicipalitymaynotduringayearlevyandtaxforanypurposeinexcessofthreepercentoftheassessedvalueofpropertyinthemunicipality",
    ],
  ],
  136: [
    [
      "borough sales-tax grant",
      "aboroughmaylevyandcollectasalestaxnotexceedingsixpercentonsalesrentsandonservicesprovidedintheborough",
    ],
  ],
  137: [
    [
      "sales-tax referendum",
      "anewsalesandusetaxoranincreaseintherateoflevyofasalestaxapprovedbyordinancedoesnottakeeffectuntilratifiedbyamajorityofthevotersatanelection",
    ],
  ],
  138: [
    [
      "city sales-tax grant",
      "acityoutsideaboroughmaylevyandcollectsalesandusetaxesinthemannerprovidedforboroughs",
    ],
  ],
  150: [
    [
      "general-obligation bond vote",
      "amunicipalitymayincurgeneralobligationbonddebtonlyafterabondauthorizationordinanceisapprovedbyamajorityvoteatanelection",
    ],
  ],
  211: [["effective date", "sec90thisacttakeseffectjanuary11986"]],
};

/** Fail unless every claimed proposition appears on its declared PDF page. */
export function assertAlaskaSessionLawEvidence(bytes: Uint8Array): void {
  const pages = readAlaskaSessionLawEvidencePages(bytes);
  for (const [pageText, claims] of Object.entries(REQUIRED_PAGE_CLAIMS)) {
    const page = Number(pageText);
    const canonical = canonicalSessionLawOcr(pages.get(page) ?? "");
    for (const [label, excerpt] of claims) {
      if (!canonical.includes(excerpt)) {
        throw new Error(
          `Session-law PDF page ${page} no longer supports the declared ${label} excerpt.`,
        );
      }
    }
  }
}

/** Recheck every proposition after the rights boundary removes page labels. */
export function assertAlaskaSessionLawEnactedText(bytes: Uint8Array): void {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const canonical = canonicalSessionLawOcr(text);
  for (const [pageText, claims] of Object.entries(REQUIRED_PAGE_CLAIMS)) {
    for (const [label, excerpt] of claims) {
      if (!canonical.includes(excerpt)) {
        throw new Error(
          `Session-law evidence from PDF page ${pageText} no longer supports the declared ${label} excerpt.`,
        );
      }
    }
  }
}
