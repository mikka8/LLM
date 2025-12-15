/**
 * Cypress E2E тесты для приложения "AI Translator & Critic"
 *
 * Ключевая идея:
 * - Приложение (в браузере) делает POST-запросы к внешнему API.
 * - В тестах мы НЕ ходим в реальный API — вместо этого используем cy.intercept()
 *   и возвращаем предсказуемые мок-ответы.
 *
 * Запуск (в Codespaces/Linux headless):
 * - Терминал 1: python src/app.py
 * - Терминал 2: npm run cypress:run:linux
 */

describe('AI Translator & Critic - E2E Tests Suite', () => {
  // Внешний API (реально в сеть в тестах не ходим — всё мокируем)
  const API_ENDPOINT = 'https://api.mentorpiece.org/v1/process-ai-request'
  // Для стабильности перехвата используем wildcard (две звёздочки + /process-ai-request)
  const API_WILDCARD = '**/process-ai-request'

  // Модели, которые приложение отправляет в body.model_name
  const TRANSLATION_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct'
  const EVALUATION_MODEL = 'claude-sonnet-4-5-20250929'

  // Тестовые данные
  const ORIGINAL_TEXT = 'Солнце светит.'
  const TARGET_LANG_LABEL_RU = 'Английский'

  beforeEach(() => {
    /**
     * Перед каждым тестом:
     * 1) Заходим на главную страницу
     * 2) Проверяем, что UI отрисовался
     */
    cy.visit('/')
    cy.get('h3').contains('AI Translator & Critic').should('be.visible')
  })

  describe('Основной сценарий (успех)', () => {
    it('Успешный перевод и оценка с моками (Qwen + Claude)', () => {
      /**
       * cy.intercept(method, urlPattern, handler)
       * - Перехватывает HTTP-запросы, которые отправляет браузер (fetch/XHR).
       * - handler получает объект req, где можно:
       *   - посмотреть req.body
       *   - ответить мок-ответом через req.reply(...)
       *   - или пропустить запрос в сеть через req.continue()
       *
       * Ниже мы создаём ДВА alias — чтобы отдельно подтвердить:
       * - что был запрос на перевод (Qwen)
       * - что был запрос на оценку (Claude)
       */
      cy.intercept('POST', API_WILDCARD, (req) => {
        // Проверяем, что URL действительно тот самый (дополнительная защита)
        // Важно: не мокируем по точному URL, потому что в разных средах могут быть нюансы,
        // но при этом логически подтверждаем целевой endpoint.
        if (typeof req.url === 'string' && !req.url.includes('/process-ai-request')) {
          req.continue()
          return
        }

        const modelName = req.body?.model_name

        if (modelName === TRANSLATION_MODEL) {
          // Мок 1: перевод
          req.alias = 'translationRequest'
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Translation: The sun is shining.' },
          })
          return
        }

        if (modelName === EVALUATION_MODEL) {
          // Мок 2: оценка
          req.alias = 'evaluationRequest'
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Grade: 9/10. Fluent and accurate.' },
          })
          return
        }

        // Если пришла неизвестная модель — пусть идёт дальше (или можно падать тестом).
        req.continue()
      })

      // Шаг 1: вводим исходный текст
      cy.get('textarea#original_text')
        .should('be.visible')
        .clear()
        .type(ORIGINAL_TEXT)
        .should('have.value', ORIGINAL_TEXT)

      // Шаг 2: выбираем язык (в UI это "Английский")
      cy.get('select#target_lang').should('be.visible').select(TARGET_LANG_LABEL_RU)

      // Шаг 3: нажимаем "Перевести"
      cy.contains('button', 'Перевести').should('be.enabled').click()

      /**
       * Проверка 1 (асинхронность):
       * cy.wait('@translationRequest') ждёт именно перехваченный запрос на перевод.
       * Это и есть корректная синхронизация с сетью вместо "sleep" ожиданий.
       */
      cy.wait('@translationRequest').then((interception) => {
        expect(interception.request.body.model_name).to.equal(TRANSLATION_MODEL)
      })

      // Проверяем результат перевода в UI (асинхронный контент появляется после ответа API)
      cy.get('#translationResult')
        .should('be.visible')
        .and('contain', 'Mocked Translation: The sun is shining.')

      // Шаг 4: нажимаем "Оценить при помощи LLM-as-a-Judge"
      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge')
        .should('be.enabled')
        .click()

      // Проверка 2: ждём запрос на оценку
      cy.wait('@evaluationRequest').then((interception) => {
        expect(interception.request.body.model_name).to.equal(EVALUATION_MODEL)
      })

      // Проверяем результат оценки в UI
      cy.get('#evaluationResult')
        .should('be.visible')
        .and('contain', 'Mocked Grade: 9/10. Fluent and accurate.')
    })
  })

  describe('Сценарий ошибки API', () => {
    it('При 500 от API приложение показывает ошибку пользователю (и не падает)', () => {
      /**
       * Требование: мокать API (для обеих моделей) ответом 500.
       * Самый простой способ — один intercept на все POST запросы к process-ai-request.
       */
      cy.intercept('POST', API_WILDCARD, (req) => {
        if (typeof req.url === 'string' && !req.url.includes('/process-ai-request')) {
          req.continue()
          return
        }

        // Отдаём 500 на любой model_name (и перевод, и оценку)
        req.alias = 'apiError'
        req.reply({
          statusCode: 500,
          body: { error: 'Internal Server Error' },
        })
      })

      cy.get('#original_text').clear().type(ORIGINAL_TEXT)
      cy.get('#target_lang').select(TARGET_LANG_LABEL_RU)

      cy.contains('button', 'Перевести').click()
      cy.wait('@apiError')

      /**
       * Проверяем, что UI показал ошибку.
       * Формат сообщения может отличаться, поэтому проверяем несколько маркеров.
       * (Если хотите — можно сделать проверку строго по #translationResult.)
       */
      cy.get('body').then(($body) => {
        const text = $body.text()
        const hasError =
          text.includes('Ошибка') ||
          text.includes('Error') ||
          text.includes('500') ||
          text.includes('Internal Server Error') ||
          text.includes('Ошибка API')

        expect(hasError).to.be.true
      })
    })
  })

  describe('Smoke UI', () => {
    it('Основные элементы формы видимы', () => {
      cy.get('#original_text').should('be.visible')
      cy.get('#target_lang').should('be.visible')
      cy.get('#translateBtn').should('be.visible').and('be.enabled')
      cy.get('#evaluateBtn').should('be.visible')

      // Опции селекта (в вашем шаблоне их 3)
      cy.get('#target_lang option').should('have.length', 3)
      cy.get('#target_lang').within(() => {
        cy.contains('option', 'Английский').should('exist')
        cy.contains('option', 'Французский').should('exist')
        cy.contains('option', 'Немецкий').should('exist')
      })
    })
  })
})
