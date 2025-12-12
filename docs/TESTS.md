TESTS for AI Translator & Critic
================================

This document describes unit and UI tests added to the repository and how to run them.

1) Unit tests (pytest)
------------------------
Location: `tests/unit/test_app.py`

Overview:
- Tests mock `requests.post` to avoid calling real external API.
- Tests include: positive response, environment variable loading, network exception handling,
  and HTTP error handling.

Run:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pytest
pytest -q
```

Notes for QA:
- The tests insert `src` into `sys.path` so the application module `app` can be imported.
- `monkeypatch` fixture from pytest is used to set/unset `MENTORPIECE_API_KEY` before importing.

2) UI tests (Cypress)
-----------------------
Location: `cypress/e2e/translator_critic.cy.js`

Overview:
- Tests use `cy.intercept()` to mock all requests to `https://api.mentorpiece.org/v1/process-ai-request`.
- Two main tests:
  - Successful translation & evaluation: two mocks return 200 with desired JSON bodies.
  - API failure handling: mock returns 500 and tests assert app shows an error message.

Install and run (project root):
```bash
# Install Cypress (node + npm required)
npm init -y
npm install cypress --save-dev

# Open Cypress test runner
npx cypress open

# Or run headless
npx cypress run --spec "cypress/e2e/translator_critic.cy.js"
```

Notes for QA:
- Ensure the Flask app is running at the address Cypress visits (by default `http://localhost:5000`).
- If your dev server runs on a different port, adjust `baseUrl` in `cypress.config.js` or visit the correct URL.

3) Additional recommendations
-----------------------------
- Add `cypress.config.js` with `baseUrl` to simplify tests.
- Add `pytest` to `requirements-dev.txt` or `dev` dependencies for reproducible CI runs.
