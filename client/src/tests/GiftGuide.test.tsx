import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GiftGuide from '../pages/GiftGuide';
import { AssistantProvider } from '../context/AssistantContext';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

describe('GiftGuide', () => {
    let fetchSpy: jest.SpyInstance;
    beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    {
                        id: '1',
                        name: 'Test Gift',
                        description: 'A fantastic test gift.',
                        recipient: ['mom'],
                        interests: ['reading'],
                        budget: { min: 20, max: 50 },
                        link: 'https://example.com/test-gift',
                    },
                ]),
            } as Response)
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

  test('renders GiftGuide component', () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <GiftGuide />
        </ThemeProvider>
      </AssistantProvider>
    );
    expect(screen.getByText(/Gift Guide/i)).toBeInTheDocument();
  });

  test('fetches gifts on initial render', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <GiftGuide />
        </ThemeProvider>
      </AssistantProvider>
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/gifts?'));
  });

  test('fetches gifts when recipient changes', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <GiftGuide />
        </ThemeProvider>
      </AssistantProvider>
    );
    fetchSpy.mockClear();

    const recipientInput = screen.getByLabelText(/Recipient/i);
    fireEvent.change(recipientInput, { target: { value: 'dad' } });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('recipient=dad'));
  });

  test('fetches gifts when budget changes', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <GiftGuide />
        </ThemeProvider>
      </AssistantProvider>
    );
    fetchSpy.mockClear();

    const minBudgetInput = screen.getByLabelText(/Min \$/i);
    fireEvent.change(minBudgetInput, { target: { value: '25' } });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('budgetMin=25'));
  });

  test('displays fetched gifts', async () => {
    render(
      <AssistantProvider>
        <ThemeProvider theme={theme}>
          <GiftGuide />
        </ThemeProvider>
      </AssistantProvider>
    );
    await waitFor(() => {
        const gifts = screen.getAllByText(/Test Gift/i);
        expect(gifts.length).toBeGreaterThan(0);
        expect(gifts[0]).toBeInTheDocument();
    });
    expect(screen.getByText(/A fantastic test gift./i)).toBeInTheDocument();
    const momElements = screen.getAllByText(/mom/i);
    expect(momElements.length).toBeGreaterThan(0); // Checking for recipient
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
          <GiftGuide />
        </ThemeProvider>
      </AssistantProvider>
    );
    await waitFor(() => expect(screen.getByText(/Failed to fetch gifts./i)).toBeInTheDocument());
  });
});
