import { mkdir, writeFile } from "node:fs/promises";
import type { FullConfig } from "@playwright/test";
import { assertIdentity, type SourceIdentity } from "./identity";

export default async function verifyServer(config: FullConfig) {
  const { expectedIdentity, artifacts } = config.metadata as {
    expectedIdentity: SourceIdentity;
    artifacts: string;
  };
  const url = config.projects[0].use.baseURL!;
  const response = await fetch(`${url}/__dev/identity`);
  if (!response.ok) throw new Error("Test server has no source identity");
  const actual = await response.json();
  assertIdentity(expectedIdentity, actual);
  await mkdir(artifacts, { recursive: true });
  await writeFile(
    `${artifacts}/provenance.json`,
    JSON.stringify(
      {
        expectedIdentity,
        served: actual,
        baseURL: url,
        projects: config.projects.map((p) => ({ name: p.name, use: p.use })),
        seedPolicy:
          "Each test retains its original control seed; actual URL/world seed is captured by review proof.",
      },
      null,
      2,
    ),
  );
}
