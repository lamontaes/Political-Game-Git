// Loader for the fresh grounding probes in fixtures/grounding/.
//
// A probe is one synthetic packet plus one candidate output and the expected
// verdict. Probes are development tests for the grounding gate; they are never
// owner blind prose benchmarks, and they contain no retired-holdout material.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { GroundingRule } from "./grounding";

export interface GroundingProbe {
  id: string;
  expectPass: boolean;
  expectedRule: GroundingRule | null;
  packet: string;
  output: string;
}

export const PROBE_DIR = join(import.meta.dirname, "fixtures", "grounding");

export function parseProbe(name: string, text: string): GroundingProbe {
  const idMatch = /^#\s*probe:\s*(.+)$/m.exec(text);
  const expectMatch = /^expect:\s*(PASS|FAIL)\s*(\S+)?\s*$/m.exec(text);
  if (!idMatch || !expectMatch) {
    throw new Error(`probe ${name}: missing "# probe:" or "expect:" header`);
  }
  const packetMatch = /^##\s*PACKET\s*$([\s\S]*?)^##\s*OUTPUT\s*$/m.exec(text);
  const outputMatch = /^##\s*OUTPUT\s*$([\s\S]*)$/m.exec(text);
  if (!packetMatch || !outputMatch) {
    throw new Error(
      `probe ${name}: missing "## PACKET" or "## OUTPUT" section`,
    );
  }
  const expectPass = expectMatch[1] === "PASS";
  if (!expectPass && !expectMatch[2]) {
    throw new Error(`probe ${name}: a FAIL probe must name the expected rule`);
  }
  return {
    id: idMatch[1].trim(),
    expectPass,
    expectedRule: expectPass ? null : (expectMatch[2] as GroundingRule),
    packet: packetMatch[1].trim(),
    output: outputMatch[1].trim(),
  };
}

export function loadProbes(dir: string = PROBE_DIR): GroundingProbe[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort()
    .map((name) => parseProbe(name, readFileSync(join(dir, name), "utf8")));
}
