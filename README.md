# One Chance - Quiz Application

A real-time quiz application built with Next.js, Prisma, and MySQL. Features include live participant tracking, session management, and comprehensive analytics.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ganglet/One_Chance_SE_Project.git
   cd One_Chance_SE_Project
   ```

2. **Install dependencies**
   ```bash
   cd quiz-app
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the `quiz-app` directory:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/NMIMS_QUIZ"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed the database
   npm run prisma:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 One-Command Setup

For new team members, run this single command to set up everything:

```bash
cd quiz-app && npm run setup
```

This will:
- Install all dependencies
- Generate Prisma client
- Run database migrations
- Seed the database with sample data

## 👥 Default Users

After seeding, you can log in with these credentials:

### Host Users
- **Username:** Angshuman, **Password:** password123
- **Username:** Anshuman, **Password:** password123  
- **Username:** Rayyan, **Password:** password123

### Participant Users
- **Username:** Sarah, **Password:** password123
- **Username:** Mike, **Password:** password123

## 🏗️ Project Structure

```
One_Chance_SE_Project/
├── quiz-app/                 # Next.js application
│   ├── app/                  # App router pages
│   ├── components/           # UI components
│   ├── lib/                  # Database utilities
│   ├── hooks/               # Custom React hooks
│   └── public/              # Static assets
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Database schema
│   ├── seed.ts             # Database seeding script
│   └── migrations/         # Database migrations
└── generated/              # Generated Prisma client
```

## 🎯 Features

### For Hosts
- Create and manage quizzes
- Real-time session control
- Participant tracking
- Analytics and reporting
- Question management

### For Participants
- Join quizzes with codes
- Real-time participant list
- Live leaderboard
- Power-ups and bonuses
- Proctoring features

## 🔄 Database Setup

### MySQL Setup
1. Create a MySQL database named `NMIMS_QUIZ`
2. Update the `DATABASE_URL` in your `.env` file
3. Run migrations: `npm run prisma:migrate`

### Troubleshooting Database Issues
- **Connection refused**: Check if MySQL is running
- **Access denied**: Verify username/password in DATABASE_URL
- **Database doesn't exist**: Create the database first

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with sample data
- `npm run db:setup` - Complete database setup
- `npm run setup` - Complete project setup

### Cross-Platform Compatibility
- ✅ macOS
- ✅ Windows
- ✅ Linux
- ✅ All seed scripts work on all platforms

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found" errors**
   ```bash
   npm install
   npm run prisma:generate
   ```

2. **Database connection issues**
   - Verify MySQL is running
   - Check DATABASE_URL in .env
   - Ensure database exists

3. **Seed script fails**
   ```bash
   npm run prisma:generate
   npm run prisma:seed
   ```

4. **Port already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

### Windows-Specific Issues
- Use `npm` instead of `pnpm` if you encounter issues
- Ensure MySQL service is running
- Check Windows firewall settings

## 📝 Environment Variables

Create a `.env` file in the `quiz-app` directory:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/NMIMS_QUIZ"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Custom port
PORT=3000
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is part of the SE (Software Engineering) course at NMIMS.

## 👨‍💻 Team

- **Angshuman Chakravertty**
- **Anshuman**   
- **Rayyan** 

---

**Note**: This project is designed to work seamlessly across all platforms. If you encounter any issues, please check the troubleshooting section above. 