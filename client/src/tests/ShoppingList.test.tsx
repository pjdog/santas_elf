import { render, screen } from '@testing-library/react';
import ShoppingList from '../components/ShoppingList';

describe('ShoppingList', () => {
  test('renders ingredients and quick actions', () => {
    render(<ShoppingList ingredients={[{ item: 'Flour', quantity: 2, unit: 'cups' }, { item: 'Sugar', quantity: 0.5, unit: 'cup' }]} />);

    expect(screen.getByText(/Shopping List/i)).toBeInTheDocument();
    expect(screen.getByText(/2.00 cups Flour/i)).toBeInTheDocument();
    expect(screen.getByText(/0.50 cup Sugar/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Instacart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Amazon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Whole Foods/i })).toBeInTheDocument();
  });
});
