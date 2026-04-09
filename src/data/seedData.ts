import type { QuestionBank } from '../types'

export const seedQuestionBank: QuestionBank = {
  title: 'ExamBuddy Launch Bank',
  tagline: 'A colorful starter pack for multi-subject quiz practice.',
  updatedAt: new Date().toISOString(),
  subjects: [
    {
      id: 'subject-maths',
      title: 'Mathematics Sprint',
      description:
        'Warm up with algebra, geometry, and number sense before moving forward.',
      accent: '#ff7749',
      questions: [
        {
          id: 'maths-q1',
          prompt: 'What is the value of x in the equation 3x + 6 = 21?',
          options: [
            { id: 'maths-q1-a', text: 'x = 3' },
            { id: 'maths-q1-b', text: 'x = 4' },
            { id: 'maths-q1-c', text: 'x = 5' },
            { id: 'maths-q1-d', text: 'x = 6' },
          ],
          correctOptionId: 'maths-q1-c',
          explanation:
            'Subtract 6 from both sides to get 15, then divide by 3 to get x = 5.',
        },
        {
          id: 'maths-q2',
          prompt: 'A triangle has angles 55° and 65°. What is the third angle?',
          options: [
            { id: 'maths-q2-a', text: '50°' },
            { id: 'maths-q2-b', text: '60°' },
            { id: 'maths-q2-c', text: '70°' },
            { id: 'maths-q2-d', text: '80°' },
          ],
          correctOptionId: 'maths-q2-b',
          explanation:
            'The angles in a triangle total 180°, so the missing angle is 180 - 55 - 65 = 60°.',
        },
        {
          id: 'maths-q3',
          prompt: 'What is 15% of 240?',
          options: [
            { id: 'maths-q3-a', text: '24' },
            { id: 'maths-q3-b', text: '30' },
            { id: 'maths-q3-c', text: '36' },
            { id: 'maths-q3-d', text: '42' },
          ],
          correctOptionId: 'maths-q3-c',
          explanation:
            '10% of 240 is 24 and 5% is 12, so 15% is 36.',
        },
      ],
    },
    {
      id: 'subject-science',
      title: 'Science Pulse',
      description:
        'Check biology, chemistry, and physics basics with quick multiple-choice questions.',
      accent: '#00bdd6',
      questions: [
        {
          id: 'science-q1',
          prompt: 'Which part of the cell controls most of its activities?',
          options: [
            { id: 'science-q1-a', text: 'Cell membrane' },
            { id: 'science-q1-b', text: 'Nucleus' },
            { id: 'science-q1-c', text: 'Cytoplasm' },
            { id: 'science-q1-d', text: 'Ribosome' },
          ],
          correctOptionId: 'science-q1-b',
          explanation:
            'The nucleus contains genetic material and acts as the control center of the cell.',
        },
        {
          id: 'science-q2',
          prompt: 'What is the chemical symbol for sodium?',
          options: [
            { id: 'science-q2-a', text: 'S' },
            { id: 'science-q2-b', text: 'So' },
            { id: 'science-q2-c', text: 'Na' },
            { id: 'science-q2-d', text: 'Sd' },
          ],
          correctOptionId: 'science-q2-c',
          explanation:
            'Sodium is represented by Na, from the Latin word natrium.',
        },
        {
          id: 'science-q3',
          prompt: 'What force pulls objects toward the Earth?',
          options: [
            { id: 'science-q3-a', text: 'Magnetism' },
            { id: 'science-q3-b', text: 'Friction' },
            { id: 'science-q3-c', text: 'Gravity' },
            { id: 'science-q3-d', text: 'Inertia' },
          ],
          correctOptionId: 'science-q3-c',
          explanation:
            'Gravity is the attractive force between masses, including Earth and objects near it.',
        },
      ],
    },
    {
      id: 'subject-english',
      title: 'English Express',
      description:
        'Finish strong with grammar, comprehension, and vocabulary review.',
      accent: '#7a5cff',
      questions: [
        {
          id: 'english-q1',
          prompt: 'Which sentence is written in the past tense?',
          options: [
            { id: 'english-q1-a', text: 'She walks to school every day.' },
            { id: 'english-q1-b', text: 'She will walk to school tomorrow.' },
            { id: 'english-q1-c', text: 'She walked to school yesterday.' },
            { id: 'english-q1-d', text: 'She is walking to school now.' },
          ],
          correctOptionId: 'english-q1-c',
          explanation:
            'The verb "walked" shows the action already happened in the past.',
        },
        {
          id: 'english-q2',
          prompt: 'Choose the synonym for the word "rapid".',
          options: [
            { id: 'english-q2-a', text: 'Slow' },
            { id: 'english-q2-b', text: 'Fast' },
            { id: 'english-q2-c', text: 'Quiet' },
            { id: 'english-q2-d', text: 'Heavy' },
          ],
          correctOptionId: 'english-q2-b',
          explanation:
            'Rapid means happening quickly, so "fast" is the best synonym.',
        },
        {
          id: 'english-q3',
          prompt: 'Which punctuation mark correctly ends a direct question?',
          options: [
            { id: 'english-q3-a', text: 'Period' },
            { id: 'english-q3-b', text: 'Comma' },
            { id: 'english-q3-c', text: 'Semicolon' },
            { id: 'english-q3-d', text: 'Question mark' },
          ],
          correctOptionId: 'english-q3-d',
          explanation:
            'A direct question ends with a question mark.',
        },
      ],
    },
  ],
}

export const sampleImportTemplate = `Subject: History Foundations
Description: Ancient civilizations, timelines, and key events.

Question: Which river was central to ancient Egyptian civilization?
A. Amazon
B. Nile
C. Thames
D. Danube
Answer: B
Explanation: Ancient Egypt grew around the Nile River because it supported farming and transport.

Question: Which civilization built the Roman Colosseum?
A. Greek
B. Persian
C. Roman
D. Mesopotamian
Answer: C
Explanation: The Colosseum was built in Rome under the Flavian emperors.

Subject: Computing Basics
Description: Starter questions for digital literacy and programming concepts.

Question: What does CPU stand for?
A. Central Process Unit
B. Computer Personal Unit
C. Central Processing Unit
D. Control Processing Utility
Answer: C
Explanation: CPU stands for Central Processing Unit.

Question: Which language is commonly used to style websites?
A. HTML
B. CSS
C. SQL
D. Python
Answer: B
Explanation: CSS controls the presentation and visual styling of web pages.`
