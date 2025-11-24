describe('Santa\'s Elf Application E2E Tests', () => {
    beforeEach(() => {
        cy.fixture('data.json').as('mockData');
        cy.intercept('GET', '/api/recipes?guests=1', { fixture: 'data.json' }).as('getRecipes');
        cy.intercept('GET', '/api/gifts?', { fixture: 'data.json' }).as('getGifts');
        cy.visit('http://localhost:3000'); // Assuming React app runs on port 3000
    });
  
    it('should navigate to Recipe Finder and display recipes', () => {
      cy.contains('Recipe Finder').click();
      cy.url().should('include', '/recipes');
      cy.contains('h2', 'Recipe Finder').should('be.visible');
      
      cy.wait('@getRecipes');
      cy.get('.recipe-list').children().should('have.length.at.least', 1);
      cy.contains('Classic Sugar Cookies').should('be.visible');
    });
  
    it('should navigate to Gift Guide and display gifts', () => {
      cy.contains('Gift Guide').click();
      cy.url().should('include', '/gifts');
      cy.contains('h2', 'Gift Guide').should('be.visible');
  
      cy.wait('@getGifts');
      cy.get('.gift-list').children().should('have.length.at.least', 1);
      cy.contains('Cozy Winter Scarf').should('be.visible');
    });

    it('should be able to use voice command button', () => {
        cy.contains('Start Voice Command').should('be.visible');
        cy.contains('Stop Listening').should('not.exist');
    })
  });