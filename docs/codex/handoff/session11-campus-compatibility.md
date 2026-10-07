# Session 11 campus compatibility — partial code handoff

CTO issue #2052 comment 6007456753 fixes the source set at the existing 52
campuses. No additional source search, generation, identity relabeling or pixel
approval is part of this change.

The registry declares region, climate, terrain and size as required matches.
Every selection branch checks them, including an exact campus ID and a
same-state stand-in. Unknown states and mismatched explicit identities are
rejected. The room picker routes college-quad through that selector; its old
untagged shared picture cannot bypass the contract.

The existing employer route binds an exact registered campus only when the
current organization profile name equals the registry name and its recorded
location resolves to that campus's state through the canonical life-place
provider. It reads the identified campus's existing tags, not another
institution's tags. Closed employers, absent locations and unknown identities
produce no campus picture. It preserves the selected arrival's work relationship.

## Missing producer contract

Legacy EducationInstitution and OrganizationProfileRecord have no target campus
terrain or size fields. The directory has coordinates, official ID and state;
those do not establish campus size or terrain. Compatible borrowing needs a
source-backed target record keyed by actual institution ID with region, climate,
terrain, size and their provenance, plus the current visit's institution ID.
Enrollment attendance must resolve that actual visit, rather than an employer
or the player's home. No counts, name fragments or state averages are substituted
for those missing fields here. Exact registered names are a bounded existing
binding, not a complete official-ID crosswalk.

## Evidence boundary

Selector and real room-picker unit tests cover all 52 records and incompatible
exact/same-state inputs. The workplace integration test uses an explicitly
labeled identity/location edge fixture and checks positive, unknown identity
and absent location cases. Existing generated workplace tests remain separate.
There is no ordinary generated college attendance/browser proof or new human
visual approval. This is a partial safe selector fix for review, not full campus
READY. All painting bytes, source IDs/hashes, state tags and approval strings
remain unchanged.
