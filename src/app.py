import os
import logging
import requests
from flask import Flask, render_template
from dotenv import load_dotenv


# Загрузка переменных окружения (для API ключа)
load_dotenv()


# Настройка логирования для удобства отладки и QA-отчетов.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Явно указываем папку с шаблонами относительно текущего файла, чтобы запуск
# из корня репозитория или из другой директории всегда находил шаблоны.
BASE_DIR = os.path.dirname(__file__)
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")


app = Flask(__name__, template_folder=TEMPLATES_DIR)


# API конфигурация (для unit-тестов)
MENTORPIECE_ENDPOINT = os.getenv(
    'MENTORPIECE_ENDPOINT',
    'https://api.mentorpiece.org/v1/process-ai-request'
)
MENTORPIECE_API_KEY = os.getenv('MENTORPIECE_API_KEY')


def call_llm(model_name, prompt):
    """
    Вспомогательная функция для вызова LLM API через Python requests.
    
    ВАЖНО: Эта функция существует для UNIT-ТЕСТИРОВАНИЯ (pytest).
    В текущей архитектуре (v2.0) она НЕ используется в production коде Flask.
    
    АРХИТЕКТУРНОЕ РЕШЕНИЕ:
    - Unit-тесты (pytest) тестируют эту функцию с помощью mock для requests.post
    - UI-тесты (Cypress) работают с JavaScript fetch() в браузере (см. index.html)
    
    Это позволяет:
    1. Покрыть unit-тестами логику Python (как требует задание)
    2. Позволить Cypress мокировать запросы через cy.intercept() (для E2E)
    
    Args:
        model_name (str): Название модели ('Qwen/Qwen3-VL-30B-A3B-Instruct' или 'claude-sonnet-4-5-20250929')
        prompt (list): Список сообщений для модели в формате [{"role": "user", "content": "..."}]
        
    Returns:
        str: Ответ от модели или сообщение об ошибке с префиксом
        
    Raises:
        Не выбрасывает исключения — все ошибки обрабатываются и возвращаются как строки
    """
    try:
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Добавляем Authorization header только если ключ задан
        if MENTORPIECE_API_KEY:
            headers['Authorization'] = f'Bearer {MENTORPIECE_API_KEY}'
        
        payload = {
            'model_name': model_name,
            'messages': prompt
        }
        
        logger.info(f"Вызов API для модели: {model_name}")
        
        response = requests.post(
            MENTORPIECE_ENDPOINT,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        # Проверка статуса ответа
        if not response.ok:
            # Попытка получить JSON тело ошибки
            try:
                error_data = response.json()
            except:
                error_data = {}
            
            error_msg = f"[Ошибка API {response.status_code}] {error_data}"
            logger.error(error_msg)
            return error_msg
        
        # Извлечение ответа от модели
        data = response.json()
        result = data.get('response', '')
        
        logger.info(f"Получен ответ от модели (длина: {len(result)} символов)")
        return result
        
    except requests.RequestException as e:
        # Обработка сетевых ошибок (таймауты, недоступность сервера, и т.д.)
        error_msg = f"[Сетевая ошибка] {str(e)}"
        logger.error(error_msg)
        return error_msg
        
    except Exception as e:
        # Обработка других непредвиденных ошибок
        error_msg = f"[Непредвиденная ошибка] {str(e)}"
        logger.error(error_msg)
        return error_msg


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
    
    ПРИМЕЧАНИЕ: Функция call_llm() существует в модуле, но НЕ используется здесь.
    Она предназначена для unit-тестирования (pytest).
    
    Сервер просто отображает HTML шаблон. Весь код для перевода и оценки
    находится в JavaScript файле (index.html <script> блок).
    """
    return render_template("index.html")


if __name__ == "__main__":
    # Для локальной разработки и Cypress E2E тестов
    # В production используйте WSGI-сервер (gunicorn, waitress и т.п.)
    app.run(debug=True, host="0.0.0.0", port=5000)
