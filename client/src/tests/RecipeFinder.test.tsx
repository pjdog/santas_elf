import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeFinder from '../pages/RecipeFinder';
import { AssistantProvider } from '../context/AssistantContext';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

describe('RecipeFinder', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: '1',
                        name: 'Test Recipe',
                        description: 'A delicious test recipe.',
                        ingredients: [{ item: 'sugar', quantity: 100, unit: 'g' }],
                        instructions: ['Mix', 'Bake'],
                        prepTime: '5 min',
                        cookTime: '10 min',
                        servings: 4,
                        dietary: []
                    },
                ]),
            } as Response)
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });


  test('renders RecipeFinder component', () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <RecipeFinder />
        </ThemeProvider>
      </AssistantProvider>
    );
    expect(screen.getByText(/Recipe Finder/i)).toBeInTheDocument();
  });

  test('fetches recipes on initial render', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <RecipeFinder />
        </ThemeProvider>
      </AssistantProvider>
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    // Includes default search query
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/recipes?'));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('q=Christmas+dinner'));
  });

  test('fetches recipes when guest number changes', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <RecipeFinder />
        </ThemeProvider>
      </AssistantProvider>
    );
    fetchSpy.mockClear(); 

    // MUI TextField label
    const guestInput = screen.getByLabelText(/Guests/i);
    fireEvent.change(guestInput, { target: { value: '5' } });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('guests=5'));
  });

  test('fetches recipes when dietary restrictions change', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <RecipeFinder />
        </ThemeProvider>
      </AssistantProvider>
    );
    fetchSpy.mockClear();

    const dietaryInput = screen.getByLabelText(/Dietary/i);
    fireEvent.change(dietaryInput, { target: { value: 'vegetarian' } });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('dietary=vegetarian'));
  });

  test('displays fetched recipes', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <RecipeFinder />
        </ThemeProvider>
      </AssistantProvider>
    );
    await waitFor(() => {
        const recipes = screen.getAllByText(/Test Recipe/i);
        expect(recipes.length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/A delicious test recipe./i)).toBeInTheDocument();
    
    // Click card to view details
    fireEvent.click(screen.getAllByText(/Test Recipe/i)[0]);
    
    // Now check for ingredients (handle multiple occurrences)
    await waitFor(() => {
        const sugars = screen.getAllByText(/sugar/i);
        expect(sugars.length).toBeGreaterThan(0);
    });
  });

  test('displays error message on fetch failure', async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    );
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <RecipeFinder />
        </ThemeProvider>
      </AssistantProvider>
    );
    await waitFor(() => expect(screen.getByText(/Failed to fetch recipes./i)).toBeInTheDocument());
  });
});
