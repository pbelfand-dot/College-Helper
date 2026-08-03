import { Badge } from './badge';
import {
  applicationStatusLabels,
  decisionResultLabels,
  essayStatusLabels,
  listStatusLabels,
  recommenderStatusLabels,
  requirementStatusLabels,
  scholarshipStatusLabels,
} from '@/lib/domain/labels';
import type {
  ApplicationStatus,
  DecisionResult,
  EssayStatus,
  ListStatus,
  RecommenderStatus,
  RequirementStatus,
  ScholarshipStatus,
} from '@/lib/domain/types';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Status colour mapping.
 *
 * Note what is deliberately *not* here: no status is styled as alarming just
 * for being early in the process. "Not started" is neutral, not red.
 */
const applicationTones: Record<ApplicationStatus, Tone> = {
  planning: 'neutral',
  'in-progress': 'info',
  'ready-to-submit': 'accent',
  submitted: 'success',
  'decision-received': 'success',
  withdrawn: 'neutral',
};

const listTones: Record<ListStatus, Tone> = {
  exploring: 'neutral',
  considering: 'info',
  applying: 'accent',
  submitted: 'success',
  'decision-received': 'success',
};

const requirementTones: Record<RequirementStatus, Tone> = {
  'not-started': 'neutral',
  'in-progress': 'info',
  complete: 'success',
  'not-needed': 'neutral',
};

const essayTones: Record<EssayStatus, Tone> = {
  'not-started': 'neutral',
  brainstorming: 'info',
  outlining: 'info',
  drafting: 'accent',
  revising: 'accent',
  final: 'success',
};

const recommenderTones: Record<RecommenderStatus, Tone> = {
  'not-asked': 'neutral',
  asked: 'info',
  agreed: 'accent',
  'materials-sent': 'accent',
  submitted: 'success',
  declined: 'warning',
};

const scholarshipTones: Record<ScholarshipStatus, Tone> = {
  researching: 'neutral',
  'planning-to-apply': 'info',
  'in-progress': 'accent',
  submitted: 'success',
  awarded: 'success',
  'not-selected': 'neutral',
  skipped: 'neutral',
};

/** Decisions are reported factually — a denial is not styled as a catastrophe. */
const decisionTones: Record<DecisionResult, Tone> = {
  pending: 'neutral',
  accepted: 'success',
  waitlisted: 'info',
  deferred: 'info',
  denied: 'neutral',
  withdrawn: 'neutral',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={applicationTones[status]}>{applicationStatusLabels[status]}</Badge>;
}

export function ListStatusBadge({ status }: { status: ListStatus }) {
  return <Badge tone={listTones[status]}>{listStatusLabels[status]}</Badge>;
}

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  return <Badge tone={requirementTones[status]}>{requirementStatusLabels[status]}</Badge>;
}

export function EssayStatusBadge({ status }: { status: EssayStatus }) {
  return <Badge tone={essayTones[status]}>{essayStatusLabels[status]}</Badge>;
}

export function RecommenderStatusBadge({ status }: { status: RecommenderStatus }) {
  return <Badge tone={recommenderTones[status]}>{recommenderStatusLabels[status]}</Badge>;
}

export function ScholarshipStatusBadge({ status }: { status: ScholarshipStatus }) {
  return <Badge tone={scholarshipTones[status]}>{scholarshipStatusLabels[status]}</Badge>;
}

export function DecisionBadge({ result }: { result: DecisionResult }) {
  if (result === 'pending') return null;
  return <Badge tone={decisionTones[result]}>{decisionResultLabels[result]}</Badge>;
}
