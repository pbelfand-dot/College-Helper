import { randomUUID } from 'node:crypto';

/**
 * Record identifiers. UUIDs everywhere so the demo adapter and Postgres agree
 * on shape, and so an id never encodes anything about the student.
 */
export function newId(): string {
  return randomUUID();
}

/**
 * Opaque request identifier for AI telemetry. Deliberately random and
 * content-free — nothing derived from essays, prompts, or the user id.
 */
export function newRequestId(): string {
  return `req_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
