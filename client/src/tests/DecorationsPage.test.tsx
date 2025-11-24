import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DecorationsPage from '../pages/DecorationsPage';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

const renderWithTheme = () =>
  render(
    <ThemeProvider theme={theme}>
      <DecorationsPage />
    </ThemeProvider>
  );

describe('DecorationsPage', () => {
  let fetchMock: jest.SpyInstance;
  let originalCreateObjectURL: any;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: 'Use warm lights and garlands' }),
      status: 200,
    } as Response);
    originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:preview');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
  });

  test('disables Magic button until a file is selected', () => {
    renderWithTheme();
    expect(screen.getByRole('button', { name: /Magic/i })).toBeDisabled();
  });

  test('uploads image and displays suggestions', async () => {
    const { container } = renderWithTheme();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image-bytes'], 'room.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Magic/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Use warm lights and garlands/i)).toBeInTheDocument();
  });
});
