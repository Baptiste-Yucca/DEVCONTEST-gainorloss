import { render, screen } from '@testing-library/react';
import Home from '../pages/index';

// Adresse à tester
const testAddress = '0x7ca24D4443fF5298D9A1729622A116b712A58A56';

test('Vérifie les derniers points des courbes', async () => {
  render(<Home />);

  // Simuler l'entrée de l'adresse
  const addressInput = screen.getByLabelText(/adresse/i);
  fireEvent.change(addressInput, { target: { value: testAddress } });

  // Simuler la soumission du formulaire
  const submitButton = screen.getByRole('button', { name: /consulter/i });
  fireEvent.click(submitButton);

  // Vérifier les derniers points des courbes
  const lastPointUSDC = await screen.findByText(/Liquidités USDC/i);
  const lastPointWXDAI = await screen.findByText(/Liquidités WXDAI/i);

  expect(lastPointUSDC).toBeInTheDocument();
  expect(lastPointWXDAI).toBeInTheDocument();
}); 