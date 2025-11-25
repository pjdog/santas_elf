# 🎅 Santa's Elf - Your Agentic Holiday Helper

<div align="center">

![Santa's Elf Banner](client/public/favicon.svg)

**A futuristic, AI-powered holiday companion designed to make your season bright.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Development](#-development)

</div>

---

## ✨ Features

Santa's Elf isn't just a todo list; it's a fully interactive, voice-enabled agent that brings the North Pole to your device.

*   **🧠 AI Agent Chat:** Have a natural conversation with an Elf who understands your intent. Ask for recipes, gift ideas, or just chat!
*   **🍲 Recipe Finder:** Discover delicious holiday meals with detailed ingredient lists and step-by-step instructions.
*   **🎁 Gift Guide:** Get personalized gift suggestions based on interests, budget, and recipient type.
*   **🎄 Decoration Genius:** Upload a photo of your room and get AI-powered suggestions on how to decorate it for the season.
*   **🗣️ Voice Integration:** Hands-free interaction support – just speak to the Elf!
*   **📱 Modern iOS-Style UI:** A beautiful, glassmorphic interface designed for touch and responsiveness (inspired by iOS 26 concepts).
*   **🔐 Secure Auth:** Google OAuth integration for secure user sessions.

---

## 🏗 Architecture

The project is built as a modern full-stack application containerized for easy deployment.

*   **Frontend:** React 19 with Material UI v6 (Custom Glassmorphic Theme).
*   **Backend:** Node.js / Express with TypeScript.
*   **Database/Cache:** Redis for session management and caching.
*   **AI/ML:** Integration with Generative AI models for intent recognition and content generation.
*   **Infrastructure:** Nginx reverse proxy, Docker Compose orchestration.

---

## 🚀 Quick Start

The easiest way to run Santa's Elf is using Docker Compose via our helper script.

### Prerequisites
*   **Docker** & **Docker Compose** installed.
*   *(Optional)* **Google Cloud Credentials** for OAuth (see [Configuration](#-configuration)).

### 1. Start the App
We provide a robust management script to handle the lifecycle of the application.

```bash
./manage.sh up
```

This command will:
1.  Create a `.env` file from templates (if missing).
2.  Build the frontend and backend images.
3.  Start Redis, Backend, Frontend, and Nginx services.

**The app will be available at:** [http://localhost:8080](http://localhost:8080)

### 2. Stop the App
To stop all services and remove orphan containers:

```bash
./manage.sh down
```

### 3. Clean Reset
To wipe the database and start fresh:

```bash
./manage.sh clean
```

### API Documentation (JSDoc)
Generate static docs (served at `/docs` inside the running container):

```bash
cd server
npm install
npm run docs
```

Then start the stack and visit [http://localhost:8080/docs](http://localhost:8080/docs).

---

## ⚙️ Configuration

### Google Authentication (OAuth 2.0)
To enable user login, you need Google OAuth credentials.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project and enable the **Google People API**.
3.  Create OAuth credentials (Client ID & Secret).
4.  Set the **Authorized Redirect URI** to: `http://localhost:8080/auth/google/callback`
5.  **Setup in App:**
    *   Launch the app.
    *   If not configured, you will see a **Setup Page**.
    *   Enter your Client ID and Secret there, or paste your JSON credentials file.
    *   *Alternatively*, edit the `.env` file directly:
        ```env
        GOOGLE_CLIENT_ID=your_id
        GOOGLE_CLIENT_SECRET=your_secret
        ```

### AI Model
The app uses a generative AI model. Ensure your API keys (if applicable for the chosen provider) are set in the `.env` file:
```env
GEMINI_API_KEY=your_api_key_here
```

---

## 💻 Development

If you want to run the services locally without Docker for development:

### Backend
```bash
cd server
npm install
# Ensure Redis is running locally on port 6379
npm run dev
```
*Server runs on port 5000.*

### Frontend
```bash
cd client
npm install
npm start
```
*Client runs on port 3000 (proxies API requests to port 5000).*

### Testing
We have a comprehensive test suite including Unit, Integration, and E2E tests.

**Run All Tests:**
```bash
# Backend
cd server && npm test

# Frontend
cd client && npm test
```

---

## 🤝 Contributing

Ho ho ho! Contributions are welcome. Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
