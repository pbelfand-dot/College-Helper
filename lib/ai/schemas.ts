import { z } from 'zod';
import { COACH_MODES } from '@/lib/domain/types';

/**
 * Structured output contracts.
 *
 * Model output is parsed against these before anything reaches the screen. If a
 * response does not fit, the UI shows a retry state rather than rendering
 * whatever came back.
 *
 * Note the absence of any score, rating, percentage or admission likelihood
 * field anywhere in this file. There is nowhere for a model to put one.
 */

const line = z.string().trim().min(1).max(600);
const shortLine = z.string().trim().min(1).max(280);
const list = (max = 8) => z.array(line).max(max).default([]);

/** Shown whenever the coach asserts something the student did not supply. */
export const cautionSchema = z.object({
  claim: shortLine,
  why: line,
});

export const profileCoachSchema = z.object({
  strengthsAlreadySupported: list(8),
  missingDetails: list(8),
  reflectionQuestions: list(8),
  suggestedNextSteps: list(8),
  cautionFlags: z.array(cautionSchema).max(6).default([]),
});
export type ProfileCoachOutput = z.infer<typeof profileCoachSchema>;

export const collegeResearchSchema = z.object({
  factsYouProvided: list(10),
  questionsToVerifyOnOfficialSources: list(10),
  academicFitConsiderations: list(8),
  campusAndLifestyleConsiderations: list(8),
  costAndAidQuestions: list(8),
  sourceChecklist: list(8),
});
export type CollegeResearchOutput = z.infer<typeof collegeResearchSchema>;

export const essayBrainstormSchema = z.object({
  possibleThemes: list(8),
  reflectionQuestions: list(10),
  scenesToExplore: list(8),
  tensionsOrChanges: list(6),
  valuesDemonstrated: list(8),
  clichesToAvoid: list(8),
});
export type EssayBrainstormOutput = z.infer<typeof essayBrainstormSchema>;

export const sentenceSuggestionSchema = z.object({
  original: z.string().trim().min(1).max(1200),
  suggestion: z.string().trim().min(1).max(1200),
  /** Always required: a suggestion without a reason is not coaching. */
  why: line,
});

export const essayFeedbackSchema = z.object({
  overallReading: z.string().trim().min(1).max(1200),
  whatIsMemorable: list(6),
  whatIsUnclear: list(6),
  specificityIssues: list(6),
  structureObservations: list(6),
  voiceObservations: list(6),
  repetition: list(6),
  possibleCuts: list(6),
  revisionPriorities: list(6),
  sentenceSuggestions: z.array(sentenceSuggestionSchema).max(8).default([]),
});
export type EssayFeedbackOutput = z.infer<typeof essayFeedbackSchema>;

export const activityVersionSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  characterCount: z.number().int().min(0).max(5000),
});

export const activityCoachSchema = z.object({
  supportedActionVerbs: list(10),
  detailsWorthPrioritising: list(8),
  weakOrVagueWording: list(8),
  possibleVersions: z.array(activityVersionSchema).max(5).default([]),
  unsupportedClaimWarnings: z.array(cautionSchema).max(6).default([]),
});
export type ActivityCoachOutput = z.infer<typeof activityCoachSchema>;

export const workSessionSchema = z.object({
  when: shortLine,
  focus: line,
  approximateMinutes: z.number().int().min(5).max(600),
});

export const deadlinePlanSchema = z.object({
  prioritisedTasks: list(10),
  recommendedWorkSessions: z.array(workSessionSchema).max(10).default([]),
  dependencies: list(8),
  bufferSuggestions: list(6),
  overloadedDates: list(6),
  tasksNeedingVerification: list(8),
});
export type DeadlinePlanOutput = z.infer<typeof deadlinePlanSchema>;

export const coachModeSchema = z.enum(COACH_MODES);

/** One place mapping a mode to its output contract. */
export const outputSchemas = {
  profile: profileCoachSchema,
  'college-research': collegeResearchSchema,
  'essay-brainstorm': essayBrainstormSchema,
  'essay-feedback': essayFeedbackSchema,
  'activity-description': activityCoachSchema,
  'deadline-planning': deadlinePlanSchema,
} as const;

export type CoachOutput =
  | ProfileCoachOutput
  | CollegeResearchOutput
  | EssayBrainstormOutput
  | EssayFeedbackOutput
  | ActivityCoachOutput
  | DeadlinePlanOutput;

/**
 * Returns a mode's schema widened to the union output type.
 *
 * `outputSchemas[mode]` is a union of six distinct `ZodObject`s, which TypeScript
 * cannot narrow against a generic caller. The runtime value is unchanged and the
 * schema still validates exactly as strictly — this only relaxes the static type
 * at the one boundary where the mode is a variable.
 */
export function schemaForMode(mode: keyof typeof outputSchemas): z.ZodType<CoachOutput> {
  return outputSchemas[mode] as unknown as z.ZodType<CoachOutput>;
}

export const schemaNames = {
  profile: 'ProfileCoachResponse',
  'college-research': 'CollegeResearchResponse',
  'essay-brainstorm': 'EssayBrainstormResponse',
  'essay-feedback': 'EssayFeedbackResponse',
  'activity-description': 'ActivityDescriptionResponse',
  'deadline-planning': 'DeadlinePlanResponse',
} as const;
