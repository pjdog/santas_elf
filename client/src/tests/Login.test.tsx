import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../components/Login';

describe('Login Component', () => {
    test('renders login button with secure text', () => {
        render(<Login />);
        expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    });

    test('redirects to /auth/google on click', () => {
        // Mock window.location.href
        // Note: window.location is read-only in jsdom, so we might need a workaround
        // or just verify the implementation logic via spy if we refactor.
        // For strictly functional component test without refactor:
        
        // We can delete the property to mock it in Jest
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { href: '' };

        render(<Login />);
        fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

        expect(window.location.href).toBe('/auth/google');

        // Cleanup
        window.location = originalLocation;
    });
});
