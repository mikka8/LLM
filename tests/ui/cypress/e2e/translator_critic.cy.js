/**
 * Cypress E2E тесты для приложения "AI Translator & Critic"
 * 
 * АРХИТЕКТУРА v2.0 (для Cypress E2E тестирования):
 * - Браузер делает fetch() запросы к LLM API напрямую через JavaScript
 * - Cypress cy.intercept() перехватывает эти fetch() запросы
 * - Вместо реального API используются моки с предопределёнными ответами
 * 
 * Для запуска: 
 *   - npm run cypress:run:linux (headless режим с Electron)
 *   - npm run cypress:open (интерактивный режим)
 */

describe('AI Translator & Critic - E2E Tests Suite', () => {
  // ВАЖНО: Используем wildcard pattern в тестах, чтобы перехватить запросы
  // Не зависит от точного формата полного URL
  const API_ENDPOINT = 'https://api.mentorpiece.org/v1/process-ai-request'
  
  // Модели AI, которые используются в приложении
  const TRANSLATION_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct'
  const EVALUATION_MODEL = 'claude-sonnet-4-5-20250929'

  beforeEach(() => {
    /**
     * Перед каждым тестом:
     * 1. Открываем главную страницу приложения
     * 2. Проверяем, что страница загружена корректно
     */
    cy.visit('/')
    cy.get('h3').contains('AI Translator & Critic').should('be.visible')
  })

  describe('Успешный сценарий: Перевод и Оценка', () => {
    it('Должен корректно обработать перевод текста с моком API (модель Qwen)', () => {
      /**
       * MOCK STRATEGY:
       * Используем cy.intercept() для перехвата POST запроса к API.
       * Когда body.model_name совпадает с TRANSLATION_MODEL, возвращаем моковый ответ.
       * 
       * ВАЖНО: Используем wildcard pattern для URL, чтобы Cypress мог перехватить
       * запросы независимо от точного формата URL.
       */
      cy.intercept('POST', '**/process-ai-request', (req) => {
        console.log('📡 Перехвачен запрос к API')
        console.log('   model_name:', req.body?.model_name)
        console.log('   prompt:', req.body?.prompt?.substring(0, 50) + '...')
        
        // Анализируем тело запроса
        if (req.body && req.body.model_name === TRANSLATION_MODEL) {
          console.log('✓ Перехвачен запрос на ПЕРЕВОД для модели:', TRANSLATION_MODEL)
          // Возвращаем мок-ответ с кодом 200 и JSON телом
          req.reply({
            statusCode: 200,
            body: {
              response: 'Mocked Translation: The sun is shining.'
            }
          })
          return
        }
        // Для других запросов пропускаем дальше (не мокируем)
        req.continue()
      }).as('translationRequest')

      /**
       * STEP 1: Заполняем форму
       */
      cy.get('#original_text')
        .clear()
        .type('Солнце светит.')
        .should('have.value', 'Солнце светит.')

      // Выбираем целевой язык
      cy.get('#target_lang')
        .select('English')
        .should('have.value', 'English')

      /**
       * STEP 2: Нажимаем кнопку "Перевести"
       */
      cy.contains('button', 'Перевести')
        .should('be.enabled')
        .click()

      /**
       * STEP 3: Ждём перехваченный запрос
       * cy.wait('@translationRequest') синхронизирует тест с асинхронным запросом.
       */
      cy.wait('@translationRequest').then((interception) => {
        expect(interception.request.body.model_name).to.equal(TRANSLATION_MODEL)
        console.log('✓ Запрос на перевод успешно перехвачен и проверен')
      })

      /**
       * STEP 4: Проверяем результат на странице
       */
      cy.contains('Mocked Translation: The sun is shining.')
        .should('be.visible')
        .and('not.be.empty')
    })

    it('Должен корректно обработать оценку качества перевода (модель Claude)', () => {
      /**
       * Mock для запроса оценки (модель Claude)
       */
      cy.intercept('POST', '**/process-ai-request', (req) => {
        if (req.body && req.body.model_name === EVALUATION_MODEL) {
          console.log('✓ Перехвачен запрос на ОЦЕНКУ для модели:', EVALUATION_MODEL)
          req.reply({
            statusCode: 200,
            body: {
              response: 'Mocked Grade: 9/10. Fluent and accurate.'
            }
          })
          return
        }
        // Mock для перевода (чтобы первый запрос тоже сработал)
        if (req.body && req.body.model_name === TRANSLATION_MODEL) {
          console.log('✓ Перехвачен запрос на ПЕРЕВОД для модели:', TRANSLATION_MODEL)
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Translation: The sun is shining.' }
          })
          return
        }
        req.continue()
      }).as('evaluationRequest')

      /**
       * Заполняем форму и делаем перевод
       */
      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')
      cy.contains('button', 'Перевести').click()

      // Ждём перевода
      cy.wait('@evaluationRequest')

      /**
       * STEP: Нажимаем кнопку "Оценить при помощи LLM-as-a-Judge"
       */
      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge')
        .should('be.enabled')
        .click()

      /**
       * STEP: Ждём второго API запроса (оценка)
       */
      cy.wait('@evaluationRequest').then((interception) => {
        expect(interception.request.body.model_name).to.equal(EVALUATION_MODEL)
        console.log('✓ Запрос оценки успешно перехвачен')
      })

      /**
       * STEP: Проверяем, что оценка появилась на странице
       */
      cy.contains('Mocked Grade: 9/10. Fluent and accurate.')
        .should('be.visible')
        .and('not.be.empty')
    })

    it('Полный сценарий: Перевод → Оценка (обе модели в одном тесте)', () => {
      /**
       * Комплексный mock, который обрабатывает оба типа запросов
       */
      let translationCallCount = 0
      let evaluationCallCount = 0

      cy.intercept('POST', '**/process-ai-request', (req) => {
        if (req.body.model_name === TRANSLATION_MODEL) {
          translationCallCount++
          console.log(`✓ Запрос ПЕРЕВОДА #${translationCallCount}`)
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Translation: The sun is shining.' }
          })
          return
        }
        if (req.body.model_name === EVALUATION_MODEL) {
          evaluationCallCount++
          console.log(`✓ Запрос ОЦЕНКИ #${evaluationCallCount}`)
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Grade: 9/10. Fluent and accurate.' }
          })
          return
        }
        req.continue()
      }).as('apiRequest')

      /**
       * Выполняем полный пользовательский сценарий
       */
      // 1. Заполняем форму
      cy.get('#original_text').type('Солнце светит.')
      cy.get('#target_lang').select('English')

      // 2. Нажимаем "Перевести"
      cy.contains('button', 'Перевести').click()
      cy.wait('@apiRequest')

      // 3. Проверяем перевод
      cy.contains('Mocked Translation: The sun is shining.').should('be.visible')

      // 4. Нажимаем "Оценить"
      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()
      cy.wait('@apiRequest')

      // 5. Проверяем оценку
      cy.contains('Mocked Grade: 9/10. Fluent and accurate.').should('be.visible')

      // 6. Финальная проверка: оба результата на странице
      cy.get('body').should('contain', 'Оригинал')
      cy.get('body').should('contain', 'Перевод')
      cy.get('body').should('contain', 'Оценка качества')
    })
  })

  describe('Сценарии обработки ошибок', () => {
    it('Должен обработать 500 ошибку от API при переводе', () => {
      /**
       * Mock 500 Internal Server Error для всех API запросов
       */
      cy.intercept('POST', '**/process-ai-request', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('apiError')

      /**
       * Заполняем форму
       */
      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')

      /**
       * Нажимаем кнопку перевода
       */
      cy.contains('button', 'Перевести').click()

      /**
       * Ждём ошибку от API
       */
      cy.wait('@apiError')

      /**
       * Проверяем, что приложение обработало ошибку корректно
       */
      cy.get('body').then(($body) => {
        const hasError = $body.text().includes('Ошибка') || 
                        $body.text().includes('Error') ||
                        $body.text().includes('500')
        expect(hasError).to.be.true
      })

      console.log('✓ Ошибка при переводе обработана корректно')
    })
      // Проверяем, что ошибка либо в результатах, либо в странице
      cy.get('body').then(($body) => {
        // Если есть сообщение об ошибке, проверяем его наличие
        const hasError = $body.text().includes('Сетевая ошибка') || 
                        $body.text().includes('Ошибка API') ||
                        $body.text().includes('Internal Server Error')
        expect(hasError).to.be.true
      })

      console.log('✓ Приложение корректно обработало 500 ошибку')
    })

    it('Должен обработать ошибку при оценке качества', () => {
      /**
       * Mock успешного перевода, но ошибку при оценке
       */
      cy.intercept('POST', API_ENDPOINT, (req) => {
        if (req.body.model_name === TRANSLATION_MODEL) {
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Translation: The sun is shining.' }
          })
          return
        }
        if (req.body.model_name === EVALUATION_MODEL) {
          req.reply({
            statusCode: 500,
            body: { error: 'Evaluation service unavailable' }
          })
          return
        }
        req.continue()
      }).as('mixedResponses')

      // Делаем перевод (успешно)
      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')
      cy.contains('button', 'Перевести').click()
      cy.wait('@mixedResponses')

      // Проверяем, что перевод появился
      cy.contains('Mocked Translation: The sun is shining.').should('be.visible')

      // Пытаемся оценить (ошибка)
      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()
      cy.wait('@mixedResponses')

      // Проверяем обработку ошибки
      cy.get('body').then(($body) => {
        const hasError = $body.text().includes('Ошибка') || 
                        $body.text().includes('Error') ||
                        $body.text().includes('unavailable')
        expect(hasError).to.be.true
      })

      console.log('✓ Ошибка при оценке обработана корректно')
    })
  })

  describe('Проверки интерфейса и валидация', () => {
    it('Все элементы формы должны быть видимы и доступны', () => {
      // Проверяем наличие и видимость ключевых элементов
      cy.get('textarea#original_text').should('be.visible')
      cy.get('select#target_lang').should('be.visible')
      cy.contains('button', 'Перевести').should('be.visible').and('be.enabled')
      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').should('be.visible')

      // Проверяем, что select имеет правильные опции
      cy.get('#target_lang').within(() => {
        cy.get('option').should('have.length', 3)
        cy.get('option').contains('Английский').should('exist')
        cy.get('option').contains('Французский').should('exist')
        cy.get('option').contains('Немецкий').should('exist')
      })
    })

    it('Должен сохранять введённый текст при смене языка', () => {
      const testText = 'Тестовый текст'
      
      cy.get('#original_text').type(testText)
      cy.get('#target_lang').select('French')
      
      // Проверяем, что текст остался в поле
      cy.get('#original_text').should('have.value', testText)
    })
  })
})

/**
 * =================================
 * СПРАВОЧНИК ДЛЯ НАЧИНАЮЩЕГО QA
 * =================================
 * 
 * 1. cy.intercept(method, urlPattern, handler)
 *    - Перехватывает HTTP запросы, отправленные приложением
 *    - handler получает объект req с полями:
 *      * req.body — тело запроса (JSON)
 *      * req.headers — заголовки
 *      * req.reply(response) — вернуть мок-ответ
 *      * req.continue() — пропустить запрос дальше
 * 
 * 2. cy.wait('@alias')
 *    - Ожидает перехваченный запрос с указанным alias
 *    - Полезна для синхронизации с асинхронными операциями
 *    - Возвращает объект interception с информацией о запросе/ответе
 * 
 * 3. cy.contains('text')
 *    - Ищет элемент, содержащий указанный текст
 *    - Автоматически ждёт появления элемента (с timeout по умолчанию 4 сек)
 *    - Очень удобна для проверки асинхронного контента
 * 
 * 4. should('be.visible')
 *    - Проверяет, что элемент видим пользователю
 *    - Включает проверки: существует, не скрыт, не заблокирован
 * 
 * 5. Timeouts и асинхронность
 *    - Cypress автоматически ждёт элементы до 4 секунд
 *    - cy.wait() используется специально для сетевых запросов
 *    - Никогда не используйте cy.wait(1000) для деле задержек — плохая практика!
 * 
 * 6. Чтение логов
 *    - Все console.log() видны в консоли Cypress Open
 *    - При запуске в headless режиме выводятся в stdout
 */
