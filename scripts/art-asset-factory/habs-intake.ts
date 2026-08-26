import fs from "fs";
import path from "path";

export interface HabsIntakeOptions {
  locItemId: string;
  outputDir: string;
  retrievalDate?: string;
}

export async function runIntake(options: HabsIntakeOptions) {
  const manifestPath = path.join(options.outputDir, "intake.json");
  let existingManifest: unknown[] = [];
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      console.warn(
        "Failed to read existing manifest, proceeding with fresh intake.",
      );
    }
  }

  const url = `https://www.loc.gov/item/${options.locItemId}/?fo=json`;
  console.log(`Fetching ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch LOC item: ${response.statusText}`);
  }
  const data = await response.json();

  // Defensive check for resources
  if (!data.resources || !Array.isArray(data.resources)) {
    throw new Error("Invalid LOC data: missing 'resources' array.");
  }

  let drawingsResource = data.resources.find(
    (r: unknown) =>
      r.files &&
      r.files.length > 0 &&
      r.files[0] &&
      Array.isArray(r.files[0]) &&
      r.files[0].some(
        (f: unknown) =>
          f.type === "drawing" ||
          (f.use === "caption" && f.title?.includes("sheet")),
      ),
  );

  // If not found by type, try caption text
  if (!drawingsResource) {
    drawingsResource = data.resources.find(
      (r: unknown) => r.caption && r.caption.toLowerCase().includes("drawing"),
    );
  }

  if (!drawingsResource) {
    throw new Error(
      "Could not identify the resource containing measured drawings.",
    );
  }

  const drawingsCount = drawingsResource.files.length;
  console.log(`Found ${drawingsCount} files in the drawings resource.`);

  if (drawingsCount !== 79) {
    throw new Error(
      `Expected 79 measured drawings, but found ${drawingsCount}. Stopping to avoid assumptions.`,
    );
  }

  const defaultRetrievalDate =
    options.retrievalDate || new Date().toISOString();
  const manifest: unknown[] = [];

  for (let i = 0; i < drawingsCount; i++) {
    const fileGroup = drawingsResource.files[i];
    const captionFile = fileGroup.find((f: unknown) => f.use === "caption");
    const masterFile = fileGroup.find(
      (f: unknown) => f.mimetype === "image/tiff" || f.url?.endsWith(".tif"),
    );
    const refFile =
      fileGroup.find((f: unknown) => f.width >= 1000 && f.width < 2000) ||
      fileGroup.find(
        (f: unknown) => f.mimetype === "image/jpeg" && f.width > 500,
      );
    const thumbFile =
      fileGroup.find((f: unknown) => f.width === 150) ||
      fileGroup.find(
        (f: unknown) => f.width < 500 && f.mimetype === "image/jpeg",
      );

    if (!captionFile) {
      console.warn(`Warning: Missing caption for file group ${i}`);
    }

    const title = captionFile?.title || "Unknown Title";
    const akaUrl = captionFile?.aka || "";
    const sheetId = akaUrl.split(".").pop() || `sheet_${i + 1}`;

    // Attempt to extract sheet number from title (e.g. "sheet 1 of 79")
    const sheetMatch = title.match(/sheet (\d+) of/i);
    const sheetNumber = sheetMatch ? parseInt(sheetMatch[1], 10) : i + 1;

    const stableId = `habs_tx3326_${sheetId}`;

    const existingEntry = existingManifest.find(
      (e: unknown) => e.stable_id === stableId,
    );

    manifest.push({
      stable_id: stableId,
      sheet_number: sheetNumber,
      title: title,
      description: data.item?.description
        ? data.item.description[0]
        : "Unknown description",
      date_vintage: data.item?.date || "Unknown date",
      loc_item_id: options.locItemId,
      canonical_url: akaUrl,
      // preserve existing retrieval date to make idempotency easier, unless it's new
      retrieval_date: existingEntry?.retrieval_date || defaultRetrievalDate,
      source_organization: "Library of Congress / HABS",
      // Fix Rights Semantics
      rights_status: "unknown",
      rights_statement: data.item?.rights_information || "Unknown",
      file_variants: {
        master: masterFile
          ? {
              url: masterFile.url,
              mimetype: masterFile.mimetype,
              size: masterFile.size,
              hash: existingEntry?.file_variants?.master?.hash,
            }
          : null,
        reference: refFile
          ? {
              url: refFile.url,
              mimetype: refFile.mimetype,
              width: refFile.width,
              height: refFile.height,
            }
          : null,
        thumbnail: thumbFile
          ? {
              url: thumbFile.url,
              mimetype: thumbFile.mimetype,
              width: thumbFile.width,
              height: thumbFile.height,
            }
          : null,
      },
      local_status: existingEntry?.local_status || "metadata_only",
      relevance_classification:
        existingEntry?.relevance_classification || "unresolved",
      classification_confidence:
        existingEntry?.classification_confidence || "unresolved",
      notes: existingEntry?.notes || "",
    });
  }

  // Sort deterministically by sheet number
  manifest.sort((a, b) => a.sheet_number - b.sheet_number);

  fs.mkdirSync(options.outputDir, { recursive: true });

  const newManifestJson = JSON.stringify(manifest, null, 2);
  const existingManifestJson = JSON.stringify(existingManifest, null, 2);

  if (newManifestJson !== existingManifestJson) {
    fs.writeFileSync(manifestPath, newManifestJson);
    console.log(
      `Successfully saved updated intake manifest to ${manifestPath}`,
    );
  } else {
    console.log(`Manifest unchanged, skipping write.`);
  }
}
