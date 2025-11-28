import React from 'react';
import { render, screen } from '@testing-library/react';
import FormattedText from '../components/FormattedText';

describe('FormattedText', () => {
    it('renders plain text correctly', () => {
        render(<FormattedText text="Hello World" />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders bold text correctly', () => {
        render(<FormattedText text="Hello **World**" />);
        // "World" should be in a strong tag
        const boldElement = screen.getByText('World');
        expect(boldElement.tagName).toBe('STRONG');
    });

    it('renders multiple lines', () => {
        const text = "Line 1\nLine 2";
        render(<FormattedText text={text} />);
        expect(screen.getByText('Line 1')).toBeInTheDocument();
        expect(screen.getByText('Line 2')).toBeInTheDocument();
    });

    it('handles complex bolding within lines', () => {
        render(<FormattedText text="This is **bold** and this is **also bold**." />);
        expect(screen.getByText('bold')).toBeInTheDocument();
        expect(screen.getByText('also bold')).toBeInTheDocument();
        expect(screen.getByText('This is')).toBeInTheDocument();
    });

    it('handles empty input gracefully', () => {
        const { container } = render(<FormattedText text="" />);
        expect(container).toBeEmptyDOMElement();
    });
});
