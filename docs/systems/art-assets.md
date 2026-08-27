# Art Assets and Runtime Release

Status: **Stage 6.5 runtime-release gate contract**

## Approval and release are separate

The existing asset manifest is the sole art registry. `generation_status`
records generation or ordinary production review, and `qa_status` records QA
review. Neither approval makes an asset available to the normal runtime.

`runtime_release_status` is a separate closed state:

- `unreleased` keeps the asset out of normal runtime use, including when its
  generation and QA reviews are approved;
- `released` is an explicit project-control release and lock claim.

An entry is runtime eligible only when the complete manifest validates and the
entry has `generation_status: "approved"`, `qa_status: "approved"`, and
`runtime_release_status: "released"`. Runtime consumers must use only that
validated eligible set. File existence, a path, or one generic approval never
implies runtime eligibility.

## Final files and hashes

`final_path` remains optional for references and incomplete experimental work.
When present, it must be a repository-relative POSIX path under `art/`, contain
no parent traversal, resolve to an existing regular file, and remain under the
real art root after symlinks are resolved.

Every released asset requires a lowercase 64-character SHA-256 digest in
`hash`. Validation computes the digest from the actual file bytes using the
same `hashArtFile` primitive as inventory generation and rejects missing,
malformed, or mismatched hashes.

## Provenance

Provenance IDs and asset IDs are stable links. Duplicate provenance IDs and
provenance entries pointing at absent manifest assets are invalid. Ordinary
approved assets retain the existing requirement for linked provenance, a final
path, and a hash, and may not cite rejected provenance. A released asset also
requires at least one linked provenance entry whose `approval_status` is
`approved`. `rights_license_status: "unknown"` remains a valid recorded fact;
release validation does not invent or upgrade rights.

For an AI-generated asset, provenance identifies that origin with
`reference_type: "ai-generated"`. A released asset with that provenance must
record `generator_tool`, `generated_model_version`,
`prompt_spec_manifest_id`, and a valid `generation_edit_date`. Those fields are
not required for photographs, measured drawings, HABS sources, hand-authored
art, or other provenance classes.

## Bootstrap and first runtime release

An empty production manifest and empty provenance set remain valid for a new
bootstrap. Reference, draft, pending, and experimental entries may remain
incomplete only while they make no runtime-release claim and omit any
nonexistent `final_path`.

Packet 76 is the first production use of this gate. It releases one ordinary
council/legislative staff-office environment plate under the reusable
`council-staff-office` family and two anonymous authored-pose character recipes.
The supplied raw bytes are verified before import. The two green-field sources
remain under `art/references/approved/packet76/`; a fixed green-dominance alpha
ramp plus transition-pixel spill clamp produces the runtime PNGs. The transform
is deterministic, changes no opaque clothing, skin, hair, face, hand, foot, or
anatomy pixels, and is reproduced by the focused art suite. Gemini is recorded
as the generator family and `not-recorded` as the honestly unknown model
version. Rights remain `unknown`; project approval and runtime release do not
upgrade them.

PNG transparency QA is pixel-based. An alpha-capable PNG is `confirmed` only
when deterministic decoding finds at least one pixel whose alpha is below 255;
an all-opaque RGBA image does not satisfy `requires_transparency` merely because
its header declares an alpha channel.

The approved 1024×572 Prompt 30 room is preserved byte-for-byte as its source
input. Runtime composition uses a deterministic 2048×1144 separable Lanczos-3
derivative so the 1440×900 and 1200×720 scene plates downsample rather than
upscale the approved pixels. The same derivation command emits one transparent
foreground mask from fixed source-coordinate desk and chair polygons with 2×2
edge coverage. Both derivatives are ordinary released manifest assets with
their own hashes and linked provenance; neither creates a parallel registry,
changes the approved source bytes, or redraws the room.
