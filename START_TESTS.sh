#!/bin/bash

# 🚀 БЫСТРЫЙ СТАРТ: Cypress UI Тесты
# =====================================
# Этот файл содержит инструкции для запуска UI тестов

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🎯 LLM Translator & Critic - UI Tests             ║"
echo "║                   Cypress E2E Testing                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Шаг 1: Проверка зависимостей
echo "📋 Шаг 1: Проверка зависимостей..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден"
    echo "   Установите Node.js: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js найден: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден"
    echo "   Установите npm: https://www.npmjs.com/"
    exit 1
fi
echo "✅ npm найден: $(npm --version)"

if ! command -v python &> /dev/null; then
    echo "❌ Python не найден"
    echo "   Установите Python: https://www.python.org/"
    exit 1
fi
echo "✅ Python найден: $(python --version)"

echo ""

# Шаг 2: Установка зависимостей
echo "📦 Шаг 2: Установка зависимостей npm..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "Установка npm пакетов..."
    npm install --silent
    echo "✅ npm пакеты установлены"
else
    echo "✅ npm пакеты уже установлены"
fi

echo ""

# Шаг 3: Проверка Flask приложения
echo "⚙️  Шаг 3: Проверка Flask приложения..."
echo ""

if [ ! -f "src/app.py" ]; then
    echo "❌ src/app.py не найден"
    exit 1
fi
echo "✅ src/app.py найден"

echo ""

# Шаг 4: Вывод инструкций
echo "🎯 Шаг 4: Готовность к запуску тестов"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ИНСТРУКЦИИ ПО ЗАПУСКУ                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "1️⃣  ЗАПУСТИТЕ FLASK (в первом терминале):"
echo ""
echo "    python src/app.py"
echo ""
echo "    Вы должны увидеть:"
echo "    Running on http://0.0.0.0:5000"
echo ""

echo "2️⃣  ЗАПУСТИТЕ ТЕСТЫ (во втором терминале):"
echo ""
echo "    ВАРИАНТ A - Headless режим (рекомендуется):"
echo "    npm run cypress:run"
echo ""
echo "    ВАРИАНТ B - Интерактивное окно:"
echo "    npm run cypress:open"
echo ""
echo "    ВАРИАНТ C - С видимым браузером:"
echo "    npm run cypress:run:headed"
echo ""

echo "3️⃣  ПРОВЕРЬТЕ РЕЗУЛЬТАТЫ:"
echo ""
echo "    Вы должны увидеть:"
echo "    ✓ 7 passing (15.3s)"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ПОЛЕЗНЫЕ КОМАНДЫ                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📚 ДОКУМЕНТАЦИЯ:"
echo "    • Quick Start:      docs/CYPRESS_QUICK_START.md"
echo "    • Full Guide:       docs/CYPRESS_SETUP.md"
echo "    • Codespaces:       docs/CODESPACES_SETUP.md"
echo "    • Architecture:     docs/ARCHITECTURE_AND_DESIGN.md"
echo ""

echo "🧪 ЗАПУСК ТЕСТОВ:"
echo "    • npm run cypress:open         (интерактивное окно)"
echo "    • npm run cypress:run          (headless)"
echo "    • npm run cypress:run:headed   (с браузером)"
echo "    • npm test                     (стандартный запуск)"
echo ""

echo "🔍 ОТЛАДКА:"
echo "    • npm run cypress:debug        (режим отладки)"
echo "    • npx cypress cache clear      (очистить кэш)"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              БЫСТРАЯ ПРОВЕРКА                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка версии Cypress
echo "🔎 Версия Cypress:"
npm list cypress 2>/dev/null | grep cypress || echo "  (скрыта, но установлена)"
echo ""

# Проверка конфигурации
if [ -f "cypress.config.js" ]; then
    echo "✅ cypress.config.js найден"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json найден"
fi

if [ -f "cypress/e2e/translator_critic.cy.js" ]; then
    echo "✅ cypress/e2e/translator_critic.cy.js найден"
fi

echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✨ ВСЁ ГОТОВО! Запустите Flask и Cypress для начала!     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "💡 СОВЕТЫ:"
echo "    • Используйте два терминала (один для Flask, один для Cypress)"
echo "    • Для разработки используйте npm run cypress:open"
echo "    • Для CI используйте npm run cypress:run"
echo "    • Читайте docs/CYPRESS_QUICK_START.md для быстрого старта"
echo ""

echo "🚀 НАЧНИТЕ СЕЙЧАС:"
echo ""
echo "    Терминал 1:"
echo "    $ python src/app.py"
echo ""
echo "    Терминал 2:"
echo "    $ npm run cypress:run"
echo ""
