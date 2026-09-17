"""Verify a private pack and install it without overwriting existing files.

All new bytes are staged and hashed before publication. Exceptions roll back only
files this invocation created, so a failed copy can be retried. The adjacent
manifest.sha256 detects corruption; it is not a publisher authenticity signature.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import sys
import tempfile


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def within(root, name):
    root = root.resolve()
    relative = Path(name)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts:
        raise ValueError('Pack path escapes root: ' + name)
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError('Pack path escapes root: ' + name)
    return path


def install(pack, target, apply=False):
    pack, target = Path(pack).resolve(), Path(target).resolve()
    manifest_path = pack / 'manifest.json'
    checksum = (pack / 'manifest.sha256').read_text().strip().split()
    if len(checksum) != 2 or checksum[1] != 'manifest.json' or checksum[0] != sha(manifest_path):
        raise ValueError('manifest hash mismatch')
    manifest = json.loads(manifest_path.read_text())
    if not manifest.get('requiredSourceFiles'):
        raise ValueError('required source contract is empty')
    errors, missing, names = [], [], set()
    for name, digest in manifest['requiredSourceFiles'].items():
        p = within(target, name)
        if not p.is_file() or sha(p) != digest:
            errors.append('incompatible source: ' + name)
    for entry in manifest['files']:
        name, digest = entry['path'], entry['sha256']
        # Reject aliases as well as exact duplicates before any writes.
        p, dest = within(pack / 'files', name), within(target, name)
        key = str(dest).casefold()
        if key in names:
            raise ValueError('duplicate pack destination: ' + name)
        names.add(key)
        if not p.is_file() or sha(p) != digest:
            errors.append('pack hash mismatch: ' + name)
        if dest.exists():
            if not dest.is_file() or sha(dest) != digest:
                errors.append('existing file differs (preserved): ' + name)
        else:
            missing.append((name, p, dest, digest))
    if errors:
        raise ValueError('\n'.join(errors))
    if apply and missing:
        created = []
        # Same filesystem permits atomic, no-clobber hard-link publication.
        with tempfile.TemporaryDirectory(prefix='.modular-install-', dir=target) as staging:
            try:
                for index, (name, source, dest, digest) in enumerate(missing):
                    staged = Path(staging) / str(index)
                    with source.open('rb') as src, staged.open('xb') as out:
                        shutil.copyfileobj(src, out)
                        out.flush()
                        os.fsync(out.fileno())
                    if sha(staged) != digest:
                        raise ValueError('staged copy hash mismatch: ' + name)
                for index, (name, source, dest, digest) in enumerate(missing):
                    if within(target, name) != dest:
                        raise ValueError('destination changed during install: ' + name)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    staged = Path(staging) / str(index)
                    os.link(staged, dest)  # Atomic refusal if another writer won.
                    created.append((dest, staged.stat().st_ino))
                    if sha(dest) != digest:
                        raise ValueError('installed copy hash mismatch: ' + name)
            except BaseException:
                for dest, inode in reversed(created):
                    if dest.exists() and not dest.is_symlink() and dest.stat().st_ino == inode:
                        dest.unlink()
                raise
    print(json.dumps({'verified': len(manifest['files']), 'missing': len(missing),
                      'copied': len(missing) if apply else 0,
                      'sourceSha': manifest['sourceSha'], 'acceptance': manifest['acceptance']}))


if __name__ == '__main__':
    install(Path(sys.argv[1]), Path(sys.argv[2]), '--apply' in sys.argv[3:])
