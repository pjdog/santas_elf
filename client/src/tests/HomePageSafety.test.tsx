import { render, screen } from '@testing-library/react';
import HomePage from '../pages/HomePage';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { MemoryRouter } from 'react-router-dom';
import { ArtifactContext } from '../context/ArtifactContext';

// Mock context
const mockArtifactContext: any = {
    panelOpen: false,
    setPanelOpen: jest.fn(),
    scenario: 'default',
    setScenario: jest.fn(),
    refreshArtifacts: jest.fn(),
    updateArtifacts: jest.fn(),
    scenarios: [],
    artifacts: { features: [], todos: [], recipes: [], gifts: [], decorations: [], seating: [], budget: { limit: 0 }, agentNotes: [], preferences: { dietary: {}, gifts: {}, decorations: {} } }
};

describe('HomePage Rendering Safety', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    // Mock fetch to return an object message (the crash trigger)
    jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
        if (url.includes('/api/agent/history')) {
            return Promise.resolve({
                ok: true,
                json: async () => ([{
                    sender: 'ai',
                    type: 'text',
                    // THIS IS THE CRASH TRIGGER: An object instead of a string
                    text: { seating_chart: "some data", decor_themes: "themes" } 
                }]),
                status: 200,
            } as any);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not crash when message text is an object', async () => {
    render(
        <ArtifactContext.Provider value={mockArtifactContext}>
            <ThemeProvider theme={theme}>
                <MemoryRouter>
                    <HomePage />
                </MemoryRouter>
            </ThemeProvider>
        </ArtifactContext.Provider>
    );

    // If it crashes, this line won't be reached or the element won't be found
    // We expect it to stringify the object
    expect(await screen.findByText(/seating_chart/i)).toBeInTheDocument();
  });
});
