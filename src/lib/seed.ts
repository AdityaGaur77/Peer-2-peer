import type { Attendee, Kudos, RelayState, Session, SubjectId, Tutor } from './types';

// ── deterministic RNG so the demo data is stable ─────────────
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);

const jitsi = (title: string) => `https://meet.jit.si/relay-${slug(title)}`;

// ── the founding crew ────────────────────────────────────────
// Placeholder friends — edit names/taglines here, or approve real
// applications from the founder console to add tutors live.

interface TutorSeed {
  name: string;
  grade: string;
  tagline: string;
  subjects: SubjectId[];
  isFounder?: boolean;
  pastCount: number;
  joinedDaysAgo: number;
}

const TUTOR_SEEDS: TutorSeed[] = [
  {
    name: 'Aditya Gaur',
    grade: 'High school senior',
    tagline: 'Started Code Kids charging $15 a class. Deleted the price tag. No regrets.',
    subjects: ['python', 'ai'],
    isFounder: true,
    pastCount: 6,
    joinedDaysAgo: 55,
  },
  {
    name: 'Maya Krishnan',
    grade: '11th grade',
    tagline: 'Explains loops with snack analogies. It works, don\'t question it.',
    subjects: ['python'],
    pastCount: 4,
    joinedDaysAgo: 48,
  },
  {
    name: 'Ethan Park',
    grade: '12th grade',
    tagline: 'Kaggle addict. Will get you hooked too.',
    subjects: ['ai'],
    pastCount: 3,
    joinedDaysAgo: 45,
  },
  {
    name: 'Priya Sharma',
    grade: '11th grade',
    tagline: 'Debugging is my love language.',
    subjects: ['python', 'ai'],
    pastCount: 3,
    joinedDaysAgo: 41,
  },
  {
    name: 'Sam Okafor',
    grade: '10th grade',
    tagline: 'Learned Python by building terrible games. Now they\'re decent.',
    subjects: ['python'],
    pastCount: 3,
    joinedDaysAgo: 38,
  },
  {
    name: 'Zoe Martinez',
    grade: '12th grade',
    tagline: 'Here for your "wait, THAT\'S how AI works?" moment.',
    subjects: ['ai'],
    pastCount: 3,
    joinedDaysAgo: 33,
  },
  {
    name: 'Dev Patel',
    grade: '10th grade',
    tagline: 'Will explain it three different ways until one clicks.',
    subjects: ['python'],
    pastCount: 2,
    joinedDaysAgo: 26,
  },
];

const LEARNER_NAMES = [
  'Riya N', 'Jayden C', 'Sofia R', 'Marcus T', 'Ava L', 'Leo B', 'Hana K', 'Omar S',
  'Lucy W', 'Ishaan M', 'Grace P', 'Noah D', 'Mila F', 'Arnav J', 'Chloe H', 'Diego V',
  'Emma G', 'Kai T', 'Nora A', 'Rohan P', 'Stella M', 'Tyler Q', 'Yuna S', 'Zack E',
  'Aisha B', 'Ben O',
];

const PAST_TITLES: Record<SubjectId, string[]> = {
  python: [
    'Python from Zero, Week 1',
    'Python from Zero, Week 2',
    'Loops that finally click',
    'Debugging clinic',
    'Turtle graphics playday',
    'Build a quiz game',
    'Strings & f-strings lab',
    'Conditionals: choose your adventure',
  ],
  ai: [
    'What *is* AI, actually?',
    'Teachable Machine hands-on',
    'How ChatGPT predicts words',
    'Spot the bias: AI fails workshop',
    'Train a digit recognizer',
  ],
};

interface UpcomingSeed {
  title: string;
  subject: SubjectId;
  level: Session['level'];
  description: string;
  tutorIdx: number; // into TUTOR_SEEDS
  dayOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  capacity: number;
  prefill: number; // seeded attendees
}

const UPCOMING_SEEDS: UpcomingSeed[] = [
  {
    title: 'Python from Zero, Week 1 — your first program',
    subject: 'python', level: 'intro',
    description: 'Variables, print(), and writing a program that roasts you politely. No experience needed — genuinely none.',
    tutorIdx: 1, dayOffset: 1, hour: 17, minute: 0, durationMin: 60, capacity: 12, prefill: 7,
  },
  {
    title: 'What *is* AI, actually?',
    subject: 'ai', level: 'intro',
    description: 'No math, no hype. What machine learning is, what it isn\'t, and why your feed knows you too well.',
    tutorIdx: 5, dayOffset: 1, hour: 18, minute: 30, durationMin: 60, capacity: 15, prefill: 13,
  },
  {
    title: 'Loops that finally click',
    subject: 'python', level: 'intro',
    description: 'for, while, and the moment repetition stops being confusing. Bring snacks; Maya will use them as teaching props.',
    tutorIdx: 4, dayOffset: 2, hour: 16, minute: 30, durationMin: 60, capacity: 12, prefill: 12,
  },
  {
    title: 'Debugging clinic — bring your broken code',
    subject: 'python', level: 'all',
    description: 'Open workshop. Your bug goes on screen, we fix it together, everyone learns from the crime scene.',
    tutorIdx: 3, dayOffset: 3, hour: 18, minute: 0, durationMin: 75, capacity: 8, prefill: 4,
  },
  {
    title: 'Train your first model — no math required',
    subject: 'ai', level: 'intro',
    description: 'We\'ll train an image classifier live, watch it fail, feed it better data, and watch it get smart. You leave with a working model.',
    tutorIdx: 2, dayOffset: 4, hour: 17, minute: 0, durationMin: 75, capacity: 10, prefill: 6,
  },
  {
    title: 'Functions: stop repeating yourself',
    subject: 'python', level: 'intermediate',
    description: 'def, return, arguments, and refactoring copy-pasted chaos into something you\'re proud of.',
    tutorIdx: 0, dayOffset: 5, hour: 17, minute: 0, durationMin: 60, capacity: 10, prefill: 5,
  },
  {
    title: 'Prompt engineering playground',
    subject: 'ai', level: 'all',
    description: 'Why the same question gets wildly different answers, and how to ask so the model actually helps. Live experiments.',
    tutorIdx: 0, dayOffset: 7, hour: 18, minute: 0, durationMin: 60, capacity: 12, prefill: 6,
  },
  {
    title: 'Build a number-guessing game, start to finish',
    subject: 'python', level: 'intro',
    description: 'One session, one complete game. Loops, conditionals, and random numbers conspiring into something playable.',
    tutorIdx: 4, dayOffset: 8, hour: 15, minute: 0, durationMin: 90, capacity: 10, prefill: 3,
  },
  {
    title: 'Lists & dictionaries, deep dive',
    subject: 'python', level: 'intermediate',
    description: 'The two data structures you\'ll use forever. Slicing, nesting, and when to reach for which.',
    tutorIdx: 6, dayOffset: 10, hour: 17, minute: 30, durationMin: 60, capacity: 10, prefill: 2,
  },
  {
    title: 'AI ethics: when the model is wrong, who\'s responsible?',
    subject: 'ai', level: 'all',
    description: 'A discussion, not a lecture. Real cases — biased hiring tools, hallucinated citations — and what we\'d do differently.',
    tutorIdx: 5, dayOffset: 11, hour: 17, minute: 0, durationMin: 60, capacity: 14, prefill: 5,
  },
];

const KUDOS_SEED: Array<{ tutorIdx: number; from: string; message: string; daysAgo: number }> = [
  { tutorIdx: 1, from: 'Riya', message: 'I failed my CS quiz two weeks ago. Yesterday I explained list slicing to my FRIEND. thank you 😭', daysAgo: 3 },
  { tutorIdx: 0, from: 'Jayden', message: 'made recursion make sense in 40 minutes. school couldn\'t do it in a month', daysAgo: 5 },
  { tutorIdx: 2, from: 'Sofia', message: 'trained my first model!! it predicts my dog\'s mood (badly) but IT WORKS', daysAgo: 6 },
  { tutorIdx: 3, from: 'Marcus', message: 'the debugging clinic saved my science fair project. actual lifesaver', daysAgo: 9 },
  { tutorIdx: 5, from: 'Ava', message: 'came for the memes, left understanding neural networks??', daysAgo: 11 },
  { tutorIdx: 4, from: 'Leo', message: 'the game we built is my little brother\'s favorite thing now. he thinks I\'m a genius', daysAgo: 13 },
  { tutorIdx: 1, from: 'Hana', message: 'she stayed 20 minutes after to help me fix my code. for free. insane', daysAgo: 16 },
  { tutorIdx: 6, from: 'Omar', message: 'explained dictionaries three different ways until one clicked. patience of a saint', daysAgo: 19 },
];

const REQUEST_SEED = [
  { topic: 'Making a Discord bot', subject: 'python' as const, by: 'Zack', votes: 15, daysAgo: 8 },
  { topic: 'Recursion, but explained slowly 🙏', subject: 'python' as const, by: 'Nora', votes: 12, daysAgo: 12 },
  { topic: 'How do I actually start on Kaggle?', subject: 'ai' as const, by: 'Ishaan', votes: 9, daysAgo: 6 },
  { topic: 'Pandas for school data projects', subject: 'python' as const, by: 'Grace', votes: 8, daysAgo: 15 },
  { topic: 'Is a neural network just spicy linear algebra? (discuss)', subject: 'ai' as const, by: 'Kai', votes: 6, daysAgo: 4 },
];

// ── generator ────────────────────────────────────────────────

export function buildSeed(): RelayState {
  const rng = mulberry32(20260707);
  const now = new Date();

  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute);
    return d.toISOString();
  };

  const daysAgoISO = (days: number) => at(-days, 12, 0);

  const learners: Attendee[] = LEARNER_NAMES.map((name) => ({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@student.demo`,
  }));

  const sample = <T,>(arr: T[], n: number): T[] => {
    const pool = [...arr];
    const out: T[] = [];
    while (out.length < n && pool.length) {
      out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return out;
  };

  const tutors: Tutor[] = TUTOR_SEEDS.map((t, i) => ({
    id: `tutor_${i}`,
    name: t.name,
    email: `${t.name.split(' ')[0].toLowerCase()}@relay.demo`,
    grade: t.grade,
    tagline: t.tagline,
    subjects: t.subjects,
    joinedISO: daysAgoISO(t.joinedDaysAgo),
    isFounder: t.isFounder,
    hue: [16, 152, 262, 200, 330, 96, 46][i] ?? Math.floor(rng() * 360),
  }));

  // past sessions → real volunteer hours + learners-helped numbers
  const sessions: Session[] = [];
  TUTOR_SEEDS.forEach((t, ti) => {
    const titles = t.subjects.flatMap((s) => PAST_TITLES[s].map((title) => ({ title, subject: s })));
    for (let k = 0; k < t.pastCount; k++) {
      const pick = titles[Math.floor(rng() * titles.length)];
      const daysAgo = 2 + Math.floor(rng() * Math.min(t.joinedDaysAgo - 1, 44));
      const duration = [45, 60, 60, 75][Math.floor(rng() * 4)];
      sessions.push({
        id: `past_${ti}_${k}`,
        title: pick.title,
        subject: pick.subject,
        level: 'intro',
        description: 'A past live session — part of the log that backs every tutor\'s volunteer hours.',
        tutorId: tutors[ti].id,
        startISO: at(-daysAgo, 16 + Math.floor(rng() * 3), rng() > 0.5 ? 30 : 0),
        durationMin: duration,
        capacity: 12,
        attendees: sample(learners, 5 + Math.floor(rng() * 7)),
        waitlist: [],
        link: jitsi(pick.title),
        status: 'scheduled',
      });
    }
  });

  UPCOMING_SEEDS.forEach((u, i) => {
    sessions.push({
      id: `up_${i}`,
      title: u.title,
      subject: u.subject,
      level: u.level,
      description: u.description,
      tutorId: tutors[u.tutorIdx].id,
      startISO: at(u.dayOffset, u.hour, u.minute),
      durationMin: u.durationMin,
      capacity: u.capacity,
      attendees: sample(learners, u.prefill),
      // the full session ships with a small waitlist so the mechanic is visible
      waitlist: u.prefill >= u.capacity ? sample(learners, 2) : [],
      link: jitsi(u.title),
      status: 'scheduled',
    });
  });

  const kudos: Kudos[] = KUDOS_SEED.map((k, i) => ({
    id: `kudos_${i}`,
    tutorId: tutors[k.tutorIdx].id,
    from: k.from,
    message: k.message,
    atISO: daysAgoISO(k.daysAgo),
  }));

  return {
    tutors,
    sessions,
    applications: [],
    // founding tutors are certified in their subjects
    certifications: tutors.flatMap((t) =>
      t.subjects.map((s) => ({
        email: t.email,
        subject: s,
        score: s === 'python' ? 9 + Math.floor(rng() * 2) : 7 + Math.floor(rng() * 2),
        total: s === 'python' ? 10 : 8,
        earnedISO: t.joinedISO,
      })),
    ),
    kudos,
    requests: REQUEST_SEED.map((r, i) => ({
      id: `req_${i}`,
      topic: r.topic,
      subject: r.subject,
      by: r.by,
      votes: r.votes,
      votedBy: [],
      atISO: daysAgoISO(r.daysAgo),
    })),
  };
}
