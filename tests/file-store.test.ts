import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileBundleStore } from '@/lib/data/local/file-store';
import { BundleRepository } from '@/lib/data/bundle-repository';
import type { NewCollege, NewEssay } from '@/lib/data/repository';

/**
 * The desktop build exists to make one promise: closing the window does not
 * lose your work. These tests are about that promise — what ends up on disk
 * after a change, what happens when the file cannot be read, and whether a
 * fresh process sees what the last one wrote.
 */

const USER = '00000000-0000-4000-8000-000000000001';
const OTHER_USER = '00000000-0000-4000-8000-0000000000ff';

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'applypilot-store-'));
  // Deliberately inside a directory that does not exist yet: the first run of a
  // freshly installed desktop app has no data directory either.
  file = join(dir, 'nested', 'applypilot-data.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** A store and a repository over it, the way the desktop build wires them. */
function open(path = file) {
  const store = new FileBundleStore(path);
  return { store, app: new BundleRepository('file', store) };
}

function onDisk(path = file) {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown[]>;
}

function aCollege(name: string): NewCollege {
  return {
    name,
    city: null,
    stateOrRegion: null,
    country: null,
    institutionType: null,
    websiteUrl: null,
    admissionsUrl: null,
    financialAidUrl: null,
    majors: [],
    tags: [],
    listStatus: 'considering',
    fitNotes: null,
    academicNotes: null,
    campusNotes: null,
    costNotes: null,
    sourceNotes: null,
    lastVerifiedAt: null,
  };
}

function anEssay(title: string, currentDraft: string): NewEssay {
  return {
    applicationId: null,
    collegeId: null,
    title,
    prompt: null,
    limitType: 'words',
    limitValue: 650,
    brainstormNotes: null,
    outline: null,
    currentDraft,
    status: 'drafting',
    dueAt: null,
  };
}

describe('file storage persistence', () => {
  it('starts empty on first run rather than seeding sample data', async () => {
    const { app } = open();
    expect(await app.listColleges(USER)).toEqual([]);
    expect(await app.getProfile(USER)).toBeNull();
  });

  it('keeps a record across a restart', async () => {
    const first = open();
    await first.app.createCollege(USER, aCollege('Example State University'));
    await first.store.flush();

    // A brand new store over the same path, as if the app had been quit and
    // reopened. Nothing is shared with the instance above but the file.
    const second = open();
    expect((await second.app.listColleges(USER)).map((c) => c.name)).toEqual([
      'Example State University',
    ]);
  });

  it('writes an essay draft through to the file', async () => {
    const { app, store } = open();
    const essay = await app.createEssay(
      USER,
      anEssay('Personal statement', 'The first thing I built was a compost bin.'),
    );
    await store.flush();

    const essays = onDisk().essays as { id: string; currentDraft: string }[];
    expect(essays).toHaveLength(1);
    expect(essays[0].id).toBe(essay.id);
    expect(essays[0].currentDraft).toContain('compost bin');
  });

  it('keeps only the final state after a burst of edits', async () => {
    const { app, store } = open();
    const essay = await app.createEssay(USER, anEssay('Draft', 'one'));
    for (const currentDraft of ['two', 'three', 'four']) {
      await app.updateEssay(USER, essay.id, { currentDraft });
    }
    await store.flush();

    const essays = onDisk().essays as { currentDraft: string }[];
    expect(essays[0].currentDraft).toBe('four');
  });

  it('leaves no temp file behind', async () => {
    const { app, store } = open();
    await app.createCollege(USER, aCollege('Example College'));
    await store.flush();

    expect(readdirSync(join(dir, 'nested'))).toEqual(['applypilot-data.json']);
  });

  it('persists a delete, not just an add', async () => {
    const first = open();
    const college = await first.app.createCollege(USER, aCollege('Example College'));
    await first.store.flush();

    await first.app.deleteCollege(USER, college.id);
    await first.store.flush();

    expect(await open().app.listColleges(USER)).toEqual([]);
  });

  it('empties the file immediately when the student deletes everything', async () => {
    const { app } = open();
    await app.createCollege(USER, aCollege('Example College'));
    await app.deleteAllUserData(USER);

    // No flush: delete-everything writes synchronously, because a student who
    // asked for their data to be gone should not have it linger on disk.
    expect(onDisk().colleges).toEqual([]);
    expect(await open().app.listColleges(USER)).toEqual([]);
  });
});

describe('file storage damaged or older files', () => {
  it('does not destroy a file it cannot parse', () => {
    const flat = join(dir, 'applypilot-data.json');
    writeFileSync(flat, '{"essays": [{"currentDraft": "half a sent');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(new FileBundleStore(flat).read().essays).toEqual([]);

    // The unreadable text is still on disk under a name that says what
    // happened, so a student can still recover their words by opening it.
    const salvaged = readdirSync(dir).filter((name) => name.includes('unreadable'));
    expect(salvaged).toHaveLength(1);
    expect(readFileSync(join(dir, salvaged[0]), 'utf8')).toContain('half a sent');
  });

  it('fills in collections an older file is missing instead of crashing', async () => {
    const flat = join(dir, 'applypilot-data.json');
    writeFileSync(flat, JSON.stringify({ profile: null, colleges: [], essays: [] }));

    const { app } = open(flat);
    expect(await app.listScholarships(USER)).toEqual([]);
    expect(await app.listTasks(USER)).toEqual([]);
  });

  it('ignores a collection that is present but not a list', async () => {
    const flat = join(dir, 'applypilot-data.json');
    writeFileSync(flat, JSON.stringify({ colleges: 'not a list', tasks: null }));

    const { app } = open(flat);
    expect(await app.listColleges(USER)).toEqual([]);
    expect(await app.listTasks(USER)).toEqual([]);
  });
});

describe('file storage scoping', () => {
  it('will not return another user id’s records', async () => {
    const { app } = open();
    const college = await app.createCollege(USER, aCollege('Example College'));

    expect(await app.getCollege(OTHER_USER, college.id)).toBeNull();
    expect(await app.listColleges(OTHER_USER)).toEqual([]);
  });
});
