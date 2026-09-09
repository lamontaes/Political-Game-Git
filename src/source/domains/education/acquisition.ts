import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";
const request = (
  artifactId: string,
  url: string,
  file: string,
  vintage: string,
): AcquisitionRequest => ({
  artifactId,
  provider: "U.S. Department of Education, NCES",
  url,
  method: "bulk-download",
  mediaType: "application/zip",
  publisher: {
    statedVintage: vintage,
    releaseDate: null,
    schemaVersion: null,
    documentationUrl: url,
  },
  rights: {
    status: "public-domain-us-government",
    declaredLicense:
      "Federal NCES statistical directory product; no student records or reidentification.",
    attributionRequired: false,
  },
  storage: "committed",
  localPath: `data/source/education/raw/${file}`,
});
export const educationAcquisition: AcquisitionPlan = {
  domain: "education",
  requests: [
    request(
      "ccd-2024-25-preliminary",
      "https://ies.ed.gov/sites/default/files/data-asset/ccd-common-core-data/2025/08/2024-25-common-core-data-ccd-preliminary-directory-files/2025046%20Preliminary%20Data%20Release%20CCD%20Nonfiscal_0.zip",
      "ccd-2024-25.zip",
      "2024-25 preliminary directory v0a",
    ),
    ...[
      "HD2024",
      "IC2024",
      "HD2024_Dict",
      "IC2024_Dict",
      "HD2025",
      "IC2025",
      "HD2025_Dict",
      "IC2025_Dict",
    ].map((id) =>
      request(
        id,
        `https://nces.ed.gov/ipeds/complete-data-files/${id}.zip`,
        `${id}.zip`,
        id.includes("2025")
          ? "2025-26 provisional"
          : id.startsWith("IC")
            ? "2024-25; archive includes revised member, updated September 2026"
            : "2024-25 directory",
      ),
    ),
  ],
};
