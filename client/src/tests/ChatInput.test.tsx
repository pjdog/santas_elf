import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../components/ChatInput';

describe('ChatInput', () => {
  test('send button disabled when empty and enables with text', () => {
    const onSendMessage = jest.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();

    const input = screen.getByPlaceholderText(/Ask Santa's Elf/i);
    fireEvent.change(input, { target: { value: 'Hi elf' } });
    expect(sendButton).not.toBeDisabled();
  });

  test('calls onSendMessage and clears input', () => {
    const onSendMessage = jest.fn();
    render(<ChatInput onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText(/Ask Santa's Elf/i);
    fireEvent.change(input, { target: { value: 'Cookies' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onSendMessage).toHaveBeenCalledWith('Cookies');
    expect((input as HTMLInputElement).value).toBe('');
  });
});
