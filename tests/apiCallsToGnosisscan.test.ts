import { fetchTokenBalances } from '../utils/api';

// Adresse à tester
const testAddress = '0x7ca24D4443fF5298D9A1729622A116b712A58A56';

test('Effectue un appel API vers Gnosisscan pour récupérer les soldes de tokens', async () => {
  const balances = await fetchTokenBalances(testAddress);

  expect(balances.armmUSDC).toBe('0');
  expect(balances.armmWXDAI).toBe('0');
  expect(balances.debtUSDC).toBe('0');
  expect(balances.debtWXDAI).toBe('0');
}); 