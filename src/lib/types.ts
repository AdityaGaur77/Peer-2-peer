export type SubjectId =
  | 'python'
  | 'webdev'
  | 'ai'
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'english'
  | 'history'
  | 'spanish'
  | 'testprep'
  | 'cad';

export type Level = 'intro' | 'intermediate' | 'all';
export type Role = 'student' | 'tutor';

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  blurb: string;
  /** Drives the chip and card colors, so new subjects need no CSS. */
  hue: number;
  /** Some subjects have a certification quiz. The rest are reviewed by hand. */
  hasQuiz?: boolean;
}

// Add a subject here and it shows up everywhere: filters, the class builder,
// tutor sign-up, the session board. No other file needs to change.
export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'python',
    name: 'Python',
    blurb: 'From your first print() to games, tools and small projects.',
    hue: 212,
    hasQuiz: true,
  },
  {
    id: 'ai',
    name: 'AI & Machine Learning',
    blurb: 'How models really work, plus hands-on training and the ethics.',
    hue: 265,
    hasQuiz: true,
  },
  {
    id: 'webdev',
    name: 'Web Development',
    blurb: 'HTML, CSS and JavaScript, up to putting a site online.',
    hue: 188,
  },
  {
    id: 'math',
    name: 'Math',
    blurb: 'Algebra through calculus, at whatever pace you need.',
    hue: 32,
  },
  {
    id: 'physics',
    name: 'Physics',
    blurb: 'Forces, energy, circuits and the problems that come up on tests.',
    hue: 242,
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    blurb: 'Reactions, stoichiometry and lab work that finally makes sense.',
    hue: 172,
  },
  {
    id: 'biology',
    name: 'Biology',
    blurb: 'Cells, genetics and the memorization-heavy units.',
    hue: 96,
  },
  {
    id: 'english',
    name: 'English & Writing',
    blurb: 'Essays, analysis and getting a first draft out of your head.',
    hue: 318,
  },
  {
    id: 'history',
    name: 'History',
    blurb: 'Document questions, timelines and essay structure.',
    hue: 45,
  },
  {
    id: 'spanish',
    name: 'Spanish',
    blurb: 'Conversation practice, grammar and exam prep.',
    hue: 8,
  },
  {
    id: 'testprep',
    name: 'SAT & ACT Prep',
    blurb: 'Practice sections, timing and the question types that trip people up.',
    hue: 288,
  },
  {
    id: 'cad',
    name: 'Engineering & CAD',
    blurb: 'Designing real parts on a computer, from a first sketch to a 3D model.',
    hue: 68,
  },
];

export const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

/** A class a tutor plans to run, shown on their card on the Tutors page. */
export interface Course {
  title: string;
  subject: SubjectId;
  summary: string;
  topics?: string[];
}

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
  /** What they plan to teach. Roster tutors have these; older saved tutors don't. */
  courses?: Course[];
  /** Plain-language availability, e.g. "Tue & Wed, 6–8pm". */
  availability?: string;
  /** Published in src/lib/roster.ts, so every visitor sees them. */
  onRoster?: boolean;
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
  /** Added with the class questions. Older applications have none. */
  courseTitle?: string;
  courseSummary?: string;
  /** Specific days and times, on top of the broad availability chips. */
  times?: string;
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
  /** Chosen at sign-in. Older saved profiles have none, so treat those as students. */
  role?: Role;
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

/** Short label for chips, where "AI & Machine Learning" is too long. */
export function subjectShort(id: SubjectId): string {
  const name = subjectMeta(id).name;
  return name.split(' & ')[0];
}
