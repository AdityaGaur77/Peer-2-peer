import type { Application, Tutor } from './types';
import { hashHue } from './util';

/**
 * The published teacher roster.
 *
 * Relay has no backend, so a tutor approved in the founder console only
 * exists in that one browser. Anyone listed here ships with the site
 * instead, which means every visitor sees them on the Tutors page.
 *
 * To add someone: approve their application in the console, hit
 * "copy roster entry", paste it into this list, commit, and redeploy.
 * See TEACHERS.md for the full onboarding process.
 *
 * Public names are first name + last initial. Everyone here is a minor,
 * and this file ships to every visitor. Leave email blank unless the tutor
 * has said it can be public, since it lands in the bundle too.
 */
export const ROSTER: Tutor[] = [
  {
    id: 'roster-sohail',
    name: 'Sohail T.',
    email: '',
    grade: 'Co-founder',
    tagline: 'Algebra is a handful of rules used over and over. I teach the rules.',
    subjects: ['math'],
    joinedISO: '2026-10-12T00:00:00.000Z',
    hue: 26,
    onRoster: true,
    courses: [
      {
        title: 'Algebra 1',
        subject: 'math',
        summary:
          'Variables and moving things around an equation, then linear and polynomial forms, factoring, quadratics, systems of equations, radicals and exponent rules.',
        topics: ['Equations', 'Factoring', 'Quadratics', 'Systems', 'Exponents'],
      },
      {
        title: 'Algebra 2',
        subject: 'math',
        summary:
          'Higher-degree polynomials, the forms of a parabola, three-equation systems, the complex plane, rational and exponential functions, the unit circle, polynomial division and sequences.',
        topics: ['Polynomials', 'Complex numbers', 'Unit circle', 'Sequences'],
      },
    ],
  },
  {
    id: 'roster-abhiram',
    name: 'Abhiram K.',
    email: '',
    grade: 'High school',
    tagline: 'Geometry through trig, algebra through Algebra 2.',
    subjects: ['math'],
    joinedISO: '2026-10-06T00:00:00.000Z',
    hue: 40,
    onRoster: true,
    availability: 'Tuesdays and Wednesdays, 6–8pm',
    courses: [
      {
        title: 'Geometry and Algebra',
        subject: 'math',
        summary:
          'Help with whatever unit you are on in Geometry (up to trigonometry) or Algebra 1 and 2.',
        topics: ['Geometry', 'Trigonometry', 'Algebra 1', 'Algebra 2'],
      },
    ],
  },
  {
    id: 'roster-akil',
    name: 'Akil',
    email: '',
    grade: 'High school',
    tagline: 'I follow whatever your class is doing and get you a little ahead of it.',
    subjects: ['math', 'spanish'],
    joinedISO: '2026-10-06T00:00:00.000Z',
    hue: 150,
    onRoster: true,
    availability: 'Any day after 5pm · 90-minute classes, twice a week works best',
    courses: [
      {
        title: 'Geometric Foundations',
        subject: 'math',
        summary:
          'Geometry and everything before it, paced to your class. We go back over lessons you missed and spend the most time on whatever you find hardest.',
      },
      {
        title: 'Algebraic Foundations',
        subject: 'math',
        summary: 'The algebra basics your class assumes you know, practiced until they stick.',
      },
      {
        title: 'Basic Spanish Essentials',
        subject: 'spanish',
        summary: 'Spanish 1 and 2: vocabulary, grammar and enough practice to keep up in class.',
      },
    ],
  },
  {
    id: 'roster-haggai',
    name: 'Haggai K.',
    email: '',
    grade: 'High school',
    tagline: 'Grammar, essays and reading closely. No homework, ever.',
    subjects: ['english'],
    joinedISO: '2026-10-06T00:00:00.000Z',
    hue: 318,
    onRoster: true,
    availability: 'Tuesdays, 7:30–8:30pm · every other week',
    courses: [
      {
        title: 'Foundational English Skills',
        subject: 'english',
        summary:
          'Grammar rules, essay writing and story analysis. We read short stories and excerpts from well-known books, then write short essays on them to practice both.',
        topics: ['Grammar', 'Essays', 'Literary analysis'],
      },
    ],
  },
  {
    id: 'roster-ayden',
    name: 'Ayden J.',
    email: '',
    grade: '10th grade',
    tagline: 'Design it on the computer first, so you only build it once.',
    subjects: ['cad'],
    joinedISO: '2026-09-06T00:00:00.000Z',
    hue: 68,
    onRoster: true,
    courses: [
      {
        title: 'Introduction to Engineering Design and CAD',
        subject: 'cad',
        summary:
          'How engineers go from an idea to a part you can manufacture. You sketch a shape, constrain it with dimensions, and extrude it into a 3D model, then change one number and watch the whole design update.',
        topics: ['Sketching', 'Constraints', 'Extrusions', 'Design process'],
      },
    ],
  },
];

export const ROSTER_IDS = new Set(ROSTER.map((t) => t.id));

/** What a roster entry still needs before the tutor can run a first class. */
export function onboardingGaps(t: Tutor): string[] {
  const gaps: string[] = [];
  if (!t.courses?.length) gaps.push('course description');
  if (!t.availability) gaps.push('days and times');
  if (!t.grade || t.grade === 'High school') gaps.push('grade');
  return gaps;
}

/**
 * The roster entry for an approved application, ready to paste into ROSTER.
 * Public name is shortened to first name + last initial, and the email is
 * left out because this file ships to every visitor.
 */
export function rosterSnippet(app: Application): string {
  const [first, ...rest] = app.name.trim().split(/\s+/);
  const last = rest.at(-1);
  const name = last ? `${first} ${last[0].toUpperCase()}.` : first;
  const slug = first.toLowerCase().replace(/[^a-z0-9]/g, '') || 'tutor';
  const entry = {
    id: `roster-${slug}`,
    name,
    email: '',
    grade: app.grade,
    tagline: 'New tutor. Come to their first class and say hello.',
    subjects: app.subjects,
    joinedISO: new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
    hue: hashHue(app.name),
    onRoster: true,
    ...(app.times || app.availability.length
      ? { availability: app.times || app.availability.join(', ') }
      : {}),
    courses: app.courseTitle
      ? [{ title: app.courseTitle, subject: app.subjects[0], summary: app.courseSummary ?? '' }]
      : [],
  };
  return `  ${JSON.stringify(entry, null, 2).replace(/\n/g, '\n  ')},`;
}
