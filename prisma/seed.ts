console.log('--- SEED SCRIPT STARTED ---')
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] })

async function main() {
  // Remove all data for a clean slate
  await prisma.answers.deleteMany({})
  await prisma.session_participants.deleteMany({})
  await prisma.quiz_sessions.deleteMany({})
  await prisma.options.deleteMany({})
  await prisma.questions.deleteMany({})
  await prisma.participant_history.deleteMany({})
  await prisma.quizzes.deleteMany({})
  await prisma.users.deleteMany({})
  console.log('All data deleted.')

  // Create users with different roles
  const users = [
    { username: 'Angshuman', email: 'angshuman@example.com', role: 'host' as const },
    { username: 'Anshuman', email: 'anshuman@example.com', role: 'host' as const },
    { username: 'Rayyan', email: 'rayyan@example.com', role: 'host' as const },
    { username: 'Sarah', email: 'sarah@example.com', role: 'participant' as const },
    { username: 'Mike', email: 'mike@example.com', role: 'participant' as const },
  ]

  const createdUsers = []
  for (const user of users) {
    try {
      const created = await prisma.users.create({
        data: {
          username: user.username,
          password: 'password123',
          email: user.email,
          role: user.role,
        },
      })
      console.log(`Created user: ${created.username} (${created.role})`)
      createdUsers.push(created)
    } catch (err) {
      console.error(`Error creating user ${user.username}:`, err)
    }
  }

  // Get host users
  const hostUsers = createdUsers.filter(u => u.role === 'host')
  const participantUsers = createdUsers.filter(u => u.role === 'participant')

  // Quiz data for each host user
  const quizTemplates = [
    {
      title: 'General Knowledge Quiz',
      description: 'Test your knowledge across various subjects',
      questions: [
        {
          question: 'What is the capital of France?',
          correct_answer: 'Paris',
          category: 'Geography',
          options: ['London', 'Berlin', 'Paris', 'Madrid']
        },
        {
          question: 'Which planet is known as the Red Planet?',
          correct_answer: 'Mars',
          category: 'Science',
          options: ['Mars', 'Venus', 'Jupiter', 'Saturn']
        },
        {
          question: 'Who painted the Mona Lisa?',
          correct_answer: 'Leonardo da Vinci',
          category: 'Art',
          options: ['Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh']
        },
        {
          question: 'What is the largest ocean on Earth?',
          correct_answer: 'Pacific Ocean',
          category: 'Geography',
          options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean']
        },
        {
          question: 'Which element has the chemical symbol "O"?',
          correct_answer: 'Oxygen',
          category: 'Science',
          options: ['Osmium', 'Oxygen', 'Oganesson', 'Osmium']
        }
      ]
    },
    {
      title: 'Computer Science Fundamentals',
      description: 'Test your knowledge of programming and computer science',
      questions: [
        {
          question: 'What does HTML stand for?',
          correct_answer: 'HyperText Markup Language',
          category: 'Programming',
          options: ['High Tech Modern Language', 'HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlink and Text Markup Language']
        },
        {
          question: 'Which programming language is known as the "language of the web"?',
          correct_answer: 'JavaScript',
          category: 'Programming',
          options: ['Python', 'Java', 'JavaScript', 'C++']
        },
        {
          question: 'What is the primary function of CSS?',
          correct_answer: 'Styling and layout',
          category: 'Programming',
          options: ['Database management', 'Styling and layout', 'Server-side logic', 'Security']
        },
        {
          question: 'Which data structure operates on LIFO principle?',
          correct_answer: 'Stack',
          category: 'Data Structures',
          options: ['Queue', 'Stack', 'Tree', 'Graph']
        },
        {
          question: 'What does API stand for?',
          correct_answer: 'Application Programming Interface',
          category: 'Programming',
          options: ['Application Programming Interface', 'Advanced Programming Interface', 'Automated Programming Interface', 'Application Process Integration']
        }
      ]
    },
    {
      title: 'History Quiz',
      description: 'Journey through time with these historical questions',
      questions: [
        {
          question: 'In which year did World War II end?',
          correct_answer: '1945',
          category: 'History',
          options: ['1943', '1944', '1945', '1946']
        },
        {
          question: 'Who was the first President of the United States?',
          correct_answer: 'George Washington',
          category: 'History',
          options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Benjamin Franklin']
        },
        {
          question: 'Which ancient wonder was located in Alexandria?',
          correct_answer: 'Lighthouse of Alexandria',
          category: 'History',
          options: ['Hanging Gardens', 'Lighthouse of Alexandria', 'Colossus of Rhodes', 'Temple of Artemis']
        },
        {
          question: 'What year did Christopher Columbus reach the Americas?',
          correct_answer: '1492',
          category: 'History',
          options: ['1490', '1491', '1492', '1493']
        },
        {
          question: 'Which empire was ruled by Emperor Augustus?',
          correct_answer: 'Roman Empire',
          category: 'History',
          options: ['Greek Empire', 'Roman Empire', 'Persian Empire', 'Egyptian Empire']
        }
      ]
    },
    {
      title: 'Sports Trivia',
      description: 'Test your knowledge of sports and athletics',
      questions: [
        {
          question: 'Which country has won the most FIFA World Cups?',
          correct_answer: 'Brazil',
          category: 'Sports',
          options: ['Germany', 'Argentina', 'Brazil', 'Italy']
        },
        {
          question: 'In which sport would you perform a slam dunk?',
          correct_answer: 'Basketball',
          category: 'Sports',
          options: ['Volleyball', 'Basketball', 'Tennis', 'Soccer']
        },
        {
          question: 'How many players are on a soccer team during a match?',
          correct_answer: '11',
          category: 'Sports',
          options: ['9', '10', '11', '12']
        },
        {
          question: 'Which tennis player has won the most Grand Slam titles?',
          correct_answer: 'Margaret Court',
          category: 'Sports',
          options: ['Serena Williams', 'Steffi Graf', 'Margaret Court', 'Martina Navratilova']
        },
        {
          question: 'What is the national sport of Japan?',
          correct_answer: 'Sumo wrestling',
          category: 'Sports',
          options: ['Baseball', 'Sumo wrestling', 'Karate', 'Judo']
        }
      ]
    },
    {
      title: 'Literature Classics',
      description: 'Test your knowledge of famous books and authors',
      questions: [
        {
          question: 'Who wrote "Pride and Prejudice"?',
          correct_answer: 'Jane Austen',
          category: 'Literature',
          options: ['Charlotte Brontë', 'Jane Austen', 'Emily Brontë', 'Mary Shelley']
        },
        {
          question: 'What is the name of the main character in "The Great Gatsby"?',
          correct_answer: 'Jay Gatsby',
          category: 'Literature',
          options: ['Nick Carraway', 'Jay Gatsby', 'Daisy Buchanan', 'Tom Buchanan']
        },
        {
          question: 'Which Shakespeare play features the character Hamlet?',
          correct_answer: 'Hamlet',
          category: 'Literature',
          options: ['Macbeth', 'Hamlet', 'Romeo and Juliet', 'Othello']
        },
        {
          question: 'Who wrote "1984"?',
          correct_answer: 'George Orwell',
          category: 'Literature',
          options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H.G. Wells']
        },
        {
          question: 'What is the setting of "Lord of the Flies"?',
          correct_answer: 'A deserted island',
          category: 'Literature',
          options: ['A boarding school', 'A deserted island', 'A city', 'A forest']
        }
      ]
    }
  ]

  // Create quizzes for each host user
  for (let i = 0; i < hostUsers.length; i++) {
    const hostUser = hostUsers[i]
    
    // Give each host user 2-3 quizzes
    const quizzesForUser = quizTemplates.slice(i * 2, (i + 1) * 2)
    
    for (const quizTemplate of quizzesForUser) {
      try {
        const quiz = await prisma.quizzes.create({
          data: {
            user_id: hostUser.id,
            title: quizTemplate.title,
            description: quizTemplate.description,
            negative_marking: Math.random() > 0.5, // Random negative marking
            team_mode: Math.random() > 0.7, // 30% chance of team mode
            status: Math.random() > 0.3 ? 'active' : 'draft', // 70% active, 30% draft
            questions: {
              create: quizTemplate.questions.map((q, qIndex) => ({
                type: 'multiple_choice',
                question: q.question,
                correct_answer: q.correct_answer,
                time_limit: 30 + Math.floor(Math.random() * 30), // 30-60 seconds
                points: 50 + Math.floor(Math.random() * 100), // 50-150 points
                category: q.category,
                options: {
                  create: q.options.map((option, optIndex) => ({
                    option_text: option,
                    option_index: optIndex
                  }))
                }
              }))
            }
          }
        })
        console.log(`Created quiz "${quiz.title}" for user ${hostUser.username}`)
      } catch (err) {
        console.error(`Error creating quiz for ${hostUser.username}:`, err)
      }
    }
  }

  // Create some quiz sessions and participant history for realism
  const allQuizzes = await prisma.quizzes.findMany()
  
  for (const quiz of allQuizzes.slice(0, 3)) { // Create sessions for first 3 quizzes
    try {
      // Create a quiz session
      const session = await prisma.quiz_sessions.create({
        data: {
          quiz_id: quiz.id,
          host_id: quiz.user_id,
          status: 'completed',
          started_at: new Date(Date.now() - 86400000), // 1 day ago
          ended_at: new Date(Date.now() - 82800000), // 10 hours ago
        }
      })

      // Add some participants to the session
      for (const participant of participantUsers.slice(0, 2)) {
        await prisma.session_participants.create({
          data: {
            session_id: session.id,
            user_id: participant.id,
            join_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            score: 50 + Math.floor(Math.random() * 400), // Random score 50-450
            streak: Math.floor(Math.random() * 5), // Random streak 0-4
            accuracy: Math.random() * 100, // Random accuracy 0-100%
          }
        })

        // Create participant history
        await prisma.participant_history.create({
          data: {
            user_id: participant.id,
            quiz_id: quiz.id,
            total_sessions: 1,
            total_score: 50 + Math.floor(Math.random() * 400),
            total_correct: Math.floor(Math.random() * 5),
            total_questions: 5,
            best_streak: Math.floor(Math.random() * 5),
            last_played: new Date(Date.now() - 82800000),
          }
        })
      }

      console.log(`Created session for quiz "${quiz.title}"`)
    } catch (err) {
      console.error(`Error creating session for quiz ${quiz.id}:`, err)
    }
  }

  console.log('Seed completed successfully!')
  console.log('\n--- LOGIN CREDENTIALS ---')
  console.log('Host Users:')
  hostUsers.forEach(user => {
    console.log(`  Username: ${user.username}, Password: password123`)
  })
  console.log('\nParticipant Users:')
  participantUsers.forEach(user => {
    console.log(`  Username: ${user.username}, Password: password123`)
  })
  console.log('\nEach host user now has their own independent dashboard with multiple quizzes!')
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(() => prisma.$disconnect())
