/**
 * Version bump helper: `npm run version:bump -- <major|minor|patch>`.
 *
 * Updates package.json and opens a dated section in CHANGELOG.md. Releasing is
 * left to git and electron-builder — this only moves the number and the notes.
 */
import { readFile, writeFile } from 'node:fs/promises';

const RELEASE_KINDS = ['major', 'minor', 'patch'] as const;
type ReleaseKind = (typeof RELEASE_KINDS)[number];

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const CHANGELOG_ANCHOR = '## [Unreleased]';

function isReleaseKind(value: string | undefined): value is ReleaseKind {
  return value !== undefined && (RELEASE_KINDS as readonly string[]).includes(value);
}

function nextVersion(current: string, kind: ReleaseKind): string {
  const match = SEMVER_PATTERN.exec(current);
  if (match === null) {
    throw new Error(`package.json version is not semver: ${current}`);
  }

  const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];

  if (kind === 'major') {
    return `${major + 1}.0.0`;
  }
  if (kind === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

async function main(): Promise<void> {
  const kind = process.argv[2];
  if (!isReleaseKind(kind)) {
    throw new Error(`Usage: npm run version:bump -- <${RELEASE_KINDS.join('|')}>`);
  }

  const raw = await readFile('package.json', 'utf8');
  const manifest = JSON.parse(raw) as { version: string };
  const updated = nextVersion(manifest.version, kind);

  await writeFile(
    'package.json',
    `${raw.replace(`"version": "${manifest.version}"`, `"version": "${updated}"`).trimEnd()}\n`,
    'utf8',
  );

  const changelog = await readFile('CHANGELOG.md', 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    'CHANGELOG.md',
    changelog.replace(CHANGELOG_ANCHOR, `${CHANGELOG_ANCHOR}\n\n## [${updated}] - ${today}`),
    'utf8',
  );

  process.stdout.write(`version ${manifest.version} -> ${updated}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
