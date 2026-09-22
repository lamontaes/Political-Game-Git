"""Install unchanged private bytes under an explicitly reviewed source contract.

The original pack is never rewritten. A checksum-bound compatibility receipt
pins every original source requirement, its reviewed replacements, and additional
composed-source requirements. This is integrity checking, not an authenticity
signature or automatic permission to use arbitrary source with an old pack.
"""
from pathlib import Path
import json
import re
import sys
import tempfile
from install_private_pack import install, sha


def install_compatible(pack, target, receipt_path, apply=False):
    pack, target, receipt_path = map(lambda p: Path(p).resolve(), (pack, target, receipt_path))
    checksum = receipt_path.with_suffix('.sha256').read_text().strip().split()
    if len(checksum) != 2 or checksum[1] != receipt_path.name or checksum[0] != sha(receipt_path):
        raise ValueError('compatibility receipt hash mismatch')
    receipt = json.loads(receipt_path.read_text())
    if receipt.get('schema') != 'modular-source-compatibility-v1':
        raise ValueError('unsupported compatibility receipt')
    original_manifest = pack / 'manifest.json'
    if sha(original_manifest) != receipt['originalManifestSha256']:
        raise ValueError('original pack manifest mismatch')
    manifest = json.loads(original_manifest.read_text())
    original_checksum = (pack / 'manifest.sha256').read_text().strip().split()
    if original_checksum != [sha(original_manifest), 'manifest.json']:
        raise ValueError('original pack checksum mismatch')
    if manifest['sourceSha'] != receipt['originalSourceSha']:
        raise ValueError('original source identity mismatch')
    if not re.fullmatch('[a-f0-9]{40}', receipt['sourceSha']):
        raise ValueError('invalid composed source identity')
    required = receipt['requiredSourceFiles']
    original = manifest['requiredSourceFiles']
    if not set(original).issubset(required):
        raise ValueError('compatibility contract drops an original source requirement')
    differences = {name for name, digest in original.items() if required[name] != digest}
    overrides = receipt['sourceOverrides']
    if set(overrides) != differences:
        raise ValueError('source override inventory differs')
    for name in differences:
        override = overrides[name]
        if (override['before'] != original[name] or override['after'] != required[name]
                or not override['reason'].strip()):
            raise ValueError('unexplained source override: ' + name)
    with tempfile.TemporaryDirectory(prefix='modular-compatibility-') as temporary:
        overlay = Path(temporary)
        (overlay / 'files').symlink_to(pack / 'files', target_is_directory=True)
        updated = {**manifest, 'sourceSha': receipt['sourceSha'],
                   'requiredSourceFiles': required,
                   'acceptance': 'candidate-unapproved; composed-source compatibility only'}
        output = overlay / 'manifest.json'
        output.write_text(json.dumps(updated, indent=2) + '\n')
        (overlay / 'manifest.sha256').write_text(sha(output) + '  manifest.json\n')
        install(overlay, target, apply=apply)


if __name__ == '__main__':
    install_compatible(sys.argv[1], sys.argv[2], sys.argv[3], '--apply' in sys.argv[4:])
