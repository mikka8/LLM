"""
Набор Unit-тестов для приложения AI Translator & Critic (app.py).

Используется pytest + unittest.mock для мокирования внешних вызовов к LLM API.
Цель: проверить логику приложения БЕЗ реальных запросов к API.

АРХИТЕКТУРНАЯ ЗАМЕТКА:
В текущей версии приложения (v2.0) API запросы делаются JavaScript'ом в браузере,
а НЕ сервером Flask. Функция call_llm() существует ТОЛЬКО для unit-тестирования.

Для тестирования пользовательских сценариев (E2E) используются Cypress тесты.
"""

import sys
import os
import importlib
from unittest.mock import Mock, patch
import requests


# Добавляем путь к src/ для импорта модуля app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))


def reload_app_module(monkeypatch, env_value):
    """
    Вспомогательная функция для перезагрузки модуля app с новыми переменными окружения.
    
    Почему это нужно:
    - app.py загружает переменные окружения при импорте (через load_dotenv())
    - Чтобы протестировать разные значения MENTORPIECE_API_KEY, нужно перезагрузить модуль
    
    Args:
        monkeypatch: pytest fixture для изменения переменных окружения
        env_value (str or None): значение для MENTORPIECE_API_KEY
        
    Returns:
        module: перезагруженный модуль app
    """
    # Удаляем модуль из sys.modules, чтобы он загрузился заново
    if 'app' in sys.modules:
        del sys.modules['app']
    
    # Устанавливаем переменную окружения
    if env_value is not None:
        monkeypatch.setenv('MENTORPIECE_API_KEY', env_value)
    else:
        monkeypatch.delenv('MENTORPIECE_API_KEY', raising=False)
    
    # Импортируем модуль заново
    import app
    importlib.reload(app)
    return app


def make_mock_response(status, json_data=None):
    """
    Создаём mock объект, имитирующий requests.Response.
    
    Args:
        status (int): HTTP статус код (200, 500, и т.д.)
        json_data (dict): Данные для ответа в формате JSON
        
    Returns:
        Mock: Мок объект с методом .json() и атрибутами .status_code, .ok
    """
    mock_resp = Mock()
    mock_resp.status_code = status
    mock_resp.ok = (200 <= status < 300)
    
    # Настраиваем headers
    if json_data is not None:
        mock_resp.headers.get.return_value = 'application/json'
        mock_resp.json.return_value = json_data
    else:
        mock_resp.headers.get.return_value = None
        mock_resp.json.side_effect = ValueError("No JSON object could be decoded")
    
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
        assert "Mocked translation text" in result
        
        # Проверяем, что был вызван requests.post с правильными аргументами
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        assert call_kwargs['json']['model_name'] == "Qwen/Qwen3-VL-30B-A3B-Instruct"


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
        
        # Проверяем, что функция вернула строку с ошибкой, а не выбросила исключение
        assert isinstance(result, str)
        assert "Сетевая ошибка" in result or "Connection failed" in result


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
        
        # Проверяем, что результат содержит информацию об ошибке
        assert "Ошибка API" in result or "500" in result
