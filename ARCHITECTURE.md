# Santa's Elf - Architectural Description

This document outlines the proposed architecture for the Santa's Elf application.

## High-Level Overview

The application will follow a classic client-server architecture, with a web-based frontend and a backend API server. A database will be used for data persistence. Voice integration will be handled by a dedicated module.

```
┌───────────────┐     ┌────────────────┐     ┌──────────────┐
│               │     │                │     │              │
│  Web Frontend ├─────►  Backend API   ├─────►   Database   │
│ (React/Next.js)│     │  (Node/Express)│     │     (Redis)    │
│               │     │                │     │              │
└───────┬───────┘     └────────┬───────┘     └──────────────┘
        │                      │
        │                      │
┌───────▼───────┐     ┌────────▼───────┐
│               │     │                │
│ Voice Input   │     │ Voice Service  │
│(Web Speech API)│     │                │
│               │     │                │
└───────────────┘     └────────────────┘
```

## Components

### 1. Frontend (Client)

*   **Framework:** React (or Next.js for server-side rendering benefits).
*   **Responsibilities:**
    *   Render the user interface.
    *   Manage user interactions (e.g., filling out forms, clicking buttons).
    *   Handle client-side state (e.g., the current recipe, the user's gift list).
    *   Communicate with the backend API via HTTP requests.
    *   Capture voice input using the Web Speech API.

### 2. Backend (Server)

*   **Framework:** Node.js with Express.
*   **Responsibilities:**
    *   Provide a RESTful API for the frontend.
    *   Handle business logic:
        *   Recipe scaling and filtering.
        *   Gift recommendation generation.
        *   User authentication and management.
    *   Interact with the database to store and retrieve data.
    *   Process and interpret commands from the voice service.

### 3. Database

*   **System:** Redis
*   **Responsibilities:**
    *   Store user data (e.g., user accounts, saved recipes, gift lists) as JSON objects or in Hashes.
    *   Store application data (e.g., a "master" list of recipes and gift ideas) using appropriate Redis data structures.
    *   Provide fast in-memory data access.

### 4. Voice Integration

*   **Input:** The browser's Web Speech API will be used to capture the user's voice and convert it to text.
*   **Processing:**
    1.  The frontend sends the transcribed text to the backend.
    2.  The backend has a dedicated "voice service" module that parses the text to identify intents and entities.
        *   **Intent:** The user's goal (e.g., `find_recipe`, `add_gift`).
        *   **Entities:** Specific pieces of information (e.g., `"chocolate chip cookies"`, `"mom"`, `"$50"`).
    3.  The backend then executes the appropriate action based on the parsed command.

## Data Flow Example: Finding a Recipe

1.  **User Interaction (Voice):** The user says, "Find a recipe for 12 people."
2.  **Frontend:**
    *   The Web Speech API captures the audio and transcribes it to the text "find a recipe for 12 people".
    *   The frontend sends a POST request to the `/api/voice` endpoint with the transcribed text.
3.  **Backend:**
    *   The voice service module receives the text.
    *   It identifies the intent as `find_recipe` and the entity as `num_guests: 12`.
    *   The backend queries the database for recipes.
    *   It then adjusts the ingredient quantities for each recipe to serve 12 people.
    *   The backend returns a JSON response with a list of adjusted recipes.
4.  **Frontend:**
    *   The frontend receives the list of recipes and displays them to the user.

## Testing

A comprehensive testing strategy will be implemented to ensure the quality and reliability of the application.

*   **Unit Tests:**
    *   **Backend:** Jest will be used to test individual functions and modules in isolation. This will include testing business logic (e.g., recipe scaling, gift recommendation algorithms) and API endpoint handlers.
    *   **Frontend:** React Testing Library and Jest will be used to test individual React components.
*   **Integration Tests:**
    *   These tests will verify the interaction between different parts of the application, such as the frontend and backend.
    *   Supertest will be used to test the backend API endpoints.
*   **End-to-End (E2E) Tests:**
    *   Cypress will be used to simulate user interactions in a real browser environment. This will ensure that the entire application flow works as expected.

## Documentation

*   **API Documentation:**
    *   Swagger or a similar tool will be used to automatically generate interactive API documentation from the JSDoc comments in the backend code. This will provide a clear and up-to-date reference for the API endpoints.
*   **Code Documentation:**
    *   JSDoc will be used to document functions, classes, and modules in both the frontend and backend code. This will improve code readability and maintainability.
