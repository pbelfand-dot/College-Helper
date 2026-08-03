import { describe, expect, it } from 'vitest';
import {
  activitySchema,
  applicationSchema,
  coachRequestSchema,
  collegeSchema,
  essaySchema,
  requirementSchema,
  taskSchema,
} from '@/lib/validation/schemas';

/**
 * These tests exist because of a real bug: Zod treats a *missing* object key
 * differently from an explicit `undefined`, and HTML forms omit unchecked
 * checkboxes and unselected fields entirely. Every optional field therefore has
 * to survive its key simply not being there.
 */

describe('collegeSchema', () => {
  it('accepts a college with only a name', () => {
    const result = collegeSchema.safeParse({ name: 'Example College' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBeNull();
      expect(result.data.majors).toEqual([]);
      expect(result.data.listStatus).toBe('exploring');
    }
  });

  it('rejects a blank name', () => {
    expect(collegeSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('turns an unselected institution type into null instead of failing', () => {
    const result = collegeSchema.safeParse({ name: 'Example', institutionType: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.institutionType).toBeNull();
  });

  it('rejects a javascript: URL', () => {
    const result = collegeSchema.safeParse({
      name: 'Example',
      websiteUrl: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });

  it('accepts https URLs', () => {
    const result = collegeSchema.safeParse({ name: 'Example', websiteUrl: 'https://example.edu' });
    expect(result.success).toBe(true);
  });

  it('splits and de-duplicates comma-separated tags', () => {
    const result = collegeSchema.safeParse({ name: 'Example', tags: 'a, b , a,  ,c' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual(['a', 'b', 'c']);
  });
});

describe('applicationSchema', () => {
  const collegeId = '11111111-1111-4111-8111-111111111111';

  it('accepts a minimal application', () => {
    const result = applicationSchema.safeParse({
      collegeId,
      deadlineTimeZone: 'America/New_York',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('planning');
      expect(result.data.feeAmount).toBeNull();
    }
  });

  it('rejects a college id that is not a uuid', () => {
    const result = applicationSchema.safeParse({
      collegeId: 'not-a-uuid',
      deadlineTimeZone: 'America/New_York',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unrecognised time zone', () => {
    const result = applicationSchema.safeParse({
      collegeId,
      deadlineTimeZone: 'Mars/Olympus_Mons',
    });
    expect(result.success).toBe(false);
  });

  it('parses a currency-formatted fee', () => {
    const result = applicationSchema.safeParse({
      collegeId,
      deadlineTimeZone: 'UTC',
      feeAmount: '$1,250.50',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.feeAmount).toBe(1250.5);
  });

  it('rejects a negative fee', () => {
    const result = applicationSchema.safeParse({
      collegeId,
      deadlineTimeZone: 'UTC',
      feeAmount: '-5',
    });
    expect(result.success).toBe(false);
  });
});

describe('requirementSchema', () => {
  const applicationId = '22222222-2222-4222-8222-222222222222';

  it('defaults `required` to false when the checkbox is absent', () => {
    const result = requirementSchema.safeParse({ applicationId, title: 'Transcript' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.required).toBe(false);
  });

  it('reads "on" from a ticked checkbox', () => {
    const result = requirementSchema.safeParse({
      applicationId,
      title: 'Transcript',
      required: 'on',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.required).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(requirementSchema.safeParse({ applicationId, title: '' }).success).toBe(false);
  });
});

describe('essaySchema', () => {
  it('requires a limit value unless the limit type is none', () => {
    expect(
      essaySchema.safeParse({ title: 'Personal statement', limitType: 'words', limitValue: '' })
        .success,
    ).toBe(false);

    expect(essaySchema.safeParse({ title: 'Personal statement', limitType: 'none' }).success).toBe(
      true,
    );
  });

  it('accepts a limit value with a words limit', () => {
    const result = essaySchema.safeParse({
      title: 'Personal statement',
      limitType: 'words',
      limitValue: '650',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limitValue).toBe(650);
  });

  it('turns unselected college and application links into null', () => {
    const result = essaySchema.safeParse({
      title: 'Personal statement',
      limitType: 'none',
      collegeId: '',
      applicationId: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.collegeId).toBeNull();
      expect(result.data.applicationId).toBeNull();
    }
  });
});

describe('activitySchema', () => {
  it('accepts an activity with only an organisation', () => {
    const result = activitySchema.safeParse({ organization: 'Robotics' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descriptionLimit).toBe(150);
      expect(result.data.continues).toBe(false);
      expect(result.data.gradeLevels).toEqual([]);
    }
  });

  it('keeps the character limit configurable within sane bounds', () => {
    expect(activitySchema.safeParse({ organization: 'A', descriptionLimit: '10' }).success).toBe(
      false,
    );
    expect(activitySchema.safeParse({ organization: 'A', descriptionLimit: '250' }).success).toBe(
      true,
    );
  });

  it('rejects impossible hours per week', () => {
    expect(activitySchema.safeParse({ organization: 'A', hoursPerWeek: '200' }).success).toBe(
      false,
    );
  });
});

describe('taskSchema', () => {
  it('accepts a task with only a title and time zone', () => {
    const result = taskSchema.safeParse({ title: 'Email the office', timeZone: 'UTC' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('medium');
      expect(result.data.applicationId).toBeNull();
    }
  });
});

describe('coachRequestSchema', () => {
  it('accepts a request without the optional link fields', () => {
    const result = coachRequestSchema.safeParse({ mode: 'essay-feedback', message: 'help' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.essayId).toBeNull();
      expect(result.data.includeDraft).toBe(false);
    }
  });

  it('rejects an unknown coaching mode', () => {
    expect(coachRequestSchema.safeParse({ mode: 'write-it-for-me', message: '' }).success).toBe(
      false,
    );
  });

  it('rejects a message beyond the input limit', () => {
    const result = coachRequestSchema.safeParse({
      mode: 'profile',
      message: 'x'.repeat(8_001),
    });
    expect(result.success).toBe(false);
  });
});
