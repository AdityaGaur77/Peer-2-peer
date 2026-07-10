import { useMemo, useState } from 'react';
import type { Quiz } from '../lib/quiz-data';
import { useStore } from '../lib/store';
import { cx } from '../lib/util';

function shuffled(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

// A shuffled view of the quiz: question order + a per-question option order,
// so the correct choice never lives at a predictable position.
function buildRun(quiz: Quiz) {
  return {
    order: shuffled(quiz.questions.length),
    optOrder: quiz.questions.map((q) => shuffled(q.options.length)),
  };
}

export function QuizEngine({ quiz, onExit }: { quiz: Quiz; onExit: () => void }) {
  const { profile, saveCertification, toast } = useStore();
  const [run, setRun] = useState(() => buildRun(quiz));
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const { order, optOrder } = run;
  const total = quiz.questions.length;
  const qIdx = order[pos];
  const q = quiz.questions[qIdx];
  const answered = Object.keys(answers).length;

  const score = useMemo(
    () =>
      order.reduce((acc, qi) => acc + (answers[qi] === quiz.questions[qi].answer ? 1 : 0), 0),
    [answers, order, quiz.questions],
  );
  const passed = score >= quiz.passNeeded;

  const finish = () => {
    setDone(true);
    if (score >= quiz.passNeeded && profile) {
      saveCertification({ email: profile.email, subject: quiz.subject, score, total });
      toast(
        `Certified in ${quiz.subject === 'python' ? 'Python' : 'AI'} — ${score}/${total}. Now pass it on.`,
      );
    }
  };

  const retake = () => {
    setRun(buildRun(quiz));
    setAnswers({});
    setPos(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="stack" style={{ gap: 20 }}>
        <div className="row between">
          <div>
            <div className="score-ring">
              {score}
              <span className="muted">/{total}</span>
            </div>
            <p className="mono small" style={{ color: passed ? 'var(--py)' : 'var(--ember-deep)' }}>
              {passed
                ? '✓ certified — the baton is officially yours'
                : `needs ${quiz.passNeeded}/${total} — review below and run it back`}
            </p>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={retake}>
              Retake
            </button>
            <button className="btn btn-primary btn-sm" onClick={onExit}>
              {passed ? 'Done' : 'Back'}
            </button>
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {order.map((qi, n) => {
            const item = quiz.questions[qi];
            const good = answers[qi] === item.answer;
            return (
              <div key={qi} className={cx('review-item', good ? 'good' : 'bad')}>
                <span className="verdict">
                  {good ? 'correct' : 'missed'} · Q{n + 1}
                </span>
                <strong style={{ fontWeight: 640 }}>{item.q}</strong>
                {!good && <span className="muted small">Answer: {item.options[item.answer]}</span>}
                <span className="small" style={{ color: 'var(--ink-2)' }}>
                  {item.explain}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row between">
        <span className="mono small muted">
          question {pos + 1} / {total} · pass at {quiz.passNeeded}
        </span>
        <button className="btn-quiet" onClick={onExit}>
          exit quiz
        </button>
      </div>

      <div className="quiz-progress">
        <i style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      <h3 className="h3">{q.q}</h3>
      {q.code && <pre className="q-code">{q.code}</pre>}

      <div className="stack" style={{ gap: 9 }}>
        {optOrder[qIdx].map((optIdx, displayPos) => (
          <button
            key={optIdx}
            className={cx('opt', answers[qIdx] === optIdx && 'sel')}
            onClick={() => setAnswers((a) => ({ ...a, [qIdx]: optIdx }))}
          >
            <span className="opt-key">{'ABCD'[displayPos]}</span>
            {q.options[optIdx]}
          </button>
        ))}
      </div>

      <div className="row between">
        <button className="btn btn-ghost btn-sm" disabled={pos === 0} onClick={() => setPos((p) => p - 1)}>
          ← Back
        </button>
        {pos < total - 1 ? (
          <button
            className="btn btn-primary btn-sm"
            disabled={answers[qIdx] === undefined}
            onClick={() => setPos((p) => p + 1)}
          >
            Next →
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" disabled={answered < total} onClick={finish}>
            See my score
          </button>
        )}
      </div>
    </div>
  );
}
