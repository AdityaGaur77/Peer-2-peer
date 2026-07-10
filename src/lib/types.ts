export type SubjectId = 'python' | 'ai';
export type Level = 'intro' | 'intermediate' | 'all';

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  short: string;
  blurb: string;
  colorVar: string; // css custom property stem, e.g. 'py' -> var(--py), var(--py-soft)
}

export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'python',
    name: 'Python',
    short: 'PY',
    blurb: 'From your first print() to building real projects — games, tools, automations.',
    colorVar: 'py',
  },
  {
    id: 'ai',
    name: 'AI & Machine Learning',
    short: 'AI',
    blurb: 'How models actually work, hands-on training, prompts, and the ethics that matter.',
    colorVar: 'ai',
  },
];

export const UPCOMING_SUBJECTS = ['Math', 'Physics', 'Web Dev'];

export interface Tutor {
  id: string;
  name: string;
  email: string;
  grade: string;
  tagline: string;
  subjects: SubjectId[];
  joinedISO: string;
  isFounder?: boolean;
  hue: number;
}

export interface Attendee {
  name: string;
  email: string;
}

export interface Session {
  id: string;
  title: string;
  subject: SubjectId;
  level: Level;
  description: string;
  tutorId: string;
  startISO: string;
  durationMin: number;
  capacity: number;
  attendees: Attendee[];
  waitlist: Attendee[];
  link: string;
  status: 'scheduled' | 'canceled';
}

export interface Application {
  id: string;
  name: string;
  email: string;
  grade: string;
  subjects: SubjectId[];
  why: string;
  availability: string[];
  status: 'pending' | 'approved' | 'declined';
  submittedISO: string;
}

export interface Certification {
  email: string;
  subject: SubjectId;
  score: number;
  total: number;
  earnedISO: string;
}

export interface Kudos {
  id: string;
  tutorId: string;
  from: string;
  message: string;
  atISO: string;
}

export interface TopicRequest {
  id: string;
  topic: string;
  subject: SubjectId | 'other';
  by: string;
  votes: number;
  votedBy: string[];
  atISO: string;
}

export interface Profile {
  name: string;
  email: string;
}

export interface RelayState {
  tutors: Tutor[];
  sessions: Session[];
  applications: Application[];
  certifications: Certification[];
  kudos: Kudos[];
  requests: TopicRequest[];
}

export function subjectMeta(id: SubjectId): SubjectMeta {
  return SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];
}
