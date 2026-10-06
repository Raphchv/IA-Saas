@echo off
chcp 65001 >nul
title AI Toolbox
cd /d "%~dp0"

echo.
echo  ==============================
echo        Lancement d'AI Toolbox
echo  ==============================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js n'est pas installe. Installe-le depuis https://nodejs.org puis relance ce fichier.
  goto fin
)

if not exist node_modules (
  echo  [1/4] Installation des composants, 1 a 3 minutes la premiere fois...
  call npm install
  if errorlevel 1 goto erreur
)

echo  [2/4] Configuration...
call node scripts/setup.mjs
if errorlevel 1 goto erreur

echo  [3/4] Preparation de la base de donnees...
call npx prisma migrate deploy
if errorlevel 1 goto erreur

echo.
echo  [4/4] Demarrage ! Le site va s'ouvrir dans ton navigateur : http://localhost:3000
echo  Pour arreter AI Toolbox : ferme simplement cette fenetre.
echo.
start "" cmd /c "timeout /t 10 >nul & start http://localhost:3000"
call npm run dev
goto fin

:erreur
echo.
echo  Une erreur est survenue. Fais une capture d'ecran de cette fenetre et envoie-la a Claude.

:fin
echo.
pause
