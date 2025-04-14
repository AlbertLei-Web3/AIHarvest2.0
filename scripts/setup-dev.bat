@echo off
ECHO Setting up AIHarvest 2.0 development environment...

REM Check for Node.js
WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    ECHO Node.js is not installed. Please install Node.js 18+ before continuing.
    EXIT /B 1
)

REM Check Node.js version
FOR /F "tokens=1,2,3 delims=." %%a IN ('node -v') DO (
    SET NODE_VER=%%a
    SET NODE_VER=!NODE_VER:~1!
)
IF %NODE_VER% LSS 18 (
    ECHO Node.js version 18+ is required. Current version: %NODE_VER%
    EXIT /B 1
)

REM Check for npm
WHERE npm >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    ECHO npm is not installed. Please install npm before continuing.
    EXIT /B 1
)

REM Create .env from example if it doesn't exist
IF NOT EXIST .env (
    ECHO Creating .env file from .env.example...
    COPY .env.example .env
    ECHO Please update the .env file with your configuration values.
)

REM Install dependencies
ECHO Installing project dependencies...
CALL npm install

REM Install workspace dependencies
ECHO Installing workspace dependencies...
CD frontend && CALL npm install && CD ..
CD backend && CALL npm install && CD ..
CD contracts && CALL npm install && CD ..

REM Compile contracts
ECHO Compiling smart contracts...
CALL npm run compile

ECHO Development environment setup complete!
ECHO To start development servers:
ECHO   - Frontend: npm run dev:frontend
ECHO   - Backend:  npm run dev:backend
ECHO   - Hardhat:  npx hardhat node 