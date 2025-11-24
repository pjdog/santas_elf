import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LLMSetup from '../pages/LLMSetup';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

const renderWithTheme = () =>
  render(
    <ThemeProvider theme={theme}>
      <LLMSetup />
    </ThemeProvider>
  );

describe('LLMSetup page', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('prefills settings from backend', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: 'openai',
        apiKey: 'saved-key',
        model: 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1',
      }),
    } as Response);

    renderWithTheme();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/config/llm'));
    const modelInput = screen.getByLabelText(/Model Name/i) as HTMLInputElement;
    const baseUrlInput = await screen.findByPlaceholderText(/https:\/\/api\.openai\.com\/v1/i) as HTMLInputElement;
    expect(modelInput.value).toBe('gpt-4o');
    expect(baseUrlInput.value).toBe('https://api.openai.com/v1');
  });

  test('tests connection and shows message', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ provider: 'gemini', apiKey: '', model: '', baseUrl: '' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'LLM is reachable' }),
      } as Response);

    renderWithTheme();

    const testButton = await screen.findByRole('button', { name: /Test Connection/i });
    fireEvent.click(testButton);

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/llm/test',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(await screen.findByText(/LLM is reachable/i)).toBeInTheDocument();
  });

  test('saves settings', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ provider: 'gemini', apiKey: '', model: '', baseUrl: '' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Saved!' }),
      } as Response);

    renderWithTheme();

    fireEvent.change(await screen.findByLabelText(/API Key/i), { target: { value: 'new-key' } });

    const saveButton = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/config/llm',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(await screen.findByText(/Saved!/i)).toBeInTheDocument();
  });
});
