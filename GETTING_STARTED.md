# Santa's Elf - Getting Started

This guide will help you get the Santa's Elf application up and running.

## Prerequisites

*   Node.js (LTS version recommended) and npm installed.
*   Redis installed and running.

## Containerized Setup (Recommended)

1.  Ensure Docker and Docker Compose are installed.
2.  From the project root, run:
    ```bash
    ./manage.sh up
    ```
    The script will copy `.env.template` to `.env` (if it does not already exist), then build and start the Redis, backend, and frontend containers.
3.  Visit the app at `http://localhost:3000` and the API docs at `http://localhost:5000/api-docs`.
4.  When you are done, stop the stack with:
    ```bash
    ./manage.sh down
    ```

Additional environment overrides can be applied by editing the generated `.env` file before running `./manage.sh up`.

## Manual Setup

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd santas_elf
    ```

2.  **Backend Setup:**
    *   Navigate to the `server` directory:
        ```bash
        cd server
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   **Database Setup (Manual Step):**
        *   Ensure Redis is running.
        *   Create a `.env` file in the `server` directory based on `.env.template` and fill in your Redis connection string:
            ```
            REDIS_URL="redis://localhost:6379"
            ```
        *   Initialize the database schema and seed initial data by running the `init.js` script:
            ```bash
            node src/db/init.js
            ```
    *   Start the backend server:
        ```bash
        npm start
        ```
        The backend will be running on `http://localhost:5000`.

3.  **Frontend Setup:**
    *   Open a new terminal and navigate to the `client` directory:
        ```bash
        cd ../client
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   Start the frontend development server:
        ```bash
        npm start
        ```
        The frontend will typically open in your browser at `http://localhost:3000`.

## Accessing the Application

Once both the backend and frontend servers are running:

*   **Frontend Application:** Open your web browser and go to `http://localhost:3000`.
    *   You can navigate between "Recipe Finder" and "Gift Guide" using the links in the header.
    *   You can use the "Start Voice Command" button to interact with the application via voice.
*   **Backend API Documentation:** Access the Swagger UI at `http://localhost:5000/api-docs`.

## Running Tests

*   **Backend Unit/Integration Tests:**
    *   Navigate to the `server` directory and run:
        ```bash
        npm test
        ```
*   **Frontend Unit Tests:**
    *   Navigate to the `client` directory and run:
        ```bash
        npm test
        ```
*   **Frontend E2E Tests (Cypress):**
    *   Ensure the frontend and backend are running.
    *   Navigate to the `client` directory and run:
        ```bash
        npm run cypress:open
        ```
        This will open the Cypress Test Runner where you can select and run the E2E tests.

## Generating Documentation

*   **Backend API Documentation (JSDoc):**
    *   Navigate to the `server` directory and run:
        ```bash
        npm run docs
        ```
        This will generate HTML documentation in the `server/docs` directory.
