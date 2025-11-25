import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '../pages/HomePage';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { MemoryRouter } from 'react-router-dom';
import { AssistantProvider } from '../context/AssistantContext';

const renderWithProviders = () =>
  render(
    <AssistantProvider>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>
    </AssistantProvider>
  );

describe('HomePage', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/artifacts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ todos: [], recipes: [], gifts: [] }),
          status: 200,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/agent/history')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
          status: 200,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: 'Here is a recipe', type: 'text', data: null }),
        status: 200,
      } as Response);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('shows initial elf greeting', async () => {
    renderWithProviders();
    expect(await screen.findByText(/Ho ho ho!/i)).toBeInTheDocument();
  });

  test('sends chat prompt and renders response', async () => {
    renderWithProviders();

    const input = screen.getByPlaceholderText(/Ask Santa's Elf/i);
    fireEvent.change(input, { target: { value: 'Need dinner ideas' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const chatCall = fetchMock.mock.calls.find(([url]) => typeof url === 'string' && url.startsWith('/api/agent/chat'))!;
    const [, options] = chatCall;
    expect((options as RequestInit).method).toBe('POST');
    expect((options as RequestInit).body).toContain('Need dinner ideas');

    await waitFor(() => expect(screen.getByText(/Here is a recipe/i)).toBeInTheDocument());
  });
});
