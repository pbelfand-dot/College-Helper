import 'server-only';

import { AI_INPUT_LIMITS } from '@/lib/validation/schemas';
import type { ApplyPilotRepository } from '@/lib/data/repository';
import { collectDeadlines } from '@/lib/domain/deadlines';
import { formatDeadline } from '@/lib/dates/format';
import type { CoachMode } from '@/lib/domain/types';

/**
 * Assembles the student material for a coaching request.
 *
 * Three rules this module exists to enforce:
 *  1. nothing is attached that the request did not explicitly ask for;
 *  2. every referenced record is fetched with the caller's own user id, so a
 *     crafted request cannot pull in somebody else's essay;
 *  3. the result is exactly what the preview shows the student before they
 *     send — the same function builds both.
 */

export interface CoachContextRequest {
  mode: CoachMode;
  userId: string;
  repository: ApplyPilotRepository;
  includeDraft: boolean;
  essayId: string | null;
  activityId: string | null;
  collegeId: string | null;
}

export interface CoachContext {
  material: { label: string; content: string }[];
  voiceNotes: string | null;
  /** Records the student referenced that could not be found or are not theirs. */
  missing: string[];
}

function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[trimmed to fit the request limit]`;
}

export async function buildCoachContext(request: CoachContextRequest): Promise<CoachContext> {
  const { repository, userId, mode } = request;
  const material: { label: string; content: string }[] = [];
  const missing: string[] = [];

  const profile = await repository.getProfile(userId);

  if (mode === 'profile') {
    if (profile) {
      material.push({
        label: 'Your profile',
        content: [
          profile.intendedMajors.length > 0
            ? `Possible majors: ${profile.intendedMajors.join(', ')}`
            : '',
          profile.interests.length > 0 ? `Interests: ${profile.interests.join(', ')}` : '',
          profile.region ? `Region: ${profile.region}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }

    const activities = await repository.listActivities(userId);
    if (activities.length > 0) {
      material.push({
        label: 'Your activities, as you wrote them',
        content: clamp(
          activities
            .map((activity) =>
              [
                `${activity.organization}${activity.role ? ` — ${activity.role}` : ''}`,
                activity.description,
                activity.impactEvidence ? `Evidence: ${activity.impactEvidence}` : '',
                activity.reflectionNotes ? `Reflection: ${activity.reflectionNotes}` : '',
              ]
                .filter(Boolean)
                .join('\n'),
            )
            .join('\n\n'),
          AI_INPUT_LIMITS.context,
        ),
      });
    }
  }

  if (request.essayId) {
    const essay = await repository.getEssay(userId, request.essayId);
    if (!essay) {
      missing.push('the essay you selected');
    } else {
      if (essay.prompt) {
        material.push({ label: 'The essay prompt', content: clamp(essay.prompt, 2000) });
      }
      if (essay.brainstormNotes) {
        material.push({
          label: 'Your brainstorm notes',
          content: clamp(essay.brainstormNotes, AI_INPUT_LIMITS.context),
        });
      }
      if (essay.outline) {
        material.push({ label: 'Your outline', content: clamp(essay.outline, AI_INPUT_LIMITS.context) });
      }
      // The draft is the most private thing here, so it is opt-in per request.
      if (request.includeDraft && essay.currentDraft.trim().length > 0) {
        material.push({
          label: 'Your current draft',
          content: clamp(essay.currentDraft, AI_INPUT_LIMITS.draft),
        });
      }
    }
  }

  if (request.activityId) {
    const activity = await repository.getActivity(userId, request.activityId);
    if (!activity) {
      missing.push('the activity you selected');
    } else {
      material.push({
        label: 'The activity, as you described it',
        content: clamp(
          [
            `Organisation: ${activity.organization}`,
            activity.role ? `Role: ${activity.role}` : '',
            activity.hoursPerWeek !== null ? `Hours per week: ${activity.hoursPerWeek}` : '',
            activity.weeksPerYear !== null ? `Weeks per year: ${activity.weeksPerYear}` : '',
            `Character limit you set: ${activity.descriptionLimit}`,
            '',
            'Description as written:',
            activity.description || '(nothing written yet)',
            activity.impactEvidence ? `\nEvidence you noted: ${activity.impactEvidence}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          AI_INPUT_LIMITS.context,
        ),
      });
    }
  }

  if (request.collegeId) {
    const college = await repository.getCollege(userId, request.collegeId);
    if (!college) {
      missing.push('the college you selected');
    } else {
      material.push({
        label: `Your notes on ${college.name}`,
        content: clamp(
          [
            college.majors.length > 0 ? `Majors you are looking at: ${college.majors.join(', ')}` : '',
            college.fitNotes ? `Why it interests you: ${college.fitNotes}` : '',
            college.academicNotes ? `Academic notes: ${college.academicNotes}` : '',
            college.campusNotes ? `Campus notes: ${college.campusNotes}` : '',
            college.costNotes ? `Cost questions: ${college.costNotes}` : '',
            college.sourceNotes ? `Sources: ${college.sourceNotes}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          AI_INPUT_LIMITS.context,
        ),
      });
    }
  }

  if (mode === 'deadline-planning') {
    const [applications, colleges, essays, recommenders, scholarships, tasks] = await Promise.all([
      repository.listApplications(userId),
      repository.listColleges(userId),
      repository.listEssays(userId),
      repository.listRecommenders(userId),
      repository.listScholarships(userId),
      repository.listTasks(userId),
    ]);

    const timeZone = profile?.timeZone ?? 'UTC';
    const deadlines = collectDeadlines({
      applications,
      colleges,
      essays,
      recommenders,
      scholarships,
      tasks,
      fallbackTimeZone: timeZone,
    }).filter((item) => !item.done);

    material.push({
      label: 'Your upcoming deadlines',
      content: clamp(
        deadlines.length === 0
          ? '(no deadlines recorded)'
          : deadlines
              .slice(0, 40)
              .map(
                (item) =>
                  `${item.title}${item.subtitle ? ` (${item.subtitle})` : ''} — ${formatDeadline(item.dueAt, item.timeZone)}`,
              )
              .join('\n'),
        AI_INPUT_LIMITS.context,
      ),
    });
  }

  return {
    material,
    voiceNotes: profile?.writingVoiceNotes ?? null,
    missing,
  };
}
