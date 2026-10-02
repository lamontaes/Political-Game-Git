import type { AcquisitionPlan } from "../../core/index";

/** Official school charge data; kept separate from the existing directory lock. */
export const tuitionAcquisition: AcquisitionPlan = {
  domain: "education",
  requests: [2023].flatMap((year) =>
    [
      `IC${year}_AY`,
      `IC${year}_AY_Dict`,
      `IC${year}_PY`,
      `IC${year}_PY_Dict`,
    ].map((artifactId) => ({
      artifactId,
      provider: "U.S. Department of Education, NCES",
      url: `https://nces.ed.gov/ipeds/datacenter/data/${artifactId}.zip`,
      method: "bulk-download" as const,
      mediaType: "application/zip",
      publisher: {
        statedVintage: `${year} Institutional Characteristics student charges; retain each dictionary field's actual academic or program vintage`,
        releaseDate: null,
        schemaVersion: null,
        documentationUrl: `https://nces.ed.gov/ipeds/datacenter/data/${artifactId}.zip`,
      },
      rights: {
        status: "public-domain-us-government" as const,
        declaredLicense: "Federal NCES statistical student-charge product.",
        attributionRequired: false,
      },
      storage: "committed" as const,
      localPath: `data/source/education-tuition/raw/${artifactId}.zip`,
    })),
  ),
};
