"""
Unit tests for `src/app.py` using pytest and unittest.mock.

Цель: протестировать логику взаимодействия с внешним API, не выполняя реальные
HTTP-запросы (всё мокается).

Стратегия:
- Используем `unittest.mock.patch` чтобы заменить `requests.post` на мок.
- Перед импортом модуля устанавливаем/убираем переменные окружения для тестов,
  потому что `src/app.py` читает `MENTORPIECE_API_KEY` при импорте.

Файловая структура тестов:
- tests/unit/test_app.py

Запуск тестов:
  pytest -q

Комментарии внутри тестов помогут начинающим QA-специалистам понять, что и зачем тестируется.
"""
import os
import sys
import importlib
from unittest.mock import patch, Mock

import pytest
import requests

# Добавляем путь к `src` чтобы импортировать приложение
TEST_SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../src"))
if TEST_SRC not in sys.path:
    sys.path.insert(0, TEST_SRC)


def reload_app_module(monkeypatch, env_value=None):
    """
    Вспомогательная функция: устанавливает/удаляет переменную окружения
    MENTORPIECE_API_KEY и импорт/перезагружает модуль `app`.

    Возвращает модуль `app`.
    """
    # Установим или удалим переменную окружения перед импортом
    if env_value is not None:
        monkeypatch.setenv("MENTORPIECE_API_KEY", env_value)
    else:
        monkeypatch.delenv("MENTORPIECE_API_KEY", raising=False)

    # Импортируем модуль. Если он уже был ранее импортирован - перезагрузим
    if "app" in sys.modules:
        return importlib.reload(sys.modules["app"])
    return importlib.import_module("app")


def make_mock_response(status=200, json_data=None):
    """Создаёт объект, похожий на `requests.Response` с необходимыми методами."""
    mock_resp = Mock()
    mock_resp.status_code = status
    mock_resp.json = Mock(return_value=json_data or {})
    mock_resp.text = str(json_data)
    return mock_resp


def test_positive_call_llm_returns_text(monkeypatch):
    """
    Positive Test: проверяем, что `call_llm` возвращает текст при ответе 200 OK.

    Мы мокаем `requests.post` так, чтобы API возвращал ожидаемый JSON:
    {"response": "..."}
    """
    app = reload_app_module(monkeypatch, env_value="DUMMY_KEY")

    # Подготавливаем фиктивный ответ для модели-переводчика
    mocked_json = {"response": "Mocked translation text"}
    mock_response = make_mock_response(status=200, json_data=mocked_json)

    # Мокаем requests.post и проверяем, что call_llm возвращает текст из response
    with patch("requests.post", return_value=mock_response) as mock_post:
        result = app.call_llm("Qwen/Qwen3-VL-30B-A3B-Instruct", ["Текст для перевода"])

        # Проверяем результат
        assert result == "Mocked translation text"

        # Убеждаемся, что requests.post был вызван именно с тем endpoint'ом
        mock_post.assert_called()
        args, kwargs = mock_post.call_args
        assert app.MENTORPIECE_ENDPOINT in args[0] or args[0] == app.MENTORPIECE_ENDPOINT


def test_environment_key_loading(monkeypatch):
    """
    Environment Test: проверяем, что модуль загружает `MENTORPIECE_API_KEY` из окружения.

    Подход: перезагрузим модуль с разными значениями переменной окружения и
    убедимся, что значение в модуле соответствует ожидаемому.
    """
    # Сценарий 1: ключ задан
    app = reload_app_module(monkeypatch, env_value="SOME_KEY")
    assert hasattr(app, "MENTORPIECE_API_KEY")
    assert app.MENTORPIECE_API_KEY == "SOME_KEY"

    # Сценарий 2: ключ не задан
    app2 = reload_app_module(monkeypatch, env_value=None)
    assert app2.MENTORPIECE_API_KEY is None


def test_error_handling_on_request_exception(monkeypatch):
    """
    Error Handling: если `requests.post` выбрасывает исключение (сетевое/аутентиф.),
    `call_llm` должна корректно обработать исключение и вернуть строку с пометкой об ошибке.

    Мы проверяем, что приложение не падает (исключение не пробрасывается наружу),
    а вместо этого возвращается строка, начинающаяся с `[Сетевая ошибка]`.
    """
    app = reload_app_module(monkeypatch, env_value="DUMMY_KEY")

    # Настраиваем mock так, чтобы requests.post бросал исключение
    def raise_request(*args, **kwargs):
        raise requests.RequestException("Connection failed")

    with patch("requests.post", side_effect=raise_request):
        result = app.call_llm("Qwen/Qwen3-VL-30B-A3B-Instruct", ["Текст"])
        assert result.startswith("[Сетевая ошибка]")


def test_handling_http_error_response(monkeypatch):
    """
    Error Handling: если API возвращает 4xx/5xx статус, `call_llm` должна вернуть
    информативную ошибку, содержащую код ответа и тело ошибки.
    """
    app = reload_app_module(monkeypatch, env_value="DUMMY_KEY")

    # Мокаем ответ с ошибкой 500
    mock_response = make_mock_response(status=500, json_data={"error": "Server error"})
    with patch("requests.post", return_value=mock_response):
        result = app.call_llm("claude-sonnet-4-5-20250929", ["Оцени качество перевода"])
        assert "Ошибка API" in result or "500" in result
