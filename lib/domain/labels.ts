/**
 * Human-readable labels for every enum in the domain.
 *
 * Kept in one place so terminology stays consistent and understandable —
 * students should never see a raw slug like `restrictive-early-action`.
 */

import type {
  ActivityCategory,
  ApplicationRound,
  ApplicationStatus,
  CoachMode,
  CurrentGrade,
  DecisionResult,
  EssayStatus,
  FeeWaiverStatus,
  InstitutionType,
  ListStatus,
  RecommenderStatus,
  RequirementStatus,
  RequirementType,
  ScholarshipStatus,
  TaskCategory,
  TaskPriority,
  TestingPlan,
  ThankYouStatus,
  TranscriptStatus,
} from './types';

export const listStatusLabels: Record<ListStatus, string> = {
  exploring: 'Exploring',
  considering: 'Considering',
  applying: 'Applying',
  submitted: 'Submitted',
  'decision-received': 'Decision received',
};

export const institutionTypeLabels: Record<InstitutionType, string> = {
  public: 'Public',
  'private-nonprofit': 'Private (nonprofit)',
  'private-forprofit': 'Private (for-profit)',
  community: 'Community college',
  other: 'Other',
};

export const applicationRoundLabels: Record<ApplicationRound, string> = {
  'early-decision': 'Early Decision',
  'early-decision-2': 'Early Decision II',
  'early-action': 'Early Action',
  'restrictive-early-action': 'Restrictive / Single-Choice Early Action',
  'regular-decision': 'Regular Decision',
  rolling: 'Rolling admission',
  priority: 'Priority deadline',
  transfer: 'Transfer',
  other: 'Other',
};

/** Short plain-language explanations shown next to round pickers. */
export const applicationRoundHints: Record<ApplicationRound, string> = {
  'early-decision': 'Binding at most colleges — check the specific college policy.',
  'early-decision-2': 'A second binding round with a later deadline.',
  'early-action': 'Usually non-binding. Confirm on the college website.',
  'restrictive-early-action':
    'Non-binding, but usually limits where else you can apply early. Read the policy carefully.',
  'regular-decision': 'The standard, non-binding round.',
  rolling: 'Reviewed as applications arrive. Earlier is often easier to schedule around.',
  priority: 'An earlier deadline that may affect scholarships or housing.',
  transfer: 'For students applying after starting at another college.',
  other: 'Anything that does not fit the common rounds.',
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In progress',
  'ready-to-submit': 'Ready to submit',
  submitted: 'Submitted',
  'decision-received': 'Decision received',
  withdrawn: 'Withdrawn',
};

export const decisionResultLabels: Record<DecisionResult, string> = {
  pending: 'No decision yet',
  accepted: 'Accepted',
  waitlisted: 'Waitlisted',
  deferred: 'Deferred',
  denied: 'Denied',
  withdrawn: 'Withdrawn',
};

export const feeWaiverStatusLabels: Record<FeeWaiverStatus, string> = {
  'not-applicable': 'Not applicable',
  considering: 'Looking into it',
  requested: 'Requested',
  approved: 'Approved',
};

export const testingPlanLabels: Record<TestingPlan, string> = {
  'not-decided': 'Not decided yet',
  'not-submitting': 'Not submitting scores',
  'submitting-sat': 'Submitting SAT',
  'submitting-act': 'Submitting ACT',
  'submitting-both': 'Submitting SAT and ACT',
  'test-required': 'Scores required here',
};

export const transcriptStatusLabels: Record<TranscriptStatus, string> = {
  'not-started': 'Not started',
  requested: 'Requested',
  sent: 'Sent',
  confirmed: 'Confirmed received',
};

export const requirementTypeLabels: Record<RequirementType, string> = {
  'application-form': 'Application form',
  essay: 'Essay',
  recommendation: 'Recommendation',
  transcript: 'Transcript',
  'test-scores': 'Test scores',
  portfolio: 'Portfolio or audition',
  interview: 'Interview',
  fee: 'Fee or waiver',
  'financial-aid': 'Financial aid',
  other: 'Other',
};

export const requirementStatusLabels: Record<RequirementStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
  'not-needed': 'Not needed',
};

export const essayStatusLabels: Record<EssayStatus, string> = {
  'not-started': 'Not started',
  brainstorming: 'Brainstorming',
  outlining: 'Outlining',
  drafting: 'Drafting',
  revising: 'Revising',
  final: 'Final',
};

export const activityCategoryLabels: Record<ActivityCategory, string> = {
  academic: 'Academic',
  art: 'Art',
  athletics: 'Athletics',
  'career-oriented': 'Career oriented',
  'community-service': 'Community service',
  'computer-technology': 'Computer / technology',
  cultural: 'Cultural',
  'debate-speech': 'Debate / speech',
  environmental: 'Environmental',
  'family-responsibilities': 'Family responsibilities',
  'foreign-language': 'Foreign language',
  'journalism-publication': 'Journalism / publication',
  'junior-rotc': 'Junior R.O.T.C.',
  music: 'Music',
  religious: 'Religious',
  research: 'Research',
  robotics: 'Robotics',
  'school-spirit': 'School spirit',
  'science-math': 'Science / math',
  'student-government': 'Student government',
  'theater-drama': 'Theater / drama',
  work: 'Work',
  other: 'Other',
};

export const recommenderStatusLabels: Record<RecommenderStatus, string> = {
  'not-asked': 'Not asked yet',
  asked: 'Asked',
  agreed: 'Agreed',
  'materials-sent': 'Materials sent',
  submitted: 'Submitted',
  declined: 'Declined',
};

export const thankYouStatusLabels: Record<ThankYouStatus, string> = {
  'not-sent': 'Not sent',
  planned: 'Planned',
  sent: 'Sent',
};

export const scholarshipStatusLabels: Record<ScholarshipStatus, string> = {
  researching: 'Researching',
  'planning-to-apply': 'Planning to apply',
  'in-progress': 'In progress',
  submitted: 'Submitted',
  awarded: 'Awarded',
  'not-selected': 'Not selected',
  skipped: 'Skipped',
};

export const taskCategoryLabels: Record<TaskCategory, string> = {
  application: 'Application',
  essay: 'Essay',
  recommendation: 'Recommendation',
  testing: 'Testing',
  'financial-aid': 'Financial aid',
  scholarship: 'Scholarship',
  visit: 'Visit',
  personal: 'Personal',
  other: 'Other',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const currentGradeLabels: Record<CurrentGrade, string> = {
  '9': '9th grade',
  '10': '10th grade',
  '11': '11th grade',
  '12': '12th grade',
  'gap-year': 'Gap year',
  transfer: 'Current college student',
  other: 'Other',
};

export const coachModeLabels: Record<CoachMode, string> = {
  profile: 'Profile Coach',
  'college-research': 'College Research Organizer',
  'essay-brainstorm': 'Essay Brainstorm Coach',
  'essay-feedback': 'Essay Feedback Coach',
  'activity-description': 'Activities Description Coach',
  'deadline-planning': 'Deadline Planning Coach',
};

export const coachModeDescriptions: Record<CoachMode, string> = {
  profile: 'Looks at what you have already written down and asks what is still missing.',
  'college-research':
    'Organises what you know about a college and lists what you still need to verify on official sources.',
  'essay-brainstorm': 'Helps you find themes and moments in experiences you describe.',
  'essay-feedback': 'Reads a draft you wrote and gives specific, explained revision notes.',
  'activity-description':
    'Tightens an activity description without adding claims you did not make.',
  'deadline-planning': 'Turns your deadlines into a realistic order of work.',
};

/** Generic helper for turning any slug into a readable fallback label. */
export function humanizeSlug(value: string): string {
  return value
    .split('-')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}
