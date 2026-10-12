// tests/eventValidation.test.js
// Standalone unit tests for Event model validation rules.
// Uses async Document.prototype.validate() to avoid deprecation warnings.

const assert = require('assert');
const Event = require('../models/Event');

async function runTests() {
  console.log('🧪 Running Event Model Validation Tests...');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  // 1. Missing session_id
  await test('Should reject event missing session_id', async () => {
    const evt = new Event({
      event_type: 'page_view',
      page_url: 'http://localhost:5173/',
    });
    let err = null;
    try {
      await evt.validate();
    } catch (e) {
      err = e;
    }
    assert(err && err.errors && err.errors.session_id, 'Expected session_id validation error');
  });

  // 2. Unsupported event_type
  await test('Should reject unsupported event_type (e.g. scroll)', async () => {
    const evt = new Event({
      session_id: 'sess-123',
      event_type: 'scroll',
      page_url: 'http://localhost:5173/',
    });
    let err = null;
    try {
      await evt.validate();
    } catch (e) {
      err = e;
    }
    assert(err && err.errors && err.errors.event_type, 'Expected event_type enum validation error');
  });

  // 3. Valid page_view with omitted coordinates
  await test('Should allow valid page_view without x and y coordinates', async () => {
    const evt = new Event({
      session_id: 'sess-123',
      event_type: 'page_view',
      page_url: 'http://localhost:5173/',
    });
    await evt.validate();
    assert.strictEqual(evt.x, null);
    assert.strictEqual(evt.y, null);
    assert(evt.timestamp instanceof Date);
  });

  // 4. Click event missing coordinates
  await test('Should reject click event when x and y are null/omitted', async () => {
    const evt = new Event({
      session_id: 'sess-123',
      event_type: 'click',
      page_url: 'http://localhost:5173/',
    });
    let err = null;
    try {
      await evt.validate();
    } catch (e) {
      err = e;
    }
    assert(err, 'Expected validation error for missing coordinates in click event');
  });

  // 5. Click event with valid coordinates
  await test('Should accept click event with valid numeric x and y', async () => {
    const evt = new Event({
      session_id: 'sess-123',
      event_type: 'click',
      page_url: 'http://localhost:5173/',
      x: 350.5,
      y: 120,
    });
    await evt.validate();
    assert.strictEqual(evt.x, 350.5);
    assert.strictEqual(evt.y, 120);
  });

  console.log(`\n📊 Results: ${passed}/${total} tests passed.\n`);
  if (passed !== total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
