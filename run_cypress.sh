#!/bin/bash

# Скрипт для запуска Cypress тестов в разных режимах
# Используется для автоматизации запуска тестов

set -e

echo "==============================================="
echo "🚀 Cypress E2E Tests - LLM Translator & Critic"
echo "==============================================="
echo ""

# Проверяем, что npm установлен
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен. Пожалуйста установите Node.js"
    exit 1
fi

# Проверяем, что зависимости установлены
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

echo ""
echo "Доступные команды:"
echo "1. npm run cypress:open      — Интерактивное окно Cypress (рекомендуется)"
echo "2. npm run cypress:run        — Запуск в headless режиме"
echo "3. npm run cypress:run:headed — Запуск с видимым браузером"
echo "4. npm test                   — Стандартный запуск"
echo ""

if [ "$1" == "open" ]; then
    echo "📖 Открываю Cypress UI..."
    npm run cypress:open
elif [ "$1" == "run" ]; then
    echo "🏃 Запускаю тесты в headless режиме..."
    npm run cypress:run
elif [ "$1" == "headed" ]; then
    echo "👀 Запускаю тесты с видимым браузером..."
    npm run cypress:run:headed
else
    echo "⚠️  Укажите режим: open | run | headed"
    echo ""
    echo "Примеры:"
    echo "  bash run_cypress.sh open"
    echo "  bash run_cypress.sh run"
    echo "  bash run_cypress.sh headed"
fi
