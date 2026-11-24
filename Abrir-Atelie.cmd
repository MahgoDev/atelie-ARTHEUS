@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Para abrir o Atelie, instale o Node.js 22 ou superior e execute este arquivo novamente.
  pause
  exit /b 1
)
node scripts\build.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:4173/Atelie-ARTHEUS/ no navegador.
echo Mantenha esta janela aberta enquanto estiver usando o Atelie.
set "PORT=4173"
node scripts\serve.mjs --open
pause

