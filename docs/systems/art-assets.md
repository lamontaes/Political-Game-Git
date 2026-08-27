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

## Bootstrap state

An empty production manifest and empty provenance set remain valid. Reference,
draft, pending, and experimental entries may remain incomplete only while they
make no runtime-release claim and omit any nonexistent `final_path`. Gate B and
Gate C remain unsatisfied until actual approved assets are recorded and
released through this contract.
