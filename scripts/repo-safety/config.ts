export const SAFETY_CONFIG = {
  // Configurable threshold for legitimate shipping/generated assets
  SHIPPING_ASSET_MAX_BYTES: 50 * 1024 * 1024, // 50 MB

  // Extensions considered raw master or production binaries that must NEVER be committed
  // except potentially in explicit narrow test fixture paths.
  PROHIBITED_ARCHIVAL_EXTENSIONS: [
    ".tiff",
    ".tif",
    ".psd",
    ".raw",
    ".dng",
    ".cr2",
    ".nef",
    ".blend",
  ],

  // Specific paths where raw masters are exceptionally permitted as fixtures for testing
  ALLOWED_FIXTURE_PATHS: [
    "tests/fixtures/art-asset-factory",
    "tests/fixtures/repo-safety",
  ],

  // Narrow explicit paths where generated output is explicitly expected.
  // We do NOT blanket-allow public/
  ALLOWED_GENERATED_PATHS: [
    "dist",
    "coverage",
    ".wrangler",
    "art/generated",
    "art/manifest",
    "art/inventory",
  ],

  // Patterns for typical temporary/scratch files that shouldn't be tracked
  TEMP_FILE_PATTERNS: [
    /^\.tmp\//,
    /\.bak$/,
    /\.log$/,
    /^\.scratch\//,
    /^scratch\./,
    /^\.DS_Store$/,
    /^Thumbs\.db$/,
  ],
};
