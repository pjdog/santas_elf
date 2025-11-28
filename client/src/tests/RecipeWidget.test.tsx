import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipeWidget from '../components/RecipeWidget';
import { ArtifactContext } from '../context/ArtifactContext';

describe('RecipeWidget', () => {
    const mockContext: any = {
        addRecipe: jest.fn(),
    };

    it('renders without crashing even when ingredients are missing', () => {
        const malformedRecipe = {
            name: 'Bad Recipe',
            description: 'Has no ingredients',
            instructions: ['Step 1']
            // ingredients is missing
        };

        render(
            <ArtifactContext.Provider value={mockContext}>
                <RecipeWidget data={malformedRecipe} />
            </ArtifactContext.Provider>
        );
        
        expect(screen.getByText('Bad Recipe')).toBeInTheDocument();
    });
});
