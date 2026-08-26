import { FOUNDER_NAME } from './config';
import type { RelayState } from './types';

/**
 * The starting state of a brand-new board.
 *
 * There is no sample content here on purpose. Everything a visitor sees —
 * tutors, sessions, thank-you notes, the numbers on the homepage — is real,
 * because it all came from someone actually doing something. A site that
 * ships with invented tutors and invented history is lying to its first
 * visitor, and this one is meant to be shared with people we know.
 */
export function buildSeed(): RelayState {
  const founder = {
    id: 'founder',
    name: FOUNDER_NAME,
    email: 'adityagaur12077@gmail.com',
    grade: 'High school senior',
    tagline: 'Started this after charging for tutoring stopped feeling right.',
    subjects: ['python' as const, 'ai' as const],
    joinedISO: new Date().toISOString(),
    isFounder: true,
    hue: 212,
  };

  return {
    tutors: [founder],
    sessions: [],
    applications: [],
    certifications: [],
    kudos: [],
    requests: [],
  };
}
