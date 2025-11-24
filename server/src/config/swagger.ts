import swaggerJsdoc, { OAS3Definition, OAS3Options } from 'swagger-jsdoc';

const definition: OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: "Santa's Elf API",
    version: '1.0.0',
    description: "API documentation for Santa's Elf Backend",
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
  ],
};

const options: OAS3Options = {
  definition,
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export default specs;
