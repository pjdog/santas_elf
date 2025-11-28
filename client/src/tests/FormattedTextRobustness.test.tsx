import React from 'react';
import { render, screen } from '@testing-library/react';
import FormattedText from '../components/FormattedText';

// Mock console.error to suppress expected warnings if any (though we expect none now)
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('FormattedText Robustness', () => {
    it('renders string input correctly', () => {
        render(<FormattedText text="Hello" />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('renders object input as stringified JSON (Fix for Error #31)', () => {
        const obj = { key: "value", nested: { data: 123 } };
        // @ts-ignore - forcing object type for test
        render(<FormattedText text={obj} />);
        
        // Expect the JSON string to be present
        expect(screen.getByText(/"key":/)).toBeInTheDocument();
        expect(screen.getByText(/"value"/)).toBeInTheDocument();
    });

    it('renders null/undefined as nothing', () => {
        // @ts-ignore
        const { container } = render(<FormattedText text={null} />);
        expect(container).toBeEmptyDOMElement();
    });
});
