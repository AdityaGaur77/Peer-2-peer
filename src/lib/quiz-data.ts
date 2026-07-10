import type { SubjectId } from './types';

export interface QuizQuestion {
  q: string;
  code?: string;
  options: string[];
  answer: number; // index into options
  explain: string;
}

export interface Quiz {
  subject: SubjectId;
  title: string;
  minutes: number;
  passNeeded: number;
  intro: string;
  questions: QuizQuestion[];
}

// Certification quizzes — modeled on Schoolhouse.world's idea that peers
// prove they know a topic before they teach it. Explanations are written
// the way you'd explain to a student, because that's the actual job.

export const QUIZZES: Record<SubjectId, Quiz> = {
  python: {
    subject: 'python',
    title: 'Python Tutor Certification',
    minutes: 10,
    passNeeded: 8,
    intro:
      'Ten questions on the Python you\'d actually teach in intro sessions. Pass 8 of 10 to get certified. You can retake it as many times as you want — that\'s kind of our whole philosophy.',
    questions: [
      {
        q: 'What does this print?',
        code: "print(3 * 'ab')",
        options: ["'ababab'", "'ab3'", 'an error', "'ab ab ab'"],
        answer: 0,
        explain:
          'Multiplying a string repeats it. Great party trick for students who think code is only math: 3 * "ab" → "ababab".',
      },
      {
        q: 'What does nums[1:3] give you?',
        code: 'nums = [10, 20, 30, 40, 50]\nprint(nums[1:3])',
        options: ['[20, 30]', '[10, 20, 30]', '[20, 30, 40]', '[30]'],
        answer: 0,
        explain:
          'Slices start at the first index and stop *before* the second. The "end is exclusive" rule trips up almost every beginner — worth saying out loud twice.',
      },
      {
        q: 'How many numbers does range(5) produce, and starting from what?',
        options: ['5 numbers, starting at 0', '5 numbers, starting at 1', '4 numbers, starting at 0', '6 numbers, starting at 0'],
        answer: 0,
        explain:
          'range(5) → 0, 1, 2, 3, 4. Five numbers, zero-indexed, never includes the stop value. Pairs perfectly with the slicing rule.',
      },
      {
        q: 'Which of these is a valid Python variable name?',
        options: ['total_score', '2nd_place', 'my-var', 'class'],
        answer: 0,
        explain:
          "Names can't start with a digit, can't contain hyphens (Python reads my-var as subtraction), and can't be reserved words like class. Underscores are the way.",
      },
      {
        q: 'A student writes `if score = 100:` and gets a SyntaxError. What do you tell them?',
        options: [
          '= assigns a value; == compares. The if needs ==',
          'if statements need parentheses around the condition',
          'score must be declared with a type first',
          '100 must be in quotes',
        ],
        answer: 0,
        explain:
          'The single-vs-double equals mix-up is the most common beginner error in existence. A good tutor names the two operators, not just the fix.',
      },
      {
        q: 'What does this program print?',
        code: 'def add(a, b):\n    return a + b\n\nresult = add(2, 3)\nprint(result)',
        options: ['5', 'add(2, 3)', 'a + b', 'None'],
        answer: 0,
        explain:
          'The function returns 5, which gets stored in result. If a student\'s function prints nothing, check whether they used return — forgetting it gives you None.',
      },
      {
        q: 'What does len(ages) return?',
        code: "ages = {'maya': 16, 'sam': 17}\nprint(len(ages))",
        options: ['2', '4', '33', 'an error'],
        answer: 0,
        explain:
          'len() on a dictionary counts key-value pairs, not individual items. Two entries → 2.',
      },
      {
        q: 'A student\'s program never stops running. Which line is the likely culprit?',
        code: 'count = 10\nwhile count > 0:\n    print(count)',
        options: [
          'The while loop — count never changes, so the condition stays True',
          'print() blocks the program from ending',
          'count = 10 should be count == 10',
          'while loops always run forever in Python',
        ],
        answer: 0,
        explain:
          'Nothing inside the loop updates count, so count > 0 is true forever. Teach students to ask: "what makes this loop eventually stop?"',
      },
      {
        q: "What is the value of int('7') + 3?",
        options: ['10', "'73'", "'10'", 'an error'],
        answer: 0,
        explain:
          "int('7') converts the string to a number, so 7 + 3 = 10. Without the conversion you'd get an error — Python won't add str and int.",
      },
      {
        q: 'Why does Python complain about this code?',
        code: 'if age >= 13:\nprint("teenager")',
        options: [
          'The line after the colon must be indented',
          'if statements need an else',
          'Strings can\'t be printed inside if blocks',
          '>= is not a real operator',
        ],
        answer: 0,
        explain:
          'Indentation isn\'t style in Python — it\'s how blocks are defined. Everything belonging to the if must be indented under it.',
      },
    ],
  },
  ai: {
    subject: 'ai',
    title: 'AI & ML Tutor Certification',
    minutes: 8,
    passNeeded: 7,
    intro:
      'Eight questions on the concepts behind AI — the intuition, not the buzzwords. Pass 7 of 8 to get certified. Retakes are free, obviously.',
    questions: [
      {
        q: 'What separates machine learning from traditional programming?',
        options: [
          'ML learns patterns from examples; traditional code follows rules a human wrote',
          'ML is written in Python; traditional programming is not',
          'ML programs run faster',
          'ML doesn\'t need any data',
        ],
        answer: 0,
        explain:
          'Classic framing: instead of writing the rules, you show the machine examples and it finds the rules. Everything else in ML hangs off this idea.',
      },
      {
        q: 'Why do we split data into a training set and a test set?',
        options: [
          'The test set checks how the model does on data it has never seen',
          'The test set makes training twice as fast',
          'Computers can\'t load all the data at once',
          'The training set is for backup',
        ],
        answer: 0,
        explain:
          'A model graded on questions it studied is just reciting. Held-out test data is how we know it actually generalized — like a real exam with new problems.',
      },
      {
        q: 'A model gets 99% on training data but 60% on new data. What happened?',
        options: [
          'Overfitting — it memorized the training data instead of learning the pattern',
          'Underfitting — the model is too simple',
          'The new data is wrong',
          'Nothing — 99% means it works',
        ],
        answer: 0,
        explain:
          'Memorizing answers ≠ understanding the subject. Overfitting is the single most useful concept to teach early, and this gap is its signature.',
      },
      {
        q: 'In a dataset for detecting spam emails, what is the "label"?',
        options: [
          'The answer we want predicted — spam or not spam',
          'The subject line of the email',
          'The name of the dataset',
          'The email\'s file size',
        ],
        answer: 0,
        explain:
          'Features are the inputs (the email\'s contents); the label is the answer key (spam / not spam). Supervised learning is learning the mapping between them.',
      },
      {
        q: 'At its core, what does a large language model like ChatGPT do?',
        options: [
          'Predicts the next token based on patterns from its training text',
          'Searches the internet for each answer',
          'Stores every conversation ever written and looks up replies',
          'Follows grammar rules programmed by linguists',
        ],
        answer: 0,
        explain:
          '"Really good autocomplete, scaled up" is the honest one-liner. Predicting the next token, over and over, produces everything an LLM says.',
      },
      {
        q: 'Where does most bias in AI systems come from?',
        options: [
          'The training data, which reflects biases in the world it came from',
          'Bugs in the math',
          'The programming language used',
          'Models being intentionally programmed to be unfair',
        ],
        answer: 0,
        explain:
          'Models learn from data made by people, so they inherit our patterns — including the unfair ones. "Garbage in, garbage out" but for fairness.',
      },
      {
        q: 'A student asks: "Is ChatGPT always right?" Best answer?',
        options: [
          'No — it can be confidently wrong, so verify anything that matters',
          'Yes, it was trained on the whole internet',
          'It\'s right about facts but wrong about opinions',
          'It\'s only wrong if you phrase the question badly',
        ],
        answer: 0,
        explain:
          'LLMs generate plausible text, not verified truth — and they sound equally confident either way. Teaching healthy skepticism is part of teaching AI.',
      },
      {
        q: 'When a neural network "learns," what is actually changing?',
        options: [
          'The weights — numbers that get nudged to reduce prediction error',
          'The number of layers grows over time',
          'Its source code rewrites itself',
          'The training data gets edited',
        ],
        answer: 0,
        explain:
          'Training = make a prediction, measure how wrong it was, nudge millions of weights slightly so it\'s less wrong next time. Repeat a few billion times.',
      },
    ],
  },
};
