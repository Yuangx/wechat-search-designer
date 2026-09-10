#!/usr/bin/env python3
"""Package only this self-contained skill; preserve originals and fail on collisions."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    version = json.loads((ROOT / 'package.json').read_text())['version']
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    archive = dist / f'wechat-search-designer-v{version}.zip'
    receipt = dist / f'wechat-search-designer-v{version}.manifest.json'
    if archive.exists() or receipt.exists():
        raise SystemExit('Version output already exists. Choose a new version or another package copy.')
    original_manifest = json.loads((ROOT / 'assets/manifest.json').read_text())
    for item in original_manifest['files']:
        data = (ROOT / item['path']).read_bytes()
        assert digest(data) == item['sha256'] and len(data) == item['bytes'], item['path']
    allowlist = json.loads((ROOT / 'distribution-files.json').read_text())['files']
    if len(allowlist) != len(set(allowlist)):
        raise SystemExit('Duplicate distribution paths')
    records = []
    for name in sorted(allowlist):
        rel = Path(name)
        if rel.is_absolute() or '..' in rel.parts:
            raise SystemExit(f'Unsafe distribution path: {name}')
        p = ROOT / rel
        if any(parent.is_symlink() for parent in [p, *p.parents] if parent != ROOT.parent):
            raise SystemExit(f'Symlink is not distributable: {name}')
        if not p.is_file() or not p.resolve().is_relative_to(ROOT.resolve()):
            raise SystemExit(f'Distribution file missing or outside package: {name}')
        if p.suffix.lower() in {'.otf', '.ttf', '.aep', '.mp4', '.log', '.zip', '.pdf', '.ai'}:
            raise SystemExit(f'Excluded payload found: {name}')
        data = p.read_bytes()
        records.append({'path': rel.as_posix(), 'bytes': len(data), 'sha256': digest(data)})
    required = {'SKILL.md', 'README.md', 'LICENSE', 'NOTICE.md', 'package.json', 'package-lock.json', 'agents/openai.yaml', 'distribution-files.json', 'assets/manifest.json', 'examples/walk-scene.png'}
    assert required <= {r['path'] for r in records}, 'Required distribution files are missing'
    with ZipFile(archive, 'x', compression=ZIP_DEFLATED, compresslevel=9) as z:
        for item in records:
            z.write(ROOT / item['path'], f'wechat-search-designer/{item["path"]}')
    with ZipFile(archive) as z:
        assert z.testzip() is None
        for item in records:
            assert digest(z.read(f'wechat-search-designer/{item["path"]}')) == item['sha256']
    report = {'schema': 'wechat-search-skill-package/v1', 'license': json.loads((ROOT / 'package.json').read_text()).get('license', 'UNLICENSED'), 'third_party_originals_included': False, 'version': version, 'archive': archive.name, 'archive_bytes': archive.stat().st_size, 'archive_sha256': digest(archive.read_bytes()), 'files': records}
    receipt.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
