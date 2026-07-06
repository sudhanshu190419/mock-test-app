/**
 * Mock Test Engine Data
 *
 * Realistic mock data for the PYQ Mock Test Engine UI development.
 * Replace with real API responses when integrating the backend.
 * Structure mirrors QuestionDisplay, TestConfig, and SubjectSection
 * from types/testEngine.ts.
 *
 * @module data/mockTestEngine
 */

import type { QuestionDisplay, TestConfig, SubjectSection } from '../types/testEngine';

// ─── Subjects ───────────────────────────────────────────────────────

const SUBJECTS: SubjectSection[] = [
  { id: 'physics', name: 'Physics', questionStartIndex: 0, questionEndIndex: 9 },
  { id: 'chemistry', name: 'Chemistry', questionStartIndex: 10, questionEndIndex: 19 },
  { id: 'mathematics', name: 'Mathematics', questionStartIndex: 20, questionEndIndex: 29 },
];

// ─── Options Factory ────────────────────────────────────────────────

function createOptions(
  correctId: string,
  texts: [string, string, string, string],
): { id: string; label: string; text: string }[] {
  const labels = ['A', 'B', 'C', 'D'] as const;
  return texts.map((text, i) => ({
    id: i === 0 ? correctId : `opt_${Math.random().toString(36).slice(2, 8)}`,
    label: labels[i],
    text,
  }));
}

// ─── Mock Questions ─────────────────────────────────────────────────

export const MOCK_QUESTIONS: QuestionDisplay[] = [
  // ── Physics (0–9) ────────────────────────────────────────────
  {
    id: 'q_phy_001',
    index: 1,
    text: 'A particle moves in a circle of radius R with a constant speed v. The magnitude of change in velocity when it covers an angle θ is:',
    options: createOptions('opt_phy_001_a', [
      '2v sin(θ/2)',
      '2v cos(θ/2)',
      'v sin(θ)',
      'v cos(θ)',
    ]),
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0FiIcIBLhcxkUhYb7Bjux3gpyvje3R0-9wQP8bwA_wgAUqPSHiybzqUgV0LYUbiqWXr2Ej-bmfg3lqd3tlBpyizfvd_hZOiFGKxTtuawcrs7__QhecTTXYqqKejK3vtJlBXfLFqLJ8Ixb7bSOvW_PrNc4j2u40-8xrw9Y5hhyAhT5sUdNZepgnZiGU_NiOVoCwivIm9XCf6FjLRmFh37V0VKSLlhptIJsDcwlWjE1WGugU6VaCJRT',
    imageAlt: 'A circle of radius R with a particle at two points separated by angle θ, showing velocity vectors.',
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_002',
    index: 2,
    text: 'A block of mass m is placed on a smooth inclined plane of inclination θ. The acceleration of the block down the plane is:',
    options: createOptions('opt_phy_002_a', [
      'g sin θ',
      'g cos θ',
      'g tan θ',
      'g sec θ',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_003',
    index: 3,
    text: 'The dimensional formula of Planck\'s constant h is:',
    options: createOptions('opt_phy_003_a', [
      '[ML²T⁻¹]',
      '[MLT⁻²]',
      '[ML²T⁻²]',
      '[MLT⁻¹]',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_004',
    index: 4,
    text: 'A convex lens of focal length 20 cm forms a real image at a distance of 30 cm from the lens. The object distance is:',
    options: createOptions('opt_phy_004_a', [
      '60 cm',
      '45 cm',
      '30 cm',
      '15 cm',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_005',
    index: 5,
    text: 'The escape velocity from the surface of Earth is approximately:',
    options: createOptions('opt_phy_005_a', [
      '11.2 km/s',
      '8.0 km/s',
      '15.6 km/s',
      '9.8 km/s',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_006',
    index: 6,
    text: 'In a Young\'s double-slit experiment, the fringe width is β. If the entire apparatus is immersed in water (refractive index μ), the new fringe width is:',
    options: createOptions('opt_phy_006_a', [
      'β/μ',
      'βμ',
      'β/μ²',
      'β√μ',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_007',
    index: 7,
    text: 'A wire of resistance R is stretched to double its length. The new resistance is:',
    options: createOptions('opt_phy_007_a', [
      '4R',
      '2R',
      'R/2',
      'R/4',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_008',
    index: 8,
    text: 'The de Broglie wavelength of an electron accelerated through a potential difference of V volts is proportional to:',
    options: createOptions('opt_phy_008_a', [
      '1/√V',
      '1/V',
      '√V',
      'V',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_009',
    index: 9,
    text: 'A capacitor of capacitance C is charged to a potential V and then connected to an inductor of inductance L. The frequency of oscillation is:',
    options: createOptions('opt_phy_009_a', [
      '1/(2π√LC)',
      '1/(π√LC)',
      '2π√LC',
      'π√LC',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },
  {
    id: 'q_phy_010',
    index: 10,
    text: 'The ratio of specific heats (Cp/Cv) for a monatomic gas is:',
    options: createOptions('opt_phy_010_a', [
      '5/3',
      '7/5',
      '4/3',
      '3/2',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Physics',
  },

  // ── Chemistry (10–19) ────────────────────────────────────────
  {
    id: 'q_chem_001',
    index: 11,
    text: 'The hybridization of carbon in methane (CH₄) is:',
    options: createOptions('opt_chem_001_a', [
      'sp³',
      'sp²',
      'sp',
      'sp³d',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_002',
    index: 12,
    text: 'Which of the following is an aromatic compound?',
    options: createOptions('opt_chem_002_a', [
      'Benzene',
      'Cyclohexane',
      'Cyclohexene',
      'Cyclooctatetraene',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_003',
    index: 13,
    text: 'The pH of a 0.001 M HCl solution is:',
    options: createOptions('opt_chem_003_a', [
      '3',
      '1',
      '11',
      '7',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_004',
    index: 14,
    text: 'The IUPAC name of CH₃CH₂CH₂OH is:',
    options: createOptions('opt_chem_004_a', [
      'Propan-1-ol',
      'Propan-2-ol',
      'Ethanol',
      'Butanol',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_005',
    index: 15,
    text: 'Which of the following is a strong acid?',
    options: createOptions('opt_chem_005_a', [
      'HCl',
      'CH₃COOH',
      'H₂CO₃',
      'H₂S',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_006',
    index: 16,
    text: 'The number of electrons in the outermost shell of a noble gas is:',
    options: createOptions('opt_chem_006_a', [
      '8',
      '2',
      '6',
      '4',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_007',
    index: 17,
    text: 'Which law states that the volume of a gas is directly proportional to its absolute temperature at constant pressure?',
    options: createOptions('opt_chem_007_a', [
      'Charles\'s Law',
      'Boyle\'s Law',
      'Avogadro\'s Law',
      'Gay-Lussac\'s Law',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_008',
    index: 18,
    text: 'The oxidation state of Cr in K₂Cr₂O₇ is:',
    options: createOptions('opt_chem_008_a', [
      '+6',
      '+3',
      '+4',
      '+7',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_009',
    index: 19,
    text: 'Which of the following is a greenhouse gas?',
    options: createOptions('opt_chem_009_a', [
      'CO₂',
      'O₂',
      'N₂',
      'H₂',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },
  {
    id: 'q_chem_010',
    index: 20,
    text: 'The functional group in an aldehyde is:',
    options: createOptions('opt_chem_010_a', [
      '-CHO',
      '-COOH',
      '-OH',
      '-NH₂',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Chemistry',
  },

  // ── Mathematics (20–29) ──────────────────────────────────────
  {
    id: 'q_math_001',
    index: 21,
    text: 'If A = {1, 2, 3} and B = {2, 3, 4}, then A ∪ B is:',
    options: createOptions('opt_math_001_a', [
      '{1, 2, 3, 4}',
      '{2, 3}',
      '{1, 2, 3}',
      '{1, 4}',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_002',
    index: 22,
    text: 'The derivative of x² with respect to x is:',
    options: createOptions('opt_math_002_a', [
      '2x',
      'x',
      'x²/2',
      '2x²',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_003',
    index: 23,
    text: '∫(1/x) dx =',
    options: createOptions('opt_math_003_a', [
      'ln|x| + C',
      'eˣ + C',
      'x ln|x| + C',
      '1/x² + C',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_004',
    index: 24,
    text: 'The probability of getting a head when a fair coin is tossed is:',
    options: createOptions('opt_math_004_a', [
      '1/2',
      '1/4',
      '1',
      '0',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_005',
    index: 25,
    text: 'The determinant of the identity matrix of order 3 is:',
    options: createOptions('opt_math_005_a', [
      '1',
      '0',
      '3',
      '-1',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_006',
    index: 26,
    text: 'The sum of interior angles of a pentagon is:',
    options: createOptions('opt_math_006_a', [
      '540°',
      '360°',
      '720°',
      '900°',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_007',
    index: 27,
    text: 'The value of sin²θ + cos²θ is:',
    options: createOptions('opt_math_007_a', [
      '1',
      '0',
      'sin θ cos θ',
      '2',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_008',
    index: 28,
    text: 'The distance between the points (0, 0) and (3, 4) is:',
    options: createOptions('opt_math_008_a', [
      '5',
      '7',
      '25',
      '1',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_009',
    index: 29,
    text: 'If log₂ 8 = x, then x is:',
    options: createOptions('opt_math_009_a', [
      '3',
      '2',
      '4',
      '8',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
  {
    id: 'q_math_010',
    index: 30,
    text: 'The common ratio of the geometric progression 2, 6, 18, ... is:',
    options: createOptions('opt_math_010_a', [
      '3',
      '2',
      '4',
      '6',
    ]),
    marks: 4,
    negativeMarks: 1,
    subjectName: 'Mathematics',
  },
];

// ─── Mock Test Config ───────────────────────────────────────────────

export const MOCK_TEST_CONFIG: TestConfig = {
  testId: 'test_jee_phy_2025_001',
  paperId: 'jee_main_2025_shift1',
  subjectId: null,
  title: 'JEE Advanced: Practice Test 01',
  shortTitle: 'Test 01',
  durationMin: 180,
  totalQuestions: MOCK_QUESTIONS.length,
  totalMarks: MOCK_QUESTIONS.reduce((sum, q) => sum + q.marks, 0),
  subjects: SUBJECTS,
  negativeMarking: 1,
};

/** Total test duration in seconds. */
export const MOCK_DURATION_SECONDS = MOCK_TEST_CONFIG.durationMin * 60;

export { SUBJECTS };
