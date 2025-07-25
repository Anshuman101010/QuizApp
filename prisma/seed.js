console.log('--- JS SEED SCRIPT STARTED ---');
require('dotenv').config();
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
  await prisma.users.deleteMany({});
  console.log('All users deleted.');

  const users = [
    { username: 'Angshuman', email: 'angshuman@example.com' },
    { username: 'Anshuman', email: 'anshuman@example.com' },
    { username: 'Rayyan', email: 'rayyan@example.com' },
  ];
  const createdUsers = [];
  for (const user of users) {
    try {
      const created = await prisma.users.create({
        data: {
          username: user.username,
          password: 'password123',
          email: user.email,
          role: 'host',
        },
      });
      console.log(`Created user: ${created.username}`);
      createdUsers.push(created);
    } catch (err) {
      console.error(`Error creating user ${user.username}:`, err);
    }
  }

  const angshuman = createdUsers.find((u) => u.username === 'Angshuman');
  if (!angshuman) throw new Error('Angshuman user not found in seed');

  await prisma.quizzes.deleteMany({});
  console.log('All quizzes deleted.');

  await prisma.quizzes.create({
    data: {
      user_id: angshuman.id,
      title: 'Sample Quiz',
      description: 'A seeded quiz for demo purposes.',
      negative_marking: false,
      team_mode: false,
      status: 'active',
      questions: {
        create: [
          {
            type: 'multiple_choice',
            question: 'What is the capital of France?',
            correct_answer: 'Paris',
            time_limit: 30,
            points: 100,
            category: 'Geography',
            options: {
              create: [
                { option_text: 'London', option_index: 0 },
                { option_text: 'Berlin', option_index: 1 },
                { option_text: 'Paris', option_index: 2 },
                { option_text: 'Madrid', option_index: 3 },
              ],
            },
          },
          {
            type: 'multiple_choice',
            question: 'Which planet is known as the Red Planet?',
            correct_answer: 'Mars',
            time_limit: 30,
            points: 100,
            category: 'Science',
            options: {
              create: [
                { option_text: 'Mars', option_index: 0 },
                { option_text: 'Venus', option_index: 1 },
                { option_text: 'Jupiter', option_index: 2 },
                { option_text: 'Saturn', option_index: 3 },
              ],
            },
          },
          {
            type: 'multiple_choice',
            question: 'Who painted the Mona Lisa?',
            correct_answer: 'Leonardo da Vinci',
            time_limit: 30,
            points: 100,
            category: 'Art',
            options: {
              create: [
                { option_text: 'Leonardo da Vinci', option_index: 0 },
                { option_text: 'Michelangelo', option_index: 1 },
                { option_text: 'Picasso', option_index: 2 },
                { option_text: 'Van Gogh', option_index: 3 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('Sample quiz created.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
