import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FullConfig } from "@playwright/test";
import { assertIdentity, type SourceIdentity } from "./identity";

export default async function verifyServer(config: FullConfig) {
  const { expectedIdentity, artifacts, artbenchDataRoot } = config.metadata as {
    expectedIdentity: SourceIdentity;
    artifacts: string;
    artbenchDataRoot: string;
  };
  const url = config.projects[0].use.baseURL!;
  const response = await fetch(`${url}/__dev/identity`);
  if (!response.ok) throw new Error("Test server has no source identity");
  const actual = await response.json();
  assertIdentity(expectedIdentity, actual);
  // Source identity alone cannot distinguish a test server attached to the
  // live Art Desk store. Refuse every run unless this server uses our store.
  const bench = await fetch(`${url}/__dev/artbench/state`);
  if (!bench.ok) throw new Error("Test server has no isolated Art Desk");
  const state = (await bench.json()) as { store?: { storeId?: string } };
  const local = JSON.parse(
    await readFile(join(artbenchDataRoot, "store.json"), "utf8"),
  ) as { storeId?: string };
  if (!local.storeId || state.store?.storeId !== local.storeId)
    throw new Error("Test server is attached to a different Art Desk store");
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
