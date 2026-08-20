#!/bin/bash
echo ""
echo "  =========================================="
echo "    ISO Termizy Avlodlari - LMS Platform"
echo "    Xorijiy tillar o'quv markazi"
echo "  =========================================="
echo ""
echo "  [1/3] Kutubxonalar o'rnatilmoqda..."

cd "$(dirname "$0")"

npm install --silent 2>/dev/null
npm --prefix server install --silent 2>/dev/null
npm --prefix client install --silent 2>/dev/null

echo ""
echo "  [2/3] Server ishga tushmoqda (port 4000)..."

cd server && npm run dev &
SERVER_PID=$!
cd ..

sleep 3

echo "  [3/3] Frontend ishga tushmoqda (port 5173)..."
echo ""
echo "  ✅ Brauzerda oching: http://localhost:5173"
echo "  📱 Director: 998993212141 / 123456"
echo ""

cd client && npm run dev

kill $SERVER_PID 2>/dev/null
