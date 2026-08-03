import 'server-only';

import { z } from 'zod';
import { AIError, type AIProvider, type StructuredRequest, type TextRequest } from '../provider';

/**
 * Deterministic offline coach.
 *
 * This is what runs when no API key is configured, and it is the reason demo
 * mode is honest rather than a stub. The critical property: **every sentence it
 * produces is derived from the student's own text**. It quotes, counts,
 * rearranges and asks questions — it has no capacity to invent an achievement,
 * because it has no generative model behind it.
 *
 * Same input always produces the same output, which also makes it testable.
 */
export class MockAIProvider implements AIProvider {
  readonly providerName = 'offline-coach';

  isConfigured(): boolean {
    return true;
  }

  async generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<T> {
    const material = extractMaterial(request.user);
    const question = extractQuestion(request.user);
    const draft = material.join('\n\n');

    const built = buildForSchema(request.schemaName, { draft, material, question });

    const parsed = request.schema.safeParse(built);
    if (!parsed.success) {
      throw new AIError(
        'invalid-output',
        'The offline coach could not produce a usable response for this request.',
        'mock output failed its own schema',
      );
    }
    return parsed.data;
  }

  async generateText(request: TextRequest): Promise<string> {
    const material = extractMaterial(request.user);
    if (material.length === 0) {
      return 'Add some of your own writing or notes, and I can respond to what is actually there.';
    }
    return [
      'Running without an AI key, so this is the offline coach.',
      `You have given me ${countWords(material.join(' '))} words to work with.`,
      'Everything below is drawn from your own text — I cannot add anything you did not write.',
    ].join(' ');
  }
}

// --- Text utilities ---------------------------------------------------------

function extractMaterial(user: string): string[] {
  const start = user.indexOf('BEGIN STUDENT MATERIAL');
  const end = user.indexOf('END STUDENT MATERIAL');
  if (start === -1 || end === -1) return [];

  const body = user.slice(start + 'BEGIN STUDENT MATERIAL'.length, end).trim();
  if (body.startsWith('(')) return [];

  return body
    .split(/\n--- .+ ---\n/)
    .map((block) => block.replace(/^--- .+ ---\n/, '').trim())
    .filter((block) => block.length > 0);
}

function extractQuestion(user: string): string {
  const marker = 'What the student is asking for:';
  const index = user.indexOf(marker);
  if (index === -1) return '';
  const value = user.slice(index + marker.length).trim();
  return value.startsWith('(') ? '' : value;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Content words the student actually used, most frequent first. */
function keyPhrases(text: string, limit = 6): string[] {
  const stop = new Set([
    'the','and','that','with','from','this','they','have','been','were','what','when','which','there',
    'about','would','could','their','them','then','than','into','your','you','are','was','for','but',
    'not','all','out','one','two','because','after','before','just','like','some','more','most','very',
    'said','says','told','also','only','over','under','again','still','even','much','many','it','its',
    'i','a','an','of','to','in','on','at','is','as','my','me','we','he','she','his','her','do','did',
  ]);
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z']{3,}/g) ?? []) {
    if (stop.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

/** Vague phrasing worth flagging. Matching is literal — no interpretation. */
const VAGUE_PATTERNS: { pattern: RegExp; note: string }[] = [
  { pattern: /\bvery\b/gi, note: '"very" usually disappears without loss' },
  { pattern: /\breally\b/gi, note: '"really" is doing no work here' },
  { pattern: /\ba lot\b/gi, note: '"a lot" — how much, concretely?' },
  { pattern: /\bthings?\b/gi, note: '"thing" is standing in for something specific' },
  { pattern: /\bstuff\b/gi, note: '"stuff" could name what it actually was' },
  { pattern: /\bhelped?\b/gi, note: '"helped" — what did you actually do?' },
  { pattern: /\bpassionate\b/gi, note: '"passionate" is claimed rather than shown' },
  { pattern: /\blearned a lot\b/gi, note: '"learned a lot" — learned what?' },
  { pattern: /\bmade a difference\b/gi, note: '"made a difference" — which difference?' },
  { pattern: /\bhard work\b/gi, note: '"hard work" is told, not shown' },
];

const COMMON_CLICHES = [
  'The sports injury that taught perseverance',
  'The service trip that changed everything',
  'A dictionary definition as an opening line',
  '"Ever since I was little…"',
  'The tidy lesson stated in the final paragraph',
  'The mission-trip epiphany about gratitude',
];

interface MockContext {
  draft: string;
  material: string[];
  question: string;
}

function buildForSchema(schemaName: string, context: MockContext): unknown {
  switch (schemaName) {
    case 'ProfileCoachResponse':
      return profileResponse(context);
    case 'CollegeResearchResponse':
      return researchResponse(context);
    case 'EssayBrainstormResponse':
      return brainstormResponse(context);
    case 'EssayFeedbackResponse':
      return feedbackResponse(context);
    case 'ActivityDescriptionResponse':
      return activityResponse(context);
    case 'DeadlinePlanResponse':
      return planResponse(context);
    default:
      return {};
  }
}

const NO_MATERIAL = 'You have not attached anything yet, so there is nothing for me to read.';

function profileResponse({ draft }: MockContext) {
  if (!draft) {
    return {
      strengthsAlreadySupported: [],
      missingDetails: [NO_MATERIAL],
      reflectionQuestions: ['What have you spent the most time on in the last two years?'],
      suggestedNextSteps: ['Fill in a few activities, then come back to this.'],
      cautionFlags: [],
    };
  }

  const phrases = keyPhrases(draft);
  const lines = sentences(draft).slice(0, 4);

  return {
    strengthsAlreadySupported: lines.map(
      (sentence) => `You have written this down already: "${truncate(sentence, 160)}"`,
    ),
    missingDetails: [
      'How long you have done each of these, in months or years.',
      'What changed because you were the one doing it.',
      'Anything you started, rather than joined.',
      'Anything you kept doing when it stopped being fun.',
    ],
    reflectionQuestions: [
      phrases.length > 0
        ? `You keep coming back to "${phrases[0]}". What is the specific memory underneath that word?`
        : 'Which of these would you still do if nobody were counting it?',
      'Which of these has the clearest before-and-after?',
      'What is the smallest concrete detail you remember from the one that matters most?',
    ],
    suggestedNextSteps: [
      'Add dates and hours to any activity that is missing them.',
      'Write two sentences of reflection on the one you care about most.',
      'Note where each fact comes from, so you can check it later.',
    ],
    cautionFlags: [],
  };
}

function researchResponse({ draft, material }: MockContext) {
  const facts = material.flatMap((block) => sentences(block)).slice(0, 6);

  return {
    factsYouProvided: facts.map((fact) => truncate(fact, 200)),
    questionsToVerifyOnOfficialSources: [
      'What is the exact deadline for the round you are applying in, including the time and time zone?',
      'Which essays are required this year, and what are their current limits?',
      'Is this round binding, and what exactly does that commit you to?',
      'How many recommendations do they want, and from whom?',
      'What are the current testing and fee-waiver policies?',
    ],
    academicFitConsiderations: [
      'Whether the specific programme you want is open to first-years.',
      'How early you have to choose a major or track.',
      'Whether you can combine the two subjects you are interested in.',
    ],
    campusAndLifestyleConsiderations: [
      'What a normal weekday actually looks like there.',
      'How far it is from home, and how you would travel.',
      'Whether the size matches how you actually like to work.',
    ],
    costAndAidQuestions: [
      'Run their official net price calculator with a parent or guardian.',
      'Ask the financial aid office what their aid covers in your situation.',
      'Ask which forms they require and when they are due.',
    ],
    sourceChecklist: [
      'The admissions page for your specific round.',
      'The department page for the major you named.',
      'The financial aid page and the net price calculator.',
      draft ? 'Re-read the notes you already wrote and date them.' : 'Start a notes file with dates.',
    ],
  };
}

function brainstormResponse({ draft, material }: MockContext) {
  if (!draft) {
    return {
      possibleThemes: [],
      reflectionQuestions: [
        'Describe one afternoon in the last year that you still think about. What happened?',
      ],
      scenesToExplore: [],
      tensionsOrChanges: [],
      valuesDemonstrated: [],
      clichesToAvoid: COMMON_CLICHES.slice(0, 3),
    };
  }

  const phrases = keyPhrases(draft, 8);
  const lines = sentences(draft);

  return {
    possibleThemes: phrases
      .slice(0, 4)
      .map((phrase) => `Something around "${phrase}" — it appears more than once in what you wrote.`),
    reflectionQuestions: [
      'What did you think was true at the start of this, and what did you think by the end?',
      'Who else was there, and what did they see you do?',
      'What is the smallest physical detail you still remember?',
      'What did you get wrong, and when did you notice?',
      'Why does this still matter to you now?',
    ],
    scenesToExplore: lines
      .slice(0, 4)
      .map((sentence) => `You mention: "${truncate(sentence, 150)}" — that could be a scene rather than a summary.`),
    tensionsOrChanges: lines
      .filter((sentence) => /\bbut\b|\buntil\b|\bthen\b|\bhowever\b|\bwrong\b/i.test(sentence))
      .slice(0, 4)
      .map((sentence) => `Something turns here: "${truncate(sentence, 150)}"`),
    valuesDemonstrated: phrases
      .slice(0, 4)
      .map((phrase) => `Your own words keep returning to "${phrase}".`),
    clichesToAvoid: COMMON_CLICHES,
  };
}

function feedbackResponse({ draft }: MockContext) {
  if (!draft) {
    return {
      overallReading: 'There is no draft attached yet, so there is nothing for me to read.',
      whatIsMemorable: [],
      whatIsUnclear: [],
      specificityIssues: [],
      structureObservations: [],
      voiceObservations: [],
      repetition: [],
      possibleCuts: [],
      revisionPriorities: ['Write a first draft, however rough. Then come back.'],
      sentenceSuggestions: [],
    };
  }

  const lines = sentences(draft);
  const words = countWords(draft);

  const vague = VAGUE_PATTERNS.flatMap(({ pattern, note }) => {
    const matches = draft.match(pattern);
    return matches ? [`${note} (appears ${matches.length}×)`] : [];
  });

  // Repetition: content words used three or more times.
  const counts = new Map<string, number>();
  for (const word of draft.toLowerCase().match(/[a-z']{4,}/g) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const repeated = [...counts.entries()]
    .filter(([word, count]) => count >= 3 && !['that', 'this', 'with', 'from', 'they', 'have', 'were', 'what', 'when', 'been'].includes(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word, count]) => `"${word}" appears ${count} times.`);

  const longSentences = lines.filter((sentence) => countWords(sentence) > 35);

  return {
    overallReading: [
      `This draft is ${words} words across ${lines.length} sentences.`,
      lines.length > 0
        ? `It opens with "${truncate(lines[0], 120)}" and closes with "${truncate(lines[lines.length - 1], 120)}".`
        : '',
      'Running offline, so this is a structural read of your text rather than an interpretation of it.',
    ]
      .filter(Boolean)
      .join(' '),
    whatIsMemorable: lines
      .filter((sentence) => /\d/.test(sentence) || countWords(sentence) < 14)
      .slice(0, 4)
      .map((sentence) => `Concrete and short: "${truncate(sentence, 150)}"`),
    whatIsUnclear: longSentences
      .slice(0, 4)
      .map((sentence) => `This runs to ${countWords(sentence)} words — a reader may lose the thread: "${truncate(sentence, 150)}"`),
    specificityIssues: vague.slice(0, 6),
    structureObservations: [
      `${lines.length} sentences, averaging ${lines.length > 0 ? Math.round(words / lines.length) : 0} words each.`,
      draft.includes('\n\n')
        ? `${draft.split(/\n\s*\n/).length} paragraphs.`
        : 'It is one continuous block — paragraph breaks would give a reader somewhere to breathe.',
    ],
    voiceObservations: [
      `Your average sentence is ${lines.length > 0 ? Math.round(words / lines.length) : 0} words. Whatever that is, it is yours — keep it.`,
      /\bI\b/.test(draft)
        ? 'You are writing in first person, which suits this.'
        : 'You barely use "I" here. That may be deliberate, but check it is what you want.',
    ],
    repetition: repeated,
    possibleCuts: longSentences
      .slice(0, 3)
      .map((sentence) => `Consider splitting: "${truncate(sentence, 150)}"`),
    revisionPriorities: [
      vague.length > 0 ? 'Replace the vague words listed above with the specific thing you mean.' : '',
      longSentences.length > 0 ? 'Break up the longest sentences.' : '',
      repeated.length > 0 ? 'Vary the repeated words, or repeat them on purpose.' : '',
      'Read it out loud. It catches what reading silently does not.',
    ].filter(Boolean),
    sentenceSuggestions: longSentences.slice(0, 3).map((sentence) => ({
      original: truncate(sentence, 1000),
      suggestion: truncate(splitLongSentence(sentence), 1000),
      why: `This is ${countWords(sentence)} words. Splitting it lets each idea land separately, without changing any of your wording.`,
    })),
  };
}

/** Splits at a conjunction using only the student's own words. */
function splitLongSentence(sentence: string): string {
  const match = /^(.{30,}?[,;])\s+(and|but|so|which|because)\s+(.+)$/i.exec(sentence);
  if (!match) return sentence;
  const first = match[1].replace(/[,;]$/, '.');
  const rest = match[3];
  return `${first} ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
}

function activityResponse({ draft }: MockContext) {
  if (!draft) {
    return {
      supportedActionVerbs: [],
      detailsWorthPrioritising: [NO_MATERIAL],
      weakOrVagueWording: [],
      possibleVersions: [],
      unsupportedClaimWarnings: [],
    };
  }

  const verbs = (draft.toLowerCase().match(/\b(led|ran|built|wrote|taught|trained|organised|organized|collected|logged|maintained|sorted|coached|designed|repaired|planned|hosted|tutored|managed|recorded|scheduled)\b/g) ?? [])
    .filter((verb, index, all) => all.indexOf(verb) === index)
    .map((verb) => `"${verb}" — supported by what you wrote`);

  const vague = VAGUE_PATTERNS.flatMap(({ pattern, note }) =>
    pattern.test(draft) ? [note] : [],
  );

  // Compressions are pure deletions of the student's own text, never additions.
  const condensed = draft
    .replace(/\s+/g, ' ')
    .replace(/\b(very|really|just|quite|somewhat|basically|actually)\s+/gi, '')
    .replace(/\bin order to\b/gi, 'to')
    .replace(/\bI (was responsible for|helped to|worked to)\b/gi, 'I')
    .trim();

  const versions = [condensed, truncate(condensed, 150), truncate(condensed, 100)]
    .filter((text, index, all) => text.length > 0 && all.indexOf(text) === index)
    .map((text) => ({ text, characterCount: [...text].length }));

  return {
    supportedActionVerbs: verbs,
    detailsWorthPrioritising: [
      'What you specifically did, in your own words.',
      'How long you did it for.',
      'Anything you can point at afterwards as evidence.',
    ],
    weakOrVagueWording: vague,
    possibleVersions: versions,
    unsupportedClaimWarnings: /\d/.test(draft)
      ? [
          {
            claim: 'You have used numbers in this description.',
            why: 'Make sure every number is one you can actually back up if asked. I have not added or changed any of them.',
          },
        ]
      : [],
  };
}

function planResponse({ draft, material }: MockContext) {
  const lines = material.flatMap((block) => block.split('\n')).filter((line) => line.trim().length > 0);
  const dated = lines.filter((line) => /\d{4}-\d{2}-\d{2}|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(line));

  return {
    prioritisedTasks: dated.slice(0, 8).map((line) => truncate(line.trim(), 200)),
    recommendedWorkSessions: dated.slice(0, 4).map((line, index) => ({
      when: index === 0 ? 'The next block of free time you have' : `Session ${index + 1}`,
      focus: truncate(line.trim(), 200),
      approximateMinutes: 45,
    })),
    dependencies: [
      'Recommenders need your materials before they can write anything — that one is not under your control once you hand it over.',
      'Transcript requests go through your school office, so they run on the school\'s timeline.',
      'Essays that are shared across applications are worth finishing first.',
    ],
    bufferSuggestions: [
      'Treat your own due date as a few days before the real one.',
      'Leave the day before a deadline for checking, not writing.',
    ],
    overloadedDates: [],
    tasksNeedingVerification: [
      'Confirm every deadline against the official site — including the time and time zone.',
      draft ? 'Check any date you copied from a note rather than from the source.' : '',
    ].filter(Boolean),
  };
}

/** Shared by tests: the schema type used to validate mock output. */
export type MockValidated<T> = z.infer<z.ZodType<T>>;
