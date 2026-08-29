# Political Geography / District Boundary Source Compiler (2026 Vintage & Multi-Vintage Substrate)

## Authorization & Context

- **Repository**: `lamontaes/Political-Game-Git`
- **Worktree**: `/Users/lamontae/Documents/Political-Game-Political-Geography-2026`
- **Branch**: `antigravity/political-geography-2026`
- **Base Commit**: `d5c488a89c33ab425a276eec2112f78083ba6d7e` (origin/main)
- **Primary Source**: U.S. Census Bureau 2026 TIGER/Line products (120th Congressional Districts, 2026 SLDU, 2026 SLDL, Census Geographic Identifiers) + multi-vintage historical baseline (2024 vintage).

## System Objectives

1. **Normalized Geography Source Layer**:
   - Ingests and normalizes geographic boundary records from U.S. Census TIGER/Line data.
   - Preserves exact source references, retrieval timestamps, effective date windows, and Census GEOIDs.
   - Provides global stable district IDs namespaced by vintage, state, chamber, and district number.
   - Computes deterministic SHA-256 geometry hashes from canonical coordinate representations.

2. **Deterministic Spatial Derivations**:
   - Point-in-polygon constituency lookup using Ray Casting algorithm with interior hole support.
   - Deterministic area-weighted centroids for polygon and multipolygon geometries.
   - Bounding boxes `[minLon, minLat, maxLon, maxLat]`.
   - Topological adjacency network calculation between neighboring districts.

3. **Multi-Vintage Coexistence & Non-Destructive Storage**:
   - Allows concurrent presence of 2024 and 2026 district boundary versions without overwriting older geometries.
   - Tracks `effectiveDate`, `validUntil`, and `isCurrent` flags for historical redistricting awareness.

4. **Jurisdiction & Chamber Diversity Fixtures**:
   - **Kentucky (KY / 21)**: Congressional (CD 1-6), State Senate (SD 13, etc.), State House (HD 77, etc.), Fayette/Jefferson County links.
   - **Single-District State (Wyoming WY / 56)**: At-Large CD (00/AL), State Senate (SD 08), State House (HD 07).
   - **Unicameral Legislature (Nebraska NE / 31)**: Unicameral Legislative Districts (LD 01-49), Congressional Districts 1-3, SLDL omitted as unsupported.
   - **Multi-District Large State (Texas TX / 48)**: Congressional (CD 1-38), State Senate, State House.
   - **District of Columbia (DC / 11)**: Non-voting Delegate (CD 98/00), Council Wards 1-8, no state legislature.

5. **Decoupling and Zero Configuration Pollution**:
   - Population is not derived from geometry; demographic joins are supported via standard GEOIDs.
   - Pure TypeScript implementation in `src/political_geography/` with zero native C++ bindings and zero modifications to existing gameplay files (`src/simulation/`, `src/player/`, `src/presentation/`).
