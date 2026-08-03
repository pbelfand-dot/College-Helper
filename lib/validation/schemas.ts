/**
 * Server-side validation for every mutation.
 *
 * These schemas are the single boundary between untrusted input and the
 * repository. Server actions parse with them before touching storage; forms
 * reuse them client-side purely as a convenience.
 *
 * Deliberately absent: any field for Social Security numbers, bank details,
 * government id numbers, or demographic data the product does not need.
 */

import { z } from 'zod';
import {
  ACTIVITY_CATEGORIES,
  APPLICATION_ROUNDS,
  APPLICATION_STATUSES,
  COACH_MODES,
  CURRENT_GRADES,
  DECISION_RESULTS,
  ESSAY_STATUSES,
  FEE_WAIVER_STATUSES,
  INSTITUTION_TYPES,
  LIMIT_TYPES,
  LIST_STATUSES,
  RECOMMENDER_STATUSES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  SCHOLARSHIP_STATUSES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TESTING_PLANS,
  THANK_YOU_STATUSES,
  TRANSCRIPT_STATUSES,
  VERSION_SOURCES,
} from '@/lib/domain/types';
import {
  checkboxBoolean,
  idSchema,
  optionalEmail,
  optionalIsoDate,
  optionalMoney,
  optionalPositiveInt,
  optionalText,
  optionalUrl,
  requiredText,
  tagList,
  timeZoneSchema,
} from './common';

/** Upper bounds on free text. Generous, but bounded so nothing unbounded is stored. */
export const TEXT_LIMITS = {
  shortName: 160,
  longName: 200,
  notes: 5_000,
  prompt: 4_000,
  draft: 60_000,
  description: 3_000,
} as const;

// --- Profile ----------------------------------------------------------------

export const profileSchema = z.object({
  displayName: requiredText(80, 'Name'),
  graduationYear: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => value === null || (Number.isInteger(value) && value >= 2000 && value <= 2100), {
      message: 'Enter a graduation year between 2000 and 2100.',
    })
    .nullable(),
  currentGrade: z.enum(CURRENT_GRADES).nullable().default(null),
  region: optionalText(120, 'Region'),
  intendedMajors: tagList(20, 80),
  interests: tagList(30, 80),
  applicationSeason: optionalText(60, 'Application season'),
  timeZone: timeZoneSchema,
  writingVoiceNotes: optionalText(TEXT_LIMITS.notes, 'Voice notes'),
});
export type ProfileInput = z.input<typeof profileSchema>;

// --- College ----------------------------------------------------------------

export const collegeSchema = z.object({
  name: requiredText(TEXT_LIMITS.longName, 'College name'),
  city: optionalText(120, 'City'),
  stateOrRegion: optionalText(120, 'State or region'),
  country: optionalText(120, 'Country'),
  institutionType: z.enum(INSTITUTION_TYPES).nullable().default(null),
  websiteUrl: optionalUrl,
  admissionsUrl: optionalUrl,
  financialAidUrl: optionalUrl,
  majors: tagList(30, 80),
  tags: tagList(20, 40),
  listStatus: z.enum(LIST_STATUSES).default('exploring'),
  fitNotes: optionalText(TEXT_LIMITS.notes, 'Fit notes'),
  academicNotes: optionalText(TEXT_LIMITS.notes, 'Academic notes'),
  campusNotes: optionalText(TEXT_LIMITS.notes, 'Campus notes'),
  costNotes: optionalText(TEXT_LIMITS.notes, 'Cost notes'),
  sourceNotes: optionalText(TEXT_LIMITS.notes, 'Source notes'),
  lastVerifiedAt: optionalIsoDate,
});
export type CollegeInput = z.input<typeof collegeSchema>;

// --- Application ------------------------------------------------------------

export const applicationSchema = z.object({
  collegeId: idSchema,
  applicationRound: z.enum(APPLICATION_ROUNDS).default('regular-decision'),
  deadlineAt: optionalIsoDate,
  deadlineTimeZone: timeZoneSchema,
  status: z.enum(APPLICATION_STATUSES).default('planning'),
  submittedAt: optionalIsoDate,
  decisionResult: z.enum(DECISION_RESULTS).default('pending'),
  decisionAt: optionalIsoDate,
  feeAmount: optionalMoney,
  feeWaiverStatus: z.enum(FEE_WAIVER_STATUSES).default('not-applicable'),
  testingPlan: z.enum(TESTING_PLANS).default('not-decided'),
  transcriptStatus: z.enum(TRANSCRIPT_STATUSES).default('not-started'),
  notes: optionalText(TEXT_LIMITS.notes, 'Notes'),
});
export type ApplicationInput = z.input<typeof applicationSchema>;

// --- Requirement ------------------------------------------------------------

export const requirementSchema = z.object({
  applicationId: idSchema,
  type: z.enum(REQUIREMENT_TYPES).default('other'),
  title: requiredText(TEXT_LIMITS.shortName, 'Requirement'),
  description: optionalText(TEXT_LIMITS.description, 'Description'),
  required: checkboxBoolean,
  status: z.enum(REQUIREMENT_STATUSES).default('not-started'),
  dueAt: optionalIsoDate,
  sourceUrl: optionalUrl,
});
export type RequirementInput = z.input<typeof requirementSchema>;

export const requirementStatusUpdateSchema = z.object({
  requirementId: idSchema,
  status: z.enum(REQUIREMENT_STATUSES),
});

// --- Essay ------------------------------------------------------------------

export const essaySchema = z
  .object({
    title: requiredText(TEXT_LIMITS.shortName, 'Essay title'),
    applicationId: idSchema.nullable().default(null),
    collegeId: idSchema.nullable().default(null),
    prompt: optionalText(TEXT_LIMITS.prompt, 'Prompt'),
    limitType: z.enum(LIMIT_TYPES).default('words'),
    limitValue: optionalPositiveInt(100_000, 'Limit'),
    status: z.enum(ESSAY_STATUSES).default('not-started'),
    dueAt: optionalIsoDate,
  })
  .refine((value) => value.limitType === 'none' || value.limitValue !== null, {
    message: 'Set a limit value, or choose "No limit".',
    path: ['limitValue'],
  });
export type EssayInput = z.input<typeof essaySchema>;

export const essayDraftSchema = z.object({
  essayId: idSchema,
  currentDraft: z.string().max(TEXT_LIMITS.draft, 'This draft is too long to save.'),
  /** Autosave writes silently; manual saves create a labelled version. */
  source: z.enum(VERSION_SOURCES).default('autosave'),
  note: optionalText(200, 'Version note'),
});

export const essayNotesSchema = z.object({
  essayId: idSchema,
  brainstormNotes: optionalText(TEXT_LIMITS.draft, 'Brainstorm notes'),
  outline: optionalText(TEXT_LIMITS.draft, 'Outline'),
});

export const essayRestoreSchema = z.object({
  essayId: idSchema,
  versionId: idSchema,
});

// --- Activity ---------------------------------------------------------------

export const activitySchema = z.object({
  category: z.enum(ACTIVITY_CATEGORIES).default('other'),
  organization: requiredText(TEXT_LIMITS.shortName, 'Organization'),
  role: optionalText(TEXT_LIMITS.shortName, 'Role'),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
  continues: checkboxBoolean,
  hoursPerWeek: optionalPositiveInt(168, 'Hours per week'),
  weeksPerYear: optionalPositiveInt(52, 'Weeks per year'),
  gradeLevels: tagList(8, 20),
  description: z.string().trim().max(TEXT_LIMITS.description, 'Description is too long.').default(''),
  /** Configurable: application portals change their limits, so we never hardcode one. */
  descriptionLimit: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value >= 20 && value <= 5_000, {
      message: 'Set a character limit between 20 and 5000.',
    })
    .default(150),
  impactEvidence: optionalText(TEXT_LIMITS.description, 'Impact evidence'),
  reflectionNotes: optionalText(TEXT_LIMITS.notes, 'Reflection notes'),
});
export type ActivityInput = z.input<typeof activitySchema>;

export const activityReorderSchema = z.object({
  activityId: idSchema,
  direction: z.enum(['up', 'down']),
});

// --- Recommender ------------------------------------------------------------

export const recommenderSchema = z.object({
  name: requiredText(TEXT_LIMITS.shortName, 'Name'),
  role: optionalText(120, 'Role'),
  organizationOrSubject: optionalText(160, 'Subject or organization'),
  email: optionalEmail,
  dateRequested: optionalIsoDate,
  dueAt: optionalIsoDate,
  status: z.enum(RECOMMENDER_STATUSES).default('not-asked'),
  followUpAt: optionalIsoDate,
  thankYouStatus: z.enum(THANK_YOU_STATUSES).default('not-sent'),
  /**
   * Free notes only. ApplyPilot never stores the letter itself — recommendation
   * letters are confidential between the recommender and the college.
   */
  notes: optionalText(TEXT_LIMITS.notes, 'Notes'),
});
export type RecommenderInput = z.input<typeof recommenderSchema>;

export const applicationRecommenderSchema = z.object({
  applicationId: idSchema,
  recommenderId: idSchema,
  status: z.enum(RECOMMENDER_STATUSES).default('not-asked'),
});

// --- Scholarship ------------------------------------------------------------

export const scholarshipSchema = z.object({
  title: requiredText(TEXT_LIMITS.longName, 'Scholarship name'),
  organization: optionalText(TEXT_LIMITS.longName, 'Organization'),
  sourceUrl: optionalUrl,
  amount: optionalMoney,
  deadlineAt: optionalIsoDate,
  deadlineTimeZone: timeZoneSchema,
  status: z.enum(SCHOLARSHIP_STATUSES).default('researching'),
  requirements: optionalText(TEXT_LIMITS.notes, 'Requirements'),
  essayIds: z.array(idSchema).max(20).default([]),
  lastVerifiedAt: optionalIsoDate,
  notes: optionalText(TEXT_LIMITS.notes, 'Notes'),
});
export type ScholarshipInput = z.input<typeof scholarshipSchema>;

// --- Task -------------------------------------------------------------------

export const taskSchema = z.object({
  title: requiredText(TEXT_LIMITS.shortName, 'Task'),
  description: optionalText(TEXT_LIMITS.description, 'Description'),
  category: z.enum(TASK_CATEGORIES).default('other'),
  dueAt: optionalIsoDate,
  timeZone: timeZoneSchema,
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  applicationId: idSchema.nullable().default(null),
  essayId: idSchema.nullable().default(null),
  scholarshipId: idSchema.nullable().default(null),
  recommenderId: idSchema.nullable().default(null),
});
export type TaskInput = z.input<typeof taskSchema>;

export const taskCompletionSchema = z.object({
  taskId: idSchema,
  completed: checkboxBoolean,
});

// --- Onboarding -------------------------------------------------------------

export const onboardingSchema = profileSchema;

// --- Coach ------------------------------------------------------------------

/** Bounded so a single request cannot be used to push unlimited text at a model. */
export const AI_INPUT_LIMITS = {
  message: 8_000,
  draft: 20_000,
  context: 6_000,
} as const;

export const coachRequestSchema = z.object({
  mode: z.enum(COACH_MODES),
  message: z.string().trim().max(AI_INPUT_LIMITS.message, 'That message is too long to send.'),
  /** Explicit opt-in per request. Nothing is attached unless the student says so. */
  includeDraft: z.boolean().default(false),
  essayId: idSchema.nullable().default(null),
  activityId: idSchema.nullable().default(null),
  collegeId: idSchema.nullable().default(null),
  sessionId: idSchema.nullable().default(null),
});
export type CoachRequestInput = z.input<typeof coachRequestSchema>;

// --- Settings ---------------------------------------------------------------

export const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export const deleteConfirmationSchema = z.object({
  confirmation: z.literal('DELETE', {
    message: 'Type DELETE exactly to confirm.',
  }),
});
