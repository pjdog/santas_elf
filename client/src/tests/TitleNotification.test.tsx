import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HomePage from '../pages/HomePage';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { MemoryRouter } from 'react-router-dom';
import { ArtifactContext } from '../context/ArtifactContext';

const mockArtifactContext: any = {
    panelOpen: false,
    setPanelOpen: jest.fn(),
    scenario: 'default',
    setScenario: jest.fn(),
    refreshArtifacts: jest.fn(),
    updateArtifacts: jest.fn(),
    scenarios: [],
    artifacts: { features: [], todos: [] },
};

describe('Title Notification', () => {
    beforeAll(() => {
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
            if (typeof url === 'string' && url.includes('/api/agent/history')) {
                return Promise.resolve({ ok: true, json: async () => [] } as any);
            }
            if (typeof url === 'string' && url.includes('/api/agent/chat')) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: async () => ({ message: 'Done', type: 'text' }),
                            status: 200
                        } as any);
                    }, 1000);
                });
            }
            // progress poller
            if (typeof url === 'string' && url.includes('/api/agent/progress')) {
                 return Promise.resolve({ ok: true, json: async () => ({ status: 'idle' }) } as any);
            }
            return Promise.resolve({ ok: true, json: async () => ({}) } as any);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test('updates title on loading state changes', async () => {
        render(
            <ArtifactContext.Provider value={mockArtifactContext}>
                <ThemeProvider theme={theme}>
                    <MemoryRouter>
                        <HomePage />
                    </MemoryRouter>
                </ThemeProvider>
            </ArtifactContext.Provider>
        );

        const input = screen.getByPlaceholderText(/Ask Santa's Elf/i);
        const sendBtn = screen.getByRole('button', { name: /send/i });

        fireEvent.change(input, { target: { value: 'Hello' } });
        
        // 1. Send message -> Loading starts
        await act(async () => {
            fireEvent.click(sendBtn);
        });

        // 2. Verify "Thinking" title
        // Note: The loading state update happens asynchronously.
        await waitFor(() => {
             expect(document.title).toBe("Thinking... 🧠");
        });

        // 3. Fast forward to finish the API call (1000ms delay)
        await act(async () => {
            jest.advanceTimersByTime(1100);
        });

        // 4. Verify "Response Ready" title
        await waitFor(() => {
             expect(document.title).toBe("🔴 Response Ready!");
        });

        // 5. Fast forward 4 seconds to trigger reset
        await act(async () => {
            jest.advanceTimersByTime(4000);
        });

        // 6. Verify reset
        expect(document.title).toBe("Santa's Elf");
    });
});
