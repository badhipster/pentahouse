#!/bin/bash
# Double-click this file to start the Pentahouse dashboard.
# It opens a Terminal window, installs dependencies the first time,
# auto-fixes the common Rollup optional-deps bug, and starts the dev server.

cd "$(dirname "$0")" || exit 1
clear
echo "──────────────────────────────────────────────"
echo "  Pentahouse dashboard"
echo "  Keep this window open while you use the app."
echo "──────────────────────────────────────────────"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js / npm not found. Install Node from https://nodejs.org then run this again."
  read -p "Press enter to close."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run — installing dependencies (a few minutes)..."
  npm install || { echo "Install failed."; read -p "Press enter to close."; exit 1; }
fi

echo "Starting the server..."
echo "When it says 'Local: http://localhost:...', open that link in your browser."
echo "Sign in as Rohit (Sales Rep) to see the new 'Call these first' list."
echo
npm run dev
status=$?

if [ $status -ne 0 ]; then
  echo
  echo "The server hit an error. Trying a clean reinstall (fixes the common rollup bug)..."
  rm -rf node_modules package-lock.json
  npm install && npm run dev
fi

echo
read -p "Server stopped. Press enter to close this window."
