// Cypress end-to-end tests for AI Translator & Critic
// Файл содержит тесты, которые перехватывают (mock) сетевые запросы к внешнему API
// и проверяют ключевые пользовательские сценарии.

// NOTE: Комментарии внутри объясняют, как работает cy.intercept и асинхронные проверки.

describe('AI Translator & Critic - E2E', () => {
  const endpoint = 'https://api.mentorpiece.org/v1/process-ai-request'

  beforeEach(() => {
    // Открываем страницу перед каждым тестом
    cy.visit('/')
  })

  it('Successful translation and evaluation (mocks for both models)', () => {
    // Mock 1: Перехватываем запросы для модели перевода
    cy.intercept('POST', endpoint, (req) => {
      // req.body содержит JSON, который мы отправляем в POST
      if (req.body && req.body.model_name === 'Qwen/Qwen3-VL-30B-A3B-Instruct') {
        // Сразу возвращаем ответ 200 с телом
        req.reply({ statusCode: 200, body: { response: 'Mocked Translation: The sun is shining.' } })
        return
      }
      // Mock 2: Запрос оценки
      if (req.body && req.body.model_name === 'claude-sonnet-4-5-20250929') {
        req.reply({ statusCode: 200, body: { response: 'Mocked Grade: 9/10. Fluent and accurate.' } })
        return
      }
      // По умолчанию — пропускаем
      req.continue()
    }).as('mentorRequest')

    // Вводим текст в textarea
    cy.get('#original_text').clear().type('Солнце светит.')

    // Выбираем язык (select имеет id target_lang)
    cy.get('#target_lang').select('English')

    // Нажимаем кнопку Перевести
    cy.contains('button', 'Перевести').click()

    // Проверяем, что наш intercept был вызван как минимум один раз
    // Здесь мы ждём сетевой запрос, который перехвачен alias'ом
    cy.wait('@mentorRequest')

    // Ожидаем, что в блоке перевода появился мок-ответ
    // В шаблоне перевод выводится в блоке с текстом {{ translation }} — проверим его содержание
    cy.contains('Mocked Translation: The sun is shining.').should('be.visible')

    // Нажимаем кнопку оценки
    cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()

    // Ждём повторного сетевого запроса (оценка)
    cy.wait('@mentorRequest')

    // Проверяем появление вердикта
    cy.contains('Mocked Grade: 9/10. Fluent and accurate.').should('be.visible')
  })

  it('Handles API failures gracefully (500 responses)', () => {
    // Интерцепт, который возвращает 500 для всех запросов к endpoint
    cy.intercept('POST', endpoint, {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('mentorError')

    // Заполняем форму
    cy.get('#original_text').clear().type('Солнце светит.')
    cy.get('#target_lang').select('English')

    // Нажимаем Перевести
    cy.contains('button', 'Перевести').click()

    // Ждём интерцепт
    cy.wait('@mentorError')

    // Ожидаем, что приложение отобразит сообщение об ошибке,
    // а не упадёт. В нашем шаблоне ошибка может быть отображена как текст в блоке перевода.
    cy.get('div').contains('Ошибка').should('exist')

    // Также проверим вторую кнопку: Оценить
    cy.contains('button', 'Оценить при помощи LLM-as-a-Judge').click()
    cy.wait('@mentorError')
    cy.get('div').contains('Ошибка').should('exist')
  })
})

/*
  Пояснения (для начинающего QA):

  - cy.intercept(method, url, handler) позволяет перехватывать сетевые запросы, отправленные
    веб-приложением. В handler мы можем проанализировать тело запроса и вернуть желаемый ответ
    (mocking), либо вызвать req.continue() чтобы пропустить запрос дальше.

  - Мы используем alias (as('mentorRequest')) чтобы затем ждать конкретный перехваченный запрос
    с помощью cy.wait('@mentorRequest'). Это полезно для синхронизации асинхронного поведения.

  - cy.contains('text') ищет элемент на странице, содержащий указанный текст. Это удобно
    для проверки асинхронного контента, который появляется после сетевых запросов.
*/
