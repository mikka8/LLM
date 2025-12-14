/**
 * Cypress Configuration File
 * 
 * Документация: https://docs.cypress.io/guides/references/configuration
 */

const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Only run tests.cy.js (exclude translator_critic.cy.js)
    specPattern: 'cypress/e2e/tests.cy.js',
    
    // Base URL приложения (используется для cy.visit('/'))
    // Для локальной разработки: http://localhost:5000
    // Для Codespaces: будет автоматически перенаправлен
    baseUrl: 'http://localhost:5000',

    // Timeout для ожидания элементов (в миллисекундах)
    defaultCommandTimeout: 4000,
    
    // Timeout для ожидания сетевых запросов и ответов
    requestTimeout: 5000,
    
    // Timeout для ожидания загрузки страницы
    pageLoadTimeout: 30000,

    // Количество попыток перезапуска при падении теста (в CI)
    retries: {
      runMode: 1,
      openMode: 0
    },

    // Видеозапись тестов при запуске в headless режиме
    video: true,

    // Скриншоты при ошибках
    screenshotOnRunFailure: true,

    // Установка окна браузера при запуске
    viewportWidth: 1280,
    viewportHeight: 720,

    setupNodeEvents(on, config) {
      // Здесь можно добавить плагины и хуки (events)
      // Пример: обработчик для скиппинга тестов
      // on('task', {
      //   log: (message) => {
      //     console.log(message)
      //     return null
      //   }
      // })
    }
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack'
    }
  }
})
