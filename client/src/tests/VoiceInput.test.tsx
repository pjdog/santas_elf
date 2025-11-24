import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import VoiceInput from '../components/VoiceInput';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

class MockSpeechRecognition {
  public onstart: () => void = () => {};
  public onresult: (event: any) => void = () => {};
  public onend: () => void = () => {};
  public onerror: (event: any) => void = () => {};
  public continuous = false;
  public interimResults = false;
  public lang = 'en-US';
  start() {
    this.onstart();
    this.onresult({
      results: [
        [{ transcript: 'find gifts for dad' }],
      ],
    });
    this.onend();
  }
  stop() {
    this.onend();
  }
}

describe('VoiceInput', () => {
  let fetchMock: jest.SpyInstance;
  let originalSpeechRecognition: any;

  beforeEach(() => {
    originalSpeechRecognition = (window as any).SpeechRecognition;
    (window as any).SpeechRecognition = MockSpeechRecognition as any;
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Sure, opening gifts page', redirect: '/gifts', params: { recipient: 'dad' } }),
      status: 200,
    } as Response);
    mockNavigate.mockReset();
  });

  afterEach(() => {
    (window as any).SpeechRecognition = originalSpeechRecognition;
    jest.restoreAllMocks();
  });

  test('captures transcript and navigates on backend response', async () => {
    const onVoiceCommand = jest.fn();
    const onAiResponse = jest.fn();

    render(<VoiceInput onVoiceCommand={onVoiceCommand} onAiResponse={onAiResponse} />);

    fireEvent.click(screen.getByRole('button', { name: /voice-command/i }));

    await waitFor(() => expect(onVoiceCommand).toHaveBeenCalledWith('find gifts for dad'));
    await waitFor(() => expect(onAiResponse).toHaveBeenCalledWith('Sure, opening gifts page'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith('/gifts?recipient=dad');
  });
});
