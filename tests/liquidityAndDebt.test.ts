import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../pages/index';

// Adresse à tester
const testAddress = '0x7ca24D4443fF5298D9A1729622A116b712A58A56';

test('Vérifie les champs de liquidité fournies et dettes', async () => {
  render(<Home />);

  // Simuler l'entrée de l'adresse
  const addressInput = screen.getByLabelText(/adresse/i);
  fireEvent.change(addressInput, { target: { value: testAddress } });

  // Simuler la soumission du formulaire
  const submitButton = screen.getByRole('button', { name: /consulter/i });
  fireEvent.click(submitButton);

  // Vérifier les valeurs affichées
  const liquidityUSDC = await screen.findByText(/armmUSDC : 0.00 USDC/i);
  const liquidityWXDAI = await screen.findByText(/armmWXDAI : 0.00 WXDAI/i);
  const debtUSDC = await screen.findByText(/debtUSDC : 0.00 USDC/i);
  const debtWXDAI = await screen.findByText(/debtWXDAI : 0.00 WXDAI/i);

  expect(liquidityUSDC).toBeInTheDocument();
  expect(liquidityWXDAI).toBeInTheDocument();
  expect(debtUSDC).toBeInTheDocument();
  expect(debtWXDAI).toBeInTheDocument();
}); 