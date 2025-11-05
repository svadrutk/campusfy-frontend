// Test the term calculation after fixing hardcoded values
function getCurrentTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const base = 1240 + ((year - 2024) * 10);

  if (month >= 11) {
    return base + 14;
  } else if (month >= 4) {
    return base + 12;
  } else if (month >= 3) {
    return base + 6;
  } else {
    return base + 4;
  }
}

const currentTerm = getCurrentTerm();
console.log('Current term code:', currentTerm);

// According to the table provided:
// Spring 2026 should be 1264
console.log('Expected Spring 2026: 1264');
console.log('Match:', currentTerm === 1264 ? '✅ CORRECT' : '❌ INCORRECT');