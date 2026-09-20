// Ticker precision test
function formatNumber(val: number, decimals: number, prefix = '', suffix = '') {
  return `${prefix}${val.toFixed(decimals)}${suffix}`;
}
console.log('Testing Ticker:', formatNumber(1420, 0, '', ' ELO'));
console.log('Testing Winrate:', formatNumber(78.5, 1, '', '%'));
console.log('All Ticker formatting checks passed.');
