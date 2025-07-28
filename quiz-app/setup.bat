@echo off
echo ========================================
echo One Chance Quiz App - Windows Setup
echo ========================================
echo.

echo Installing dependencies...
npm install

echo.
echo Generating Prisma client...
npm run prisma:generate

echo.
echo Running database migrations...
npm run prisma:migrate

echo.
echo Seeding database...
npm run prisma:seed

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create a .env file with your database settings
echo 2. Run: npm run dev
echo 3. Open http://localhost:3000
echo.
echo Default login credentials:
echo - Username: Angshuman, Password: password123
echo - Username: Anshuman, Password: password123
echo - Username: Rayyan, Password: password123
echo.
pause 