import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import SetupPage from '../pages/SetupPage';

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SetupPage', () => {
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
        fetchMock = jest
          .spyOn(global, 'fetch')
          .mockResolvedValue({
            ok: true,
            json: async () => ({ configured: false, clientId: null }),
          } as Response);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders initial welcome step', async () => {
        // Mock initial status check returning unconfigured
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ configured: false, clientId: null }),
        });

        renderWithRouter(<SetupPage />);

        await waitFor(() => expect(screen.getByText(/Welcome to Santa's Elf!/i)).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
    });

    test('navigates to config step and saves credentials', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ configured: false, clientId: null }),
        });

        renderWithRouter(<SetupPage />);
        await waitFor(() => expect(screen.getByText(/Welcome to Santa's Elf!/i)).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));

        // Should see inputs now
        await waitFor(() => expect(screen.getByLabelText(/Client ID/i)).toBeInTheDocument());
        
        const clientIdInput = screen.getByLabelText(/Client ID/i);
        const clientSecretInput = screen.getByLabelText(/Client Secret/i);

        fireEvent.change(clientIdInput, { target: { value: 'test-client-id' } });
        fireEvent.change(clientSecretInput, { target: { value: 'test-client-secret' } });

        // Mock save response
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Saved' }),
        });

        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        fireEvent.click(saveButton);

        // Should move to success step
        await waitFor(() => expect(screen.getByText(/Configuration saved!/i)).toBeInTheDocument());
        expect(screen.getByText(/Go to Login/i)).toBeInTheDocument();
    });

    test.skip('json paste auto-fills fields', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ configured: false, clientId: null }),
        });

        renderWithRouter(<SetupPage />);
        
        // Wait for "Get Started"
        await waitFor(() => expect(screen.getByText(/Welcome to Santa's Elf!/i)).toBeInTheDocument());
        
        // Click Get Started
        fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));

        // Wait for next step
        await waitFor(() => expect(screen.getByText(/Google OAuth Configuration/i)).toBeInTheDocument());

        // Open accordion
        const accordionSummary = await screen.findByText(/Have a JSON file/i);
        fireEvent.click(accordionSummary);

        // Wait for content to be visible (simpler check)
        const jsonInput = await screen.findByPlaceholderText(/Paste client_secret.json/i);
        
        const mockJson = JSON.stringify({
            web: {
                client_id: 'json-client-id',
                client_secret: 'json-client-secret'
            }
        });

        fireEvent.change(jsonInput, { target: { value: mockJson } });

        // Check if inputs updated
        expect(screen.getByLabelText(/Client ID/i)).toHaveValue('json-client-id');
        expect(screen.getByLabelText(/Client Secret/i)).toHaveValue('json-client-secret');
    });
});
