import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { RedirectToDocs } from '../App';

describe('RedirectToDocs Component', () => {
    const originalLocation = window.location;

    beforeAll(() => {
        // Delete the existing location object
        // @ts-ignore
        delete window.location;
        
        let href = 'http://localhost/';
        
        // Create a mock location object with a working href setter
        window.location = {
            ...originalLocation,
            origin: 'http://localhost',
            assign: jest.fn(),
            replace: jest.fn(),
        } as any;
        
        Object.defineProperty(window.location, 'href', {
            get: () => href,
            set: (v) => { href = v; },
            configurable: true
        });
    });

    afterAll(() => {
        window.location = originalLocation;
    });

    it('redirects to the backend docs URL on mount', async () => {
        render(<RedirectToDocs />);

        // Check if the href was updated, waiting for the useEffect to fire
        await waitFor(() => {
            expect(window.location.href).toBe('http://localhost:8080/api-docs');
        });
    });
});
