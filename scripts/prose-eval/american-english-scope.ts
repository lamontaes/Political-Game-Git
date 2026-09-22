/**
 * Which tracked files must be written in American English.
 *
 * Everything, by default: player text, content, tests, docs, and the skill and
 * instruction files. The exceptions are files whose words are not ours to
 * change — bytes captured from a source, evidence recorded at a named head,
 * output a generator writes — and each says why. A new directory is in scope
 * the moment it exists; nothing has to remember to add it.
 */
export const AMERICAN_ENGLISH_EXEMPT: readonly {
  readonly pattern: RegExp;
  readonly reason: string;
}[] = [
  {
    pattern: /^data\//,
    reason: "sourced records, kept byte for byte as acquired",
  },
  {
    pattern: /(^|\/)raw\//,
    reason: "captured source bytes",
  },
  {
    pattern: /^public\//,
    reason: "built catalogs and shipped assets, regenerated from sources",
  },
  {
    pattern: /^docs\/plans\/evidence\//,
    reason:
      "evidence recorded at a named head; editing it falsifies the record",
  },
  {
    pattern: /^docs\/prose-inventory\//,
    reason: "generated inventory, regenerated rather than edited",
  },
  {
    pattern: /^docs\/dehardwire\/census\.json$/,
    reason: "generated census, regenerated rather than edited",
  },
  {
    pattern: /^docs\/research\/[^/]+\.(tsv|json)$/,
    reason: "research ledgers quoting their sources",
  },
  {
    pattern: /^art\/qa\//,
    reason: "generated art QA reports bound to the images they measured",
  },
  {
    pattern: /(^|\/)package-lock\.json$/,
    reason: "dependency lockfile",
  },
  {
    pattern: /\.generated\.[a-z]+$/,
    reason: "generated from sourced records; fix the generator's input instead",
  },
  {
    pattern: /^fixtures\/source\//,
    reason: "fixtures mirroring sourced records byte for byte",
  },
  {
    pattern:
      /^src\/source\/domains\/municipal-governance\/national-corpus\.ts$/,
    reason:
      "transcription of sourced municipal records, mirrored by fixtures/source",
  },
  {
    pattern: /^art\/(manifest|intake)\//,
    reason: "asset records bound to received files and their hashes",
  },
  {
    pattern: /(^|\/)fixtures\/[^/]*old-save[^/]*$/,
    reason: "an old save, kept as it was written so migration is tested",
  },
  {
    pattern:
      /^(scripts\/prose-eval\/(american-spelling|american-english|american-english-scope|prose-ranges)(\.test)?\.ts|tests\/content-american-english\.test\.ts|tests\/american-english-sweep\.test\.ts|src\/presentation\/legislation-american-english\.test\.ts)$/,
    reason: "the word tables and their tests name the British forms on purpose",
  },
];

/**
 * A line that names a British form on purpose — a quotation, an old save's
 * text a migration must still recognize — carries this marker, and says why.
 */
export const ALLOW_MARKER = "british-spelling-ok:";

export function exemptionFor(file: string): string | null {
  return (
    AMERICAN_ENGLISH_EXEMPT.find(({ pattern }) => pattern.test(file))?.reason ??
    null
  );
}
