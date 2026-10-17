const test = require('node:test');
const assert = require('node:assert/strict');

// Replicate logic for isolated unit verification
function normalizeNumber(raw, defaultPrefix = '91') {
  let cleaned = String(raw).replace(/[^\d+]/g, '').trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('0')) cleaned = cleaned.replace(/^0+/, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 10) {
    cleaned = `${defaultPrefix}${cleaned}`;
  }
  return /^\d{10,15}$/.test(cleaned) ? cleaned : null;
}

test('Phone Normalizer Suite', async (t) => {
  await t.test('Normalizes raw 10-digit Indian number using default +91', () => {
    const res = normalizeNumber('8787222966', '91');
    assert.equal(res, '918787222966');
  });

  await t.test('Retains intact international numbers with country codes', () => {
    const res = normalizeNumber('+14155552671');
    assert.equal(res, '14155552671');
  });

  await t.test('Strips formatted hyphens and whitespaces correctly', () => {
    const res = normalizeNumber('08787-222 966', '91');
    assert.equal(res, '918787222966');
  });

  await t.test('Rejects short / malformed phone strings', () => {
    const res = normalizeNumber('12345');
    assert.equal(res, null);
  });
});