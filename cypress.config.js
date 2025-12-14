const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Базовый URL приложения
    baseUrl: 'http://localhost:5000',
    
    // КРИТИЧЕСКИ ВАЖНО: Новый путь к тестам
    specPattern: 'tests/ui/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Путь к support файлам
    supportFile: 'tests/ui/cypress/support/e2e.js',
    
    // Отключаем fixtures (у вас их нет)
    fixturesFolder: false,
    
    // Путь для скриншотов
    screenshotsFolder: 'tests/ui/cypress/screenshots',
    
    // Путь для видео
    videosFolder: 'tests/ui/cypress/videos',
    
    // Таймауты (важно для API запросов)
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    // Размер окна браузера
    viewportWidth: 1280,
    viewportHeight: 720,
    
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})
