import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../components/Login';

describe('Login Component', () => {
    // Save the original window.location
    const originalWindowLocation = window.location;

    // Create a mock location object
    let mockLocation: Location;
    let mockHref: string;

    beforeAll(() => {
        // Define mockHref with a default value
        mockHref = 'http://localhost/';

        mockLocation = {
            ...originalWindowLocation, // Spread existing properties if needed
            get href() { return mockHref; },
            set href(value: string) { mockHref = value; },
            assign: jest.fn((url: string) => { mockHref = url; }),
            // Add any other properties of window.location that might be used
        };

        // Replace window.location with our mock for all tests in this describe block
        Object.defineProperty(window, 'location', {
            configurable: true,
            enumerable: true,
            value: mockLocation,
        });
    });

    afterAll(() => {
        // Restore the original window.location after all tests in this describe block
        Object.defineProperty(window, 'location', {
            configurable: true,
            enumerable: true,
            value: originalWindowLocation,
        });
    });

    // Reset mockHref before each test to ensure a clean state
    beforeEach(() => {
        mockHref = 'http://localhost/';
        (mockLocation.assign as jest.Mock).mockClear(); // Clear assign mock calls
    });


    test('renders login button with secure text', () => {
        render(<Login />);
        expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    });

    test('redirects to /auth/google on click', () => {
        render(<Login />);
        fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

        // Assert that href was set or assign was called
        expect(mockHref).toBe('/auth/google');
        // If the component used window.location.assign, you would assert:
        // expect(mockLocation.assign).toHaveBeenCalledWith('/auth/google');
    });
});
