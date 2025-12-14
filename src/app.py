import os
import logging
from flask import Flask, render_template

# Настройка логирования для удобства отладки и QA-отчетов.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Явно указываем папку с шаблонами относительно текущего файла, чтобы запуск
# из корня репозитория или из другой директории всегда находил шаблоны.
BASE_DIR = os.path.dirname(__file__)
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(__name__, template_folder=TEMPLATES_DIR)


@app.route("/", methods=["GET", "POST"])
def index():
    """
    Главная страница приложения.
    
    ИЗМЕНЕНИЕ АРХИТЕКТУРЫ (v2.0):
    
    БЫЛО (v1.0): Сервер делал HTTP POST запросы к LLM API через Python requests
    - Pros: Безопасность (API ключ не видна в браузере), стандартный паттерн
    - Cons: Cypress не может перехватить запросы через cy.intercept()
    
    СТАЛО (v2.0): Браузер делает HTTP POST запросы к LLM API напрямую через fetch()
    - Pros: Cypress cy.intercept() может перехватить запросы для E2E тестирования
    - Cons: API ключ может быть видна в браузере (если использовать Authorization header)
    
    РЕШЕНИЕ: Используем браузер для API запросов + Cypress для перехвата.
    Для production можно добавить API Gateway/Proxy на сервере позже.
    
    Сервер просто отображает HTML шаблон. Весь код для перевода и оценки
    находится в JavaScript файле (index.html <script> блок).
    """
    return render_template("index.html")


if __name__ == "__main__":
    # Для локальной разработки и Cypress E2E тестов
    # В production используйте WSGI-сервер (gunicorn, waitress и т.п.)
    app.run(debug=True, host="0.0.0.0", port=5000)
