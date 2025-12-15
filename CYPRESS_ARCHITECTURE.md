📐 Общая структура тестов

┌─────────────────────────────────────────────────────────┐
│           Cypress E2E Test Suite                        │
│      (tests/ui/cypress/e2e/*.cy.js)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ describe('Success Scenarios')         [3 tests] │  │
│  │  ├─ Translation (Qwen Model)                    │  │
│  │  ├─ Evaluation (Claude Model)                   │  │
│  │  └─ Full Flow (Both Models)                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ describe('Error Handling')            [2 tests] │  │
│  │  ├─ 500 Error on Translation                    │  │
│  │  └─ Error on Evaluation                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ describe('UI & Validation')           [2 tests] │  │
│  │  ├─ Form Elements Visibility                    │  │
│  │  └─ Text Persistence                            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│        cy.intercept() - API Mocking Layer              │
│                                                         │
│  Перехватывает запросы к:                              │
│  https://api.mentorpiece.org/v1/process-ai-request     │
│                                                         │
│  ┌─ Mock Translation (Qwen model)                     │
│  ├─ Mock Evaluation (Claude model)                    │
│  └─ Mock Error Responses (500)                        │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│          Browser (http://localhost:5000)                │
│                                                         │
│  JavaScript в index.html:                               │
│  ┌─ fetch() → API request                             │
│  ├─ cy.intercept() перехватывает                      │
│  └─ Возвращает мок-ответ                              │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│          Flask Application (localhost:5000)             │
│                                                         │
│  GET /  — Отдаёт index.html                            │
│                                                         │
│  Примечание: Flask НЕ делает API запросы.              │
│  Все запросы выполняются JavaScript'ом в браузере.     │
└─────────────────────────────────────────────────────────┘

🔄 Поток данных (успешный тест)

1. Тест стартует
   cy.visit('/')
   ↓
   
2. Настройка мока
   cy.intercept('POST', API_ENDPOINT, mock).as('apiRequest')
   ↓
   
3. Действия пользователя
   cy.get('#original_text').type('Солнце светит')
   cy.get('#target_lang').select('English')
   cy.contains('button', 'Перевести').click()
   ↓
   
4. Браузер выполняет fetch()
   JavaScript → POST /v1/process-ai-request
   ↓
   
5. cy.intercept() перехватывает
   ❌ Реальный API НЕ вызывается
   ✅ Возвращается мок: { response: 'Mocked translation' }
   ↓
   
6. Cypress ждёт запрос
   cy.wait('@apiRequest')
   ↓
   
7. Проверка результата
   cy.contains('Mocked translation').should('be.visible')
   ↓
   
8. ✅ Тест PASSED

🎯 Ключевые отличия архитектуры v2.0

БЫЛО (v1.0):

Браузер → Flask (Python) → API
                ↑
            Тесты не могут перехватить


СТАЛО (v2.0):

Браузер (JavaScript) → API
    ↑
cy.intercept() перехватывает ✅


Причина изменения: Cypress может мокировать только запросы из браузера (через cy.intercept()), но не может перехватить requests.post() из Python.

Компромисс: Функция call_llm() существует в src/app.py только для unit-тестов (pytest), но НЕ используется Flask маршрутами.

📊 Матрица покрытия

| Компонент                       | Unit Tests      | E2E Tests        |
| ------------------------------- | --------------- | ---------------- |
| Функция call_llm()              | ✅ pytest        | ❌                |
| API мокирование                 | ✅ unittest.mock | ✅ cy.intercept() |
| Обработка ошибок                | ✅ pytest        | ✅ Cypress        |
| UI элементы                     | ❌               | ✅ Cypress        |
| Пользовательские сценарии       | ❌               | ✅ Cypress        |
| Безопасность (prompt injection) | ✅ pytest        | ❌                |

🔗 Связанная документация
README_CYPRESS.md — полная инструкция по запуску Cypress тестов

TESTS_README.md — обзор всех тестов (unit + UI)

AQA_README.txt — документация security тестов

🛠️ Быстрый запуск

# Терминал 1: Flask приложение
python src/app.py

# Терминал 2: Cypress тесты
npm run cypress:run:linux

Ожидаемый результат: 7 passing ✅

Последнее обновление: Декабрь 2025