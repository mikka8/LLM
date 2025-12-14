/**
 * Cypress E2E Test Suite для "AI Translator & Critic"
 * 
 * АРХИТЕКТУРА:
 * - Браузер делает fetch() запросы к LLM API напрямую (JavaScript)
 * - Cypress cy.intercept() перехватывает эти fetch() запросы
 * - В тестах используются моки вместо реального API
 */

describe('AI Translator & Critic - E2E Tests Suite', () => {
  const TRANSLATION_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct'
  const EVALUATION_MODEL = 'claude-sonnet-4-5-20250929'

  beforeEach(() => {
    cy.visit('/')
    cy.get('h3').contains('AI Translator & Critic').should('be.visible')
  })

  describe('Успешный сценарий: Перевод и Оценка', () => {
    it('Должен корректно обработать перевод текста с моком API (модель Qwen)', () => {
      // Перехватываем запросы к API с использованием wildcard pattern
      cy.intercept('POST', '**/process-ai-request', (req) => {
        console.log('📡 Перехвачен запрос к API, model:', req.body?.model_name)
        
        if (req.body && req.body.model_name === TRANSLATION_MODEL) {
          console.log('✓ Перехвачен запрос на ПЕРЕВОД')
          req.reply({
            statusCode: 200,
            body: { response: 'Mocked Translation: The sun is shining.' }
          })
          return
        }
        req.continue()
      }).as('translationRequest')

      // Заполняем форму
      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')

      // Нажимаем "Перевести"
      cy.contains('button', 'Перевести').click()

      // Ждём перехваченного запроса
      cy.wait('@translationRequest').then((interception) => {
        expect(interception.request.body.model_name).to.equal(TRANSLATION_MODEL)
        console.log('✓ Запрос успешно перехвачен')
      })

      // Проверяем результат
      cy.contains('Mocked Translation: The sun is shining.').should('be.visible')
    })

    it('Должен корректно обработать оценку качества перевода (модель Claude)', () => {
      cy.intercept('POST', '**/process-ai-request', (req) => {
        if (req.body && req.body.model_name === EVALUATION_MODEL) {
          console.log('✓ Перехвачен запрос на ОЦЕНКУ')
          req.reply({ statusCode: 200, body: { response: 'Mocked Grade: 9/10. Fluent and accurate.' } })
          return
        }
        if (req.body && req.body.model_name === TRANSLATION_MODEL) {
          req.reply({ statusCode: 200, body: { response: 'Mocked Translation: The sun is shining.' } })
          return
        }
        req.continue()
      }).as('evaluationRequest')

      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')
      cy.contains('button', 'Перевести').click()
      cy.wait('@evaluationRequest')

      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()
      cy.wait('@evaluationRequest')

      cy.contains('Mocked Grade: 9/10. Fluent and accurate.').should('be.visible')
    })

    it('Полный сценарий: Перевод → Оценка', () => {
      cy.intercept('POST', '**/process-ai-request', (req) => {
        if (req.body.model_name === TRANSLATION_MODEL) {
          req.reply({ statusCode: 200, body: { response: 'Mocked Translation: The sun is shining.' } })
          return
        }
        if (req.body.model_name === EVALUATION_MODEL) {
          req.reply({ statusCode: 200, body: { response: 'Mocked Grade: 9/10. Fluent and accurate.' } })
          return
        }
        req.continue()
      }).as('apiRequest')

      cy.get('#original_text').type('Солнце светит.')
      cy.get('#target_lang').select('English')

      cy.contains('button', 'Перевести').click()
      cy.wait('@apiRequest')
      cy.contains('Mocked Translation: The sun is shining.').should('be.visible')

      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()
      cy.wait('@apiRequest')
      cy.contains('Mocked Grade: 9/10. Fluent and accurate.').should('be.visible')

      cy.get('body').should('contain', 'Оригинал').and('contain', 'Перевод')
    })
  })

  describe('Сценарии обработки ошибок', () => {
    it('Должен обработать 500 ошибку от API при переводе', () => {
      cy.intercept('POST', '**/process-ai-request', { statusCode: 500, body: { error: 'Server Error' } }).as('apiError')

      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')
      cy.contains('button', 'Перевести').click()
      cy.wait('@apiError')

      cy.get('#translationResult').invoke('text').then((text) => {
        expect(text).to.include('Ошибка API 500')
      })
    })

    it('Должен обработать ошибку при оценке качества', () => {
      cy.intercept('POST', '**/process-ai-request', (req) => {
        if (req.body.model_name === TRANSLATION_MODEL) {
          req.reply({ statusCode: 200, body: { response: 'Mocked Translation: The sun is shining.' } })
          return
        }
        if (req.body.model_name === EVALUATION_MODEL) {
          req.reply({ statusCode: 502, body: { error: 'Bad Gateway' } })
          return
        }
        req.continue()
      }).as('mixedResponses')

      cy.get('#original_text').clear().type('Солнце светит.')
      cy.get('#target_lang').select('English')
      cy.contains('button', 'Перевести').click()
      cy.wait('@mixedResponses')

      cy.contains('Mocked Translation: The sun is shining.').should('be.visible')

      cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()
      cy.wait('@mixedResponses')

      cy.get('#evaluationResult').invoke('text').then((text) => {
        expect(text).to.include('Ошибка API 502')
      })
    })
  })

  describe('Проверки интерфейса и валидация', () => {
    it('Все элементы формы должны быть видимы и доступны', () => {
      cy.get('textarea#original_text').should('be.visible')
      cy.get('select#target_lang').should('be.visible')
      cy.contains('button', 'Перевести').should('be.visible').and('be.enabled')

      cy.get('#target_lang').within(() => {
        cy.get('option').should('have.length', 3)
      })
    })

    it('Должен сохранять введённый текст при смене языка', () => {
      const testText = 'Тестовый текст'
      cy.get('#original_text').type(testText)
      cy.get('#target_lang').select('French')
      cy.get('#original_text').should('have.value', testText)
    })
  })
})
