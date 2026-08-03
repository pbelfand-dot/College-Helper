import { describe, expect, it } from 'vitest';
import {
  buildActivitiesCsv,
  buildChecklistMarkdown,
  buildEssayMarkdown,
  buildJsonExport,
  csvCell,
  escapeMarkdown,
  safeFilename,
} from '@/lib/export/serialize';
import { buildEmptyBundle } from '@/lib/data/demo/seed';
import type { Activity, Essay, UserDataBundle } from '@/lib/domain/types';

const TZ = 'America/New_York';

function bundle(overrides: Partial<UserDataBundle> = {}): UserDataBundle {
  return { ...buildEmptyBundle(), ...overrides };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    userId: 'u1',
    category: 'work',
    organization: 'Garden Centre',
    role: 'Associate',
    startDate: '2025-06-01',
    endDate: null,
    continues: true,
    hoursPerWeek: 12,
    weeksPerYear: 16,
    gradeLevels: ['11', '12'],
    description: 'Weekend shifts.',
    descriptionLimit: 150,
    impactEvidence: null,
    reflectionNotes: null,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function essay(overrides: Partial<Essay> = {}): Essay {
  return {
    id: 'e1',
    userId: 'u1',
    applicationId: null,
    collegeId: null,
    title: 'Personal statement',
    prompt: 'Tell us about yourself.',
    limitType: 'words',
    limitValue: 650,
    brainstormNotes: null,
    outline: null,
    currentDraft: 'One two three.',
    status: 'drafting',
    dueAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('csvCell', () => {
  it('leaves a plain value alone', () => {
    expect(csvCell('hello')).toBe('hello');
  });

  it('renders null and undefined as empty', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes values containing a comma, quote or newline', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  /**
   * A description beginning with `=` would otherwise be evaluated as a formula
   * when the CSV is opened in a spreadsheet.
   */
  it('neutralises a value that a spreadsheet would treat as a formula', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+44 7700 900000')).toBe("'+44 7700 900000");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('@handle')).toBe("'@handle");
  });

  it('quotes and guards a value that is both dangerous and delimited', () => {
    expect(csvCell('=SUM(A1,A2)')).toBe('"\'=SUM(A1,A2)"');
  });
});

describe('buildActivitiesCsv', () => {
  it('writes a header row and one row per activity, in order', () => {
    const csv = buildActivitiesCsv(
      bundle({
        activities: [
          activity({ id: 'a1', organization: 'First', sortOrder: 0 }),
          activity({ id: 'a2', organization: 'Second', sortOrder: 1 }),
        ],
      }),
    );

    const rows = csv.split('\r\n');
    expect(rows[0]).toContain('Organisation');
    expect(rows[1]).toContain('First');
    expect(rows[2]).toContain('Second');
    expect(rows).toHaveLength(3);
  });

  it('reports the real character count next to the configured limit', () => {
    const csv = buildActivitiesCsv(
      bundle({ activities: [activity({ description: 'abcde', descriptionLimit: 200 })] }),
    );
    expect(csv).toContain(',5,200,');
  });

  it('escapes a description containing a comma', () => {
    const csv = buildActivitiesCsv(
      bundle({ activities: [activity({ description: 'Sorted, shelved, logged' })] }),
    );
    expect(csv).toContain('"Sorted, shelved, logged"');
  });
});

describe('escapeMarkdown', () => {
  it('escapes formatting characters', () => {
    expect(escapeMarkdown('a *bold* [link](x)')).toBe('a \\*bold\\* \\[link\\]\\(x\\)');
  });

  it('escapes a leading heading marker', () => {
    expect(escapeMarkdown('# not a heading')).toBe('\\# not a heading');
  });
});

describe('buildEssayMarkdown', () => {
  it('includes the title, prompt as a quote, and the draft', () => {
    const markdown = buildEssayMarkdown(essay(), TZ);
    expect(markdown).toContain('# Personal statement');
    expect(markdown).toContain('> Tell us about yourself.');
    expect(markdown).toContain('One two three.');
  });

  it('reports the word count against the configured limit', () => {
    expect(buildEssayMarkdown(essay(), TZ)).toContain('3 / 650 words');
  });

  it('says so plainly when there is no draft yet', () => {
    expect(buildEssayMarkdown(essay({ currentDraft: '' }), TZ)).toContain(
      '*No draft written yet.*',
    );
  });

  it('always carries the verify-on-the-official-site reminder', () => {
    expect(buildEssayMarkdown(essay(), TZ)).toContain('official application site');
  });
});

describe('buildChecklistMarkdown', () => {
  it('states the independence disclaimer', () => {
    const markdown = buildChecklistMarkdown(bundle(), TZ);
    expect(markdown).toContain('not affiliated with the Common Application');
  });

  it('handles an empty workspace without throwing', () => {
    expect(buildChecklistMarkdown(bundle(), TZ)).toContain(
      'You have not created any applications yet.',
    );
  });

  it('reports checklist completion as a fraction, not a bare score', () => {
    const markdown = buildChecklistMarkdown(
      bundle({
        colleges: [
          {
            id: 'c1',
            userId: 'u1',
            name: 'Example College',
            city: null,
            stateOrRegion: null,
            country: null,
            institutionType: null,
            websiteUrl: null,
            admissionsUrl: null,
            financialAidUrl: null,
            majors: [],
            tags: [],
            listStatus: 'applying',
            fitNotes: null,
            academicNotes: null,
            campusNotes: null,
            costNotes: null,
            sourceNotes: null,
            lastVerifiedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        applications: [
          {
            id: 'app1',
            userId: 'u1',
            collegeId: 'c1',
            applicationRound: 'early-action',
            deadlineAt: '2026-11-01T03:59:00.000Z',
            deadlineTimeZone: TZ,
            status: 'in-progress',
            submittedAt: null,
            decisionResult: 'pending',
            decisionAt: null,
            feeAmount: null,
            feeWaiverStatus: 'not-applicable',
            testingPlan: 'not-decided',
            transcriptStatus: 'not-started',
            notes: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        requirements: [
          {
            id: 'r1',
            userId: 'u1',
            applicationId: 'app1',
            type: 'essay',
            title: 'Supplemental essay',
            description: null,
            required: true,
            status: 'complete',
            dueAt: null,
            sourceUrl: null,
            sortOrder: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'r2',
            userId: 'u1',
            applicationId: 'app1',
            type: 'transcript',
            title: 'Transcript',
            description: null,
            required: true,
            status: 'not-started',
            dueAt: null,
            sourceUrl: null,
            sortOrder: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      TZ,
    );

    expect(markdown).toContain('**Checklist completion:** 50% (1 of 2 required items)');
    expect(markdown).toContain('- [x] Supplemental essay');
    expect(markdown).toContain('- [ ] Transcript');
  });

  it('shows the deadline with its year and time zone', () => {
    const markdown = buildChecklistMarkdown(
      bundle({
        applications: [
          {
            id: 'app1',
            userId: 'u1',
            collegeId: 'missing',
            applicationRound: 'regular-decision',
            deadlineAt: '2026-11-01T03:59:00.000Z',
            deadlineTimeZone: TZ,
            status: 'planning',
            submittedAt: null,
            decisionResult: 'pending',
            decisionAt: null,
            feeAmount: null,
            feeWaiverStatus: 'not-applicable',
            testingPlan: 'not-decided',
            transcriptStatus: 'not-started',
            notes: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      TZ,
    );
    expect(markdown).toMatch(/Oct 31, 2026 at 11:59 PM EDT/);
  });
});

describe('buildJsonExport', () => {
  it('wraps the data in a versioned envelope with a notice', () => {
    const parsed = JSON.parse(buildJsonExport(bundle(), new Date('2026-08-01T00:00:00.000Z')));
    expect(parsed.format).toBe('applypilot-export');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(parsed.notice).toContain('independent planning tool');
    expect(parsed.data).toHaveProperty('colleges');
  });

  it('round-trips the data unchanged', () => {
    const original = bundle({ activities: [activity()] });
    const parsed = JSON.parse(buildJsonExport(original));
    expect(parsed.data.activities[0].organization).toBe('Garden Centre');
  });
});

describe('safeFilename', () => {
  it('slugifies a plain title', () => {
    expect(safeFilename('My Personal Statement', 'md')).toBe('My-Personal-Statement.md');
  });

  it('strips path separators so a name cannot escape the download folder', () => {
    expect(safeFilename('../../etc/passwd', 'json')).toBe('etcpasswd.json');
  });

  it('strips leading dots so it cannot produce a hidden file', () => {
    expect(safeFilename('...hidden', 'md')).toBe('hidden.md');
  });

  it('falls back when nothing usable is left', () => {
    expect(safeFilename('***', 'csv')).toBe('applypilot-export.csv');
    expect(safeFilename('', 'csv')).toBe('applypilot-export.csv');
  });

  it('bounds the length', () => {
    expect(safeFilename('a'.repeat(200), 'md').length).toBeLessThanOrEqual(64);
  });

  it('sanitises the extension too', () => {
    expect(safeFilename('notes', 'md/../sh')).toBe('notes.mdsh');
  });
});
