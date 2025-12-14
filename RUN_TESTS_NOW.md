# 🎯 Final Setup - Ready to Run Tests

## Quick Start (Copy & Paste)

### Terminal 1: Start Flask Server
```bash
cd /workspaces/LLM
python src/app.py
```

Expected output:
```
 * Serving Flask app 'app'
 * Running on http://0.0.0.0:5000
 * Press CTRL+C to quit
```

### Terminal 2: Run Cypress Tests
```bash
cd /workspaces/LLM
npm run cypress:run:linux
```

## What Changed

### Architecture v2.0
- **Browser** makes fetch() requests to LLM API
- **Cypress** intercepts these fetch() calls with cy.intercept()
- **Tests** use mocked responses (no real API calls needed)
- **Results** appear dynamically in the DOM

### Files Updated
1. `src/app.py` - Simplified (just serves HTML)
2. `src/templates/index.html` - Added JavaScript API handlers
3. `cypress/e2e/tests.cy.js` - New test suite with cy.intercept()
4. `cypress.config.js` - Added specPattern configuration

## Expected Results

### ✅ Tests That PASS
1. Translation with mocked Qwen API
2. Evaluation with mocked Claude API  
3. Full workflow (translation + evaluation)
4. All form elements visible
5. Text persistence on language change

### ⚠️ Error Handling Tests (Recently Fixed)
6. 500 error handling - Now checks #translationResult div
7. 502 error handling - Now checks #evaluationResult div

## Test Execution Flow

```
1. Flask starts on http://localhost:5000
   ↓
2. Cypress opens Electron browser
   ↓
3. For each test:
   - Set up cy.intercept() mock
   - Fill form
   - Click button
   - Wait for mocked API response
   - Verify result appears in DOM
   ↓
4. All 7 tests complete in ~60 seconds
```

## Troubleshooting

### ❌ Problem: "cy.wait() timed out"
**Solution:** Make sure Flask is running on http://localhost:5000
```bash
curl http://localhost:5000  # Should return HTML
```

### ❌ Problem: "Cannot find element #translationResult"
**Solution:** HTML template might have been modified. Check:
```bash
grep -n "translationResult" src/templates/index.html
```

### ❌ Problem: Tests still failing on error handling
**Solution:** Verify JavaScript error message format:
```bash
# In browser console, check:
console.log('[Ошибка API 500] ...should appear')
```

## Key Code Snippets

### How cy.intercept() works
```javascript
cy.intercept('POST', '**/process-ai-request', (req) => {
  if (req.body.model_name === TRANSLATION_MODEL) {
    req.reply({
      statusCode: 200,
      body: { response: 'Mocked Translation: ...' }
    })
  }
}).as('translationRequest')
```

### How errors are displayed
```javascript
async function callLLM(modelName, prompt) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_name: modelName, prompt })
  })
  
  if (!response.ok) {
    // Returns error message like: [Ошибка API 500] ...
    const errorData = await response.json().catch(() => ({}))
    return `[Ошибка API ${response.status}] ${JSON.stringify(errorData)}`
  }
  
  const data = await response.json()
  return data.response
}
```

### How tests check for errors
```javascript
// Check specific result div for error message
cy.get('#translationResult').should(($div) => {
  const text = $div.text()
  expect(text).to.include.oneOf(['Ошибка', 'Error', '500'])
})
```

## Success Checklist

- [ ] Flask runs without errors
- [ ] Can access http://localhost:5000 in browser
- [ ] npm run cypress:run:linux starts successfully
- [ ] Tests start running in Electron browser
- [ ] At least 5 tests pass (the 2 error handling tests should also pass with latest fixes)
- [ ] All tests complete in ~60 seconds
- [ ] Video saved to cypress/videos/tests.cy.js.mp4

## Important Files

| File | Purpose |
|------|---------|
| `src/app.py` | Flask application (stateless HTML server) |
| `src/templates/index.html` | HTML with JavaScript API handlers |
| `cypress/e2e/tests.cy.js` | Main test suite (7 tests) |
| `cypress.config.js` | Cypress configuration |
| `cypress/support/e2e.js` | Cypress support file |
| `package.json` | npm dependencies and scripts |

## Running Everything at Once

```bash
# Automated script that:
# 1. Starts Flask in background
# 2. Waits for initialization
# 3. Runs Cypress tests
# 4. Stops Flask automatically

bash RUN_TESTS.sh
```

## Next Steps

1. **Start Flask** in Terminal 1
2. **Run Cypress** in Terminal 2
3. **Verify results** - All 7 tests should pass
4. **Review video** - Check cypress/videos/tests.cy.js.mp4
5. **Read logs** - See console output from cy.intercept()

## Support

- **Cypress Docs:** https://docs.cypress.io
- **API Mocking:** https://docs.cypress.io/guides/guides/network-requests
- **Troubleshooting:** https://docs.cypress.io/guides/guides/debugging

---

**Ready?** Run the commands in "Quick Start" section above!
**Time needed:** ~2 minutes total (Flask startup + test execution)
**Success rate:** ✅ 7/7 tests passing expected
