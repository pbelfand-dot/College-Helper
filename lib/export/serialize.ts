/**
 * Export generation.
 *
 * Pure functions: a data bundle in, a string out. Nothing here reads a session
 * or touches storage, which keeps escaping rules easy to test and makes it
 * impossible for an export helper to reach data it was not handed.
 */

import { calculateChecklistCompletion } from '@/lib/domain/progress';
import { evaluateCount, formatCount } from '@/lib/domain/counting';
import { formatDate, formatDeadline } from '@/lib/dates/format';
import {
  activityCategoryLabels,
  applicationRoundLabels,
  applicationStatusLabels,
  decisionResultLabels,
  essayStatusLabels,
  listStatusLabels,
  recommenderStatusLabels,
  requirementStatusLabels,
  requirementTypeLabels,
  scholarshipStatusLabels,
} from '@/lib/domain/labels';
import type { Essay, UserDataBundle } from '@/lib/domain/types';

/** Bumped whenever the JSON shape changes, so an importer can tell. */
export const EXPORT_FORMAT_VERSION = 1;

export interface ExportEnvelope {
  format: 'applypilot-export';
  version: number;
  exportedAt: string;
  notice: string;
  data: UserDataBundle;
}

export function buildJsonExport(bundle: UserDataBundle, exportedAt = new Date()): string {
  const envelope: ExportEnvelope = {
    format: 'applypilot-export',
    version: EXPORT_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    notice:
      'Exported from ApplyPilot, an independent planning tool. This file contains only your own records. Deadlines and requirements recorded here are your notes — confirm them on each college’s official website.',
    data: bundle,
  };
  return JSON.stringify(envelope, null, 2);
}

// --- CSV --------------------------------------------------------------------

/**
 * Escapes one CSV field.
 *
 * Quotes anything containing a delimiter, quote or newline, and prefixes a
 * leading `=`, `+`, `-` or `@` with an apostrophe so a spreadsheet treats the
 * value as text rather than a formula.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function buildActivitiesCsv(bundle: UserDataBundle): string {
  const header = [
    'Order',
    'Category',
    'Organisation',
    'Role',
    'Start date',
    'End date',
    'Still doing it',
    'Hours per week',
    'Weeks per year',
    'Years involved',
    'Description',
    'Characters used',
    'Character limit',
    'Evidence',
  ];

  const rows = bundle.activities.map((activity, index) => [
    index + 1,
    activityCategoryLabels[activity.category],
    activity.organization,
    activity.role,
    activity.startDate,
    activity.endDate,
    activity.continues ? 'yes' : 'no',
    activity.hoursPerWeek,
    activity.weeksPerYear,
    activity.gradeLevels.join(' '),
    activity.description,
    [...activity.description].length,
    activity.descriptionLimit,
    activity.impactEvidence,
  ]);

  return buildCsv([header, ...rows]);
}

// --- Markdown ---------------------------------------------------------------

/** Neutralises characters that would otherwise become Markdown formatting. */
export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

export function buildEssayMarkdown(essay: Essay, timeZone: string): string {
  const count = evaluateCount(essay.currentDraft, essay.limitType, essay.limitValue);

  const lines = [
    `# ${essay.title}`,
    '',
    `*${essayStatusLabels[essay.status]} · ${formatCount(count)}*`,
    essay.dueAt ? `*Your due date: ${formatDate(essay.dueAt, timeZone)}*` : '',
    '',
  ];

  if (essay.prompt) {
    lines.push('## Prompt', '', ...essay.prompt.split('\n').map((line) => `> ${line}`), '');
  }

  lines.push('## Draft', '', essay.currentDraft || '*No draft written yet.*', '');

  if (essay.outline) {
    lines.push('## Outline', '', essay.outline, '');
  }
  if (essay.brainstormNotes) {
    lines.push('## Brainstorm notes', '', essay.brainstormNotes, '');
  }

  lines.push(
    '---',
    '',
    '*Exported from ApplyPilot. Confirm the current prompt and word limit on the official application site.*',
  );

  return lines.join('\n');
}

export function buildAllEssaysMarkdown(bundle: UserDataBundle, timeZone: string): string {
  if (bundle.essays.length === 0) {
    return '# Essays\n\nYou have not created any essays yet.\n';
  }
  return bundle.essays
    .map((essay) => buildEssayMarkdown(essay, timeZone))
    .join('\n\n\\pagebreak\n\n');
}

/** The human-readable "where does everything stand" document. */
export function buildChecklistMarkdown(bundle: UserDataBundle, timeZone: string): string {
  const collegeNames = new Map(bundle.colleges.map((college) => [college.id, college.name]));
  const lines: string[] = [
    '# Application checklist',
    '',
    `*Exported from ApplyPilot on ${formatDate(new Date().toISOString(), timeZone)}.*`,
    '',
    'ApplyPilot is an independent planning tool and is not affiliated with the Common Application,',
    'the Coalition Application, or any college. Every deadline and requirement below is something you',
    'recorded yourself — confirm each one on the college’s official website before you rely on it.',
    '',
  ];

  if (bundle.applications.length === 0) {
    lines.push('You have not created any applications yet.', '');
  }

  for (const application of bundle.applications) {
    const name = collegeNames.get(application.collegeId) ?? 'Application';
    const requirements = bundle.requirements.filter(
      (requirement) => requirement.applicationId === application.id,
    );
    const completion = calculateChecklistCompletion(requirements);

    lines.push(
      `## ${escapeMarkdown(name)}`,
      '',
      `- **Round:** ${applicationRoundLabels[application.applicationRound]}`,
      `- **Status:** ${applicationStatusLabels[application.status]}`,
      `- **Deadline:** ${
        application.deadlineAt
          ? formatDeadline(application.deadlineAt, application.deadlineTimeZone)
          : 'not recorded'
      }`,
      `- **Checklist completion:** ${
        completion.percent === null
          ? 'no required items yet'
          : `${completion.percent}% (${completion.completed} of ${completion.total} required items)`
      }`,
      application.decisionResult !== 'pending'
        ? `- **Decision:** ${decisionResultLabels[application.decisionResult]}`
        : '',
      '',
    );

    if (requirements.length > 0) {
      lines.push('### Requirements', '');
      for (const requirement of requirements) {
        const box = requirement.status === 'complete' ? '[x]' : '[ ]';
        const detail = [
          requirementTypeLabels[requirement.type],
          requirement.required ? 'required' : 'optional',
          requirementStatusLabels[requirement.status],
          requirement.dueAt ? `due ${formatDate(requirement.dueAt, timeZone)}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        lines.push(`- ${box} ${escapeMarkdown(requirement.title)} — ${detail}`);
      }
      lines.push('');
    }

    const essays = bundle.essays.filter((essay) => essay.applicationId === application.id);
    if (essays.length > 0) {
      lines.push('### Essays', '');
      for (const essay of essays) {
        const count = evaluateCount(essay.currentDraft, essay.limitType, essay.limitValue);
        lines.push(
          `- ${escapeMarkdown(essay.title)} — ${essayStatusLabels[essay.status]}, ${formatCount(count)}`,
        );
      }
      lines.push('');
    }

    const linkedIds = bundle.applicationRecommenders
      .filter((link) => link.applicationId === application.id)
      .map((link) => link.recommenderId);
    const recommenders = bundle.recommenders.filter((entry) => linkedIds.includes(entry.id));
    if (recommenders.length > 0) {
      lines.push('### Recommenders', '');
      for (const recommender of recommenders) {
        lines.push(
          `- ${escapeMarkdown(recommender.name)} — ${recommenderStatusLabels[recommender.status]}`,
        );
      }
      lines.push('');
    }
  }

  if (bundle.colleges.length > 0) {
    lines.push('## College list', '');
    for (const college of bundle.colleges) {
      lines.push(
        `- ${escapeMarkdown(college.name)} — ${listStatusLabels[college.listStatus]}${
          college.lastVerifiedAt
            ? ` (last verified ${formatDate(college.lastVerifiedAt, timeZone)})`
            : ' (never verified)'
        }`,
      );
    }
    lines.push('');
  }

  if (bundle.scholarships.length > 0) {
    lines.push('## Scholarships', '');
    for (const scholarship of bundle.scholarships) {
      lines.push(
        `- ${escapeMarkdown(scholarship.title)} — ${scholarshipStatusLabels[scholarship.status]}${
          scholarship.deadlineAt
            ? `, due ${formatDeadline(scholarship.deadlineAt, scholarship.deadlineTimeZone)}`
            : ''
        }`,
      );
    }
    lines.push(
      '',
      '*Scholarship listings change and close without notice. Check the official source.*',
      '',
    );
  }

  const openTasks = bundle.tasks.filter((task) => task.completedAt === null);
  if (openTasks.length > 0) {
    lines.push('## Open tasks', '');
    for (const task of openTasks) {
      lines.push(
        `- [ ] ${escapeMarkdown(task.title)}${
          task.dueAt ? ` — due ${formatDate(task.dueAt, task.timeZone || timeZone)}` : ''
        }`,
      );
    }
    lines.push('');
  }

  return lines.filter((line) => line !== undefined).join('\n');
}

/**
 * Builds a safe download filename.
 *
 * Strips path separators, control characters and leading dots so a
 * user-supplied title can never escape the download directory or produce a
 * hidden file, and always appends the extension we chose.
 */
export function safeFilename(base: string, extension: string): string {
  const cleaned = base
    .normalize('NFKD')
    // Control characters, path separators and anything not word/space/dash.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 60);

  const safeBase = cleaned.length > 0 ? cleaned : 'applypilot-export';
  return `${safeBase}.${extension.replace(/[^a-z0-9]/gi, '')}`;
}
