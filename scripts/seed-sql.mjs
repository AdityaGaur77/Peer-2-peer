// Writes supabase/seed.sql from the teacher roster in src/lib/roster.ts.
// Run with `npm run seed-sql` after editing the roster, then paste the file
// into Supabase → SQL Editor. It only adds teachers that aren't there yet,
// so edits made later in the console are never overwritten.
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { ROSTER } = await server.ssrLoadModule('/src/lib/roster.ts');
  const { FOUNDER_NAME } = await server.ssrLoadModule('/src/lib/config.ts');
  const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
  const arr = (a) => `array[${a.map(q).join(', ')}]::text[]`;

  const founder = {
    id: 'founder', name: FOUNDER_NAME, grade: '10th grade',
    tagline: '',
    subjects: ['python', 'ai'], joinedISO: '2026-09-01T00:00:00.000Z', hue: 212,
    courses: [], availability: null, isFounder: true,
  };

  const rows = [founder, ...ROSTER].map(
    (t) =>
      `  (${q(t.id)}, ${q(t.name)}, ${q(t.grade)}, ${q(t.tagline)}, ${arr(t.subjects)}, ` +
      `${q(t.joinedISO)}, ${t.hue}, ${q(JSON.stringify(t.courses ?? []))}::jsonb, ${q(t.availability)}, ${!!t.isFounder})`,
  );

  const sql = `-- Teachers for the live site, generated from src/lib/roster.ts by
-- \`npm run seed-sql\`. Paste into Supabase → SQL Editor → Run, after schema.sql.
-- Only adds teachers that are missing. After this, edit teachers in the
-- console (Teachers tab), not here.

insert into public.tutors
  (id, name, grade, tagline, subjects, joined_at, hue, courses, availability, is_founder)
values
${rows.join(',\n')}
on conflict (id) do nothing;
`;
  writeFileSync('supabase/seed.sql', sql);
  console.log(`wrote supabase/seed.sql with ${rows.length} teachers`);
} finally {
  await server.close();
}
