import os
import json
import logging
from typing import List

from flask import Flask, render_template, request
import requests
from dotenv import load_dotenv

# Загружаем переменные окружения из файла .env (если он есть).
load_dotenv()

# Настройка логирования для удобства отладки и QA-отчетов.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Константы API
# Переменные окружения
MENTORPIECE_API_KEY = os.getenv("MENTORPIECE_API_KEY")
    
# Позволяем переопределить endpoint через переменную окружения — это нужно
# для локального мок-сервера во время разработки и для гибкой конфигурации.
MENTORPIECE_ENDPOINT = os.getenv("MENTORPIECE_ENDPOINT", "https://api.mentorpiece.org/v1/process-ai-request")

# Явно указываем папку с шаблонами относительно текущего файла, чтобы запуск
# из корня репозитория или из другой директории всегда находил шаблоны.
BASE_DIR = os.path.dirname(__file__)
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(__name__, template_folder=TEMPLATES_DIR)


def call_llm(model_name: str, messages: List[str]) -> str:
    """
    Вспомогательная функция для вызова LLM через HTTP API.

    Функция делает HTTP POST к `MENTORPIECE_ENDPOINT`. Если в окружении задан
    `MENTORPIECE_API_KEY`, то в заголовки будет добавлен `Authorization`.
    Если ключ не задан, запрос всё равно отправится, но без заголовка авторизации.
    """
    logger.info("call_llm: model=%s, messages=%d lines", model_name, len(messages))
    # Логируем предупреждение, если ключ отсутствует, но не прерываем выполнение.
    if not MENTORPIECE_API_KEY:
        logger.warning("MENTORPIECE_API_KEY не задан — выполняем запрос без Authorization header")

    # ...основной режим работы с реальным API...
    prompt = "\n".join(messages)
    # Заголовки: Content-Type всегда нужен. Authorization добавляем только если есть ключ.
    headers = {"Content-Type": "application/json"}
    if MENTORPIECE_API_KEY:
        headers["Authorization"] = f"Bearer {MENTORPIECE_API_KEY}"
    payload = {
        "model_name": model_name,
        "prompt": prompt,
    }
    try:
        resp = requests.post(MENTORPIECE_ENDPOINT, headers=headers, json=payload, timeout=15)
    except requests.RequestException as e:
        logger.exception("Network error when calling LLM API: %s", e)
        return f"[Сетевая ошибка] {str(e)}"
    if resp.status_code >= 400:
        try:
            err = resp.json()
        except Exception:
            err = resp.text
        logger.error("LLM API returned error status %s: %s", resp.status_code, err)
        return f"[Ошибка API {resp.status_code}] {err}"
    try:
        data = resp.json()
    except ValueError:
        logger.exception("Invalid JSON received from LLM API")
        return "[Ошибка] Невалидный JSON в ответе от LLM"
    if isinstance(data, dict) and "response" in data:
        return data["response"]
    logger.error("Unexpected response format from LLM API: %s", data)
    return f"[Ошибка] Непредвиденный формат ответа: {json.dumps(data)}"


@app.route("/", methods=["GET"])
def index():
    """
    GET / : Рендерит форму для ввода текста, выбора языка и кнопок.

    Шаблон `templates/index.html` ожидает переменные: original, translation, evaluation.
    Если их нет, шаблон покажет пустые поля.
    """
    return render_template("index.html", original="", translation="", evaluation="")


@app.route("/", methods=["POST"])
def process():
    """
    POST / : Обрабатывает отправленную форму.

    Алгоритм:
    1. Получаем `original_text` и `target_lang` из формы.
    2. Вызываем `call_llm` моделью `Qwen/Qwen3-VL-30B-A3B-Instruct` для перевода.
    3. Вызываем `call_llm` моделью `claude-sonnet-4-5-20250929` для оценки перевода.
    4. Рендерим шаблон с оригиналом, переводом и оценкой.

    Замечание для QA: если внешний API недоступен, пользователь увидит понятные
    сообщения об ошибке в поле перевода/оценки — это облегчает отладку.
    """
    original_text = request.form.get("original_text", "").strip()
    target_lang = request.form.get("target_lang", "English")

    if not original_text:
        # Если текст пустой — возвращаем шаблон с подсказкой.
        error_msg = "Пожалуйста, введите текст для перевода."
        return render_template("index.html", original="", translation=error_msg, evaluation="")

    # --- Шаг 1: перевод ---
    # Формируем понятный промпт: указать требование перевести только текст без лишних комментариев
    translate_prompt = [
        f"Переведи следующий текст на {target_lang}.",
        "Требования: переведи точно сохраняя смысл, стиль и пунктуацию; не добавляй пояснений.",
        "Текст для перевода:",
        original_text,
    ]

    # Используем модель, которая указана в требованиях
    translation = call_llm("Qwen/Qwen3-VL-30B-A3B-Instruct", translate_prompt)

    # --- Шаг 2: оценка качества перевода ---
    # Формируем промпт для судьи-LLM. Попросим оценить по шкале 1..10 и аргументировать.
    judge_prompt = [
        "Оцени качество перевода от 1 до 10 и аргументируй.",
        "Критерии оценки: сохранение смысла, адекватность стиля, грамматика и естественность целевого языка.",
        "Оригинал:",
        original_text,
        "Перевод:",
        translation,
    ]

    evaluation = call_llm("claude-sonnet-4-5-20250929", judge_prompt)

    # Рендерим шаблон, передавая результаты для отображения в UI.
    return render_template("index.html", original=original_text, translation=translation, evaluation=evaluation)


if __name__ == "__main__":
    # Простой запуск приложения для локальной разработки.
    # В production используйте WSGI-сервер (gunicorn/uvicorn и т.п.).
    app.run(host="0.0.0.0", port=5000, debug=True)
