import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { UserProvider } from './context/UserContext';
import { AssistantProvider } from './context/AssistantContext';

let fetchMock: jest.SpyInstance;

beforeEach(() => {
  // Default to unauthenticated response for user check
  fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Not authenticated' }),
    } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('App Component', () => {
    test('renders the main application landing title', async () => {
      render(
        <AssistantProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </AssistantProvider>
      );
      
      // Wait for the loading spinner to disappear (implied by waiting for content)
      // or wait for the specific text to appear.
      await waitFor(() => {
          const titleElement = screen.getByText(/Santa's Elf/i);
          expect(titleElement).toBeInTheDocument();
      });
    });

    test('renders the login button when not authenticated', async () => {
        render(
            <AssistantProvider>
              <UserProvider>
                  <App />
              </UserProvider>
            </AssistantProvider>
        );
        
        await waitFor(() => {
            // Using getAllByRole because sometimes hidden/mobile views duplicate buttons, 
            // or just strictly find the visible one. 
            // For now, finding one is enough.
            const loginButtons = screen.getAllByRole('button', { name: /Continue with Google/i });
            expect(loginButtons[0]).toBeInTheDocument();
        });
    });
});
