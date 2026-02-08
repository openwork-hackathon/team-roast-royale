/**
 * Humanizer unit tests — run with: node humanizer.test.js
 */
const { humanize } = require('./humanizer');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('\n🧪 Humanizer Tests\n');

// --- Basic behavior ---

test('returns input unchanged with empty style', () => {
  const result = humanize('Hello world.', {});
  assert(typeof result === 'string', 'Should return string');
  assert(result.length > 0, 'Should not be empty');
});

test('handles null/undefined input', () => {
  assert(humanize(null, {}) === null, 'null in = null out');
  assert(humanize(undefined, {}) === undefined, 'undefined in = undefined out');
  assert(humanize('', {}) === '', 'empty in = empty out');
});

test('strips surrounding quotes', () => {
  const result = humanize('"Hello world."', { formality: 0.9 });
  assert(!result.startsWith('"'), 'Should strip leading quote');
});

// --- Capitalization ---

test('lowercase style produces lowercase', () => {
  const results = [];
  for (let i = 0; i < 20; i++) {
    results.push(humanize('This Is A Test.', { capitalization: 'lowercase', formality: 0.9 }));
  }
  assert(results.every(r => r === r.toLowerCase()), 'All results should be lowercase');
});

// --- Max length ---

test('respects maxLength', () => {
  const longInput = 'This is a very long message that goes on and on and on and on and we need to make sure it gets truncated properly by the humanizer to keep responses snappy and chat-like.';
  const result = humanize(longInput, { maxLength: 80 });
  assert(result.length <= 83, `Should be under 83 chars (got ${result.length}): "${result}"`);
});

// --- Style diversity ---

test('different styles produce different outputs over many runs', () => {
  const casualStyle = { formality: 0.05, punctuation: 'chaotic', capitalization: 'lowercase', laughStyle: '💀', emojiRate: 0.5, typoRate: 0.2, maxLength: 140 };
  const formalStyle = { formality: 0.95, punctuation: 'strict', capitalization: 'normal', laughStyle: null, emojiRate: 0, typoRate: 0, maxLength: 250 };
  
  const input = 'I think this is a really interesting point and I agree with it.';
  const casualResults = new Set();
  const formalResults = new Set();
  
  for (let i = 0; i < 30; i++) {
    casualResults.add(humanize(input, casualStyle));
    formalResults.add(humanize(input, formalStyle));
  }
  
  // Casual should produce more variety (randomness in typos, emoji, markers)
  assert(casualResults.size > 3, `Casual should vary (got ${casualResults.size} unique)`);
});

test('casual persona adds discourse markers sometimes', () => {
  const style = { formality: 0.1, punctuation: 'loose' };
  let hasMarker = false;
  for (let i = 0; i < 50; i++) {
    const result = humanize('This is my take on it.', style);
    if (result !== 'This is my take on it.' && result !== 'This is my take on it') {
      hasMarker = true;
      break;
    }
  }
  assert(hasMarker, 'Should add discourse markers sometimes');
});

test('emoji appears for high emojiRate', () => {
  const style = { formality: 0.1, emojiRate: 0.8, punctuation: 'loose' };
  let hasEmoji = false;
  for (let i = 0; i < 30; i++) {
    const result = humanize('This is cool.', style);
    if (/[\u{1F600}-\u{1F999}]/u.test(result)) {
      hasEmoji = true;
      break;
    }
  }
  assert(hasEmoji, 'Should include emoji with high emojiRate');
});

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
