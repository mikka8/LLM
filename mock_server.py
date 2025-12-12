# mock_server.py
"""
Локальный мок-сервер для имитации работы API Mentorpiece.
Позволяет тестировать клиентское приложение без реального API-ключа.
"""
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/v1/process-ai-request", methods=["POST"])
def process():
    data = request.get_json(silent=True) or {}
    model = data.get("model_name", "mock-model")
    prompt = data.get("prompt", "")
    # Простая заглушка: возвращаем часть prompt и имя модели
    if "Оцени качество перевода" in prompt:
        response = "Оценка: 10/10. Перевод идеален. (MOCK)"
    elif "Переведи следующий текст" in prompt:
        response = f"[MOCK] Перевод на {model}: {prompt[-40:]}"
    else:
        response = f"[MOCK] Ответ на prompt: {prompt[:60]}..."
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(port=8000, debug=True)
