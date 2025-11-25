# Google OAuth2 Setup Instructions

This guide will walk you through setting up Google OAuth2 for the Santa's Elf application.

## 1. Create a Google API Project

1.  Go to the [Google API Console](https://console.developers.google.com/).
2.  If you don't have a project, create a new one.

## 2. Configure the OAuth Consent Screen

1.  In the left sidebar, go to **OAuth consent screen**.
2.  Choose **External** as the user type and click **Create**.
3.  Fill in the required information:
    *   **App name:** Santa's Elf
    *   **User support email:** Your email address
    *   **Developer contact information:** Your email address
4.  Click **Save and Continue**.
5.  On the **Scopes** page, click **Save and Continue** (we don't need any special scopes for now).
6.  On the **Test users** page, click **Add Users** and add your Google account's email address. This will allow you to test the login while the app is in development.
7.  Click **Save and Continue** and then **Back to Dashboard**.

## 3. Create OAuth Client ID Credentials

1.  In the left sidebar, go to **Credentials**.
2.  Click **+ Create Credentials** at the top and select **OAuth client ID**.
3.  For **Application type**, select **Web application**.
4.  Give it a name, for example, `Santa's Elf Web Client`.
5.  Under **Authorized JavaScript origins**, click **+ Add URI** and enter `http://localhost:3000`.
6.  Under **Authorized redirect URIs**, click **+ Add URI** and enter `http://localhost:5000/auth/google/callback`.
7.  Click **Create**.
8.  A dialog will appear with your **Client ID** and **Client Secret**. Copy these values.

## 4. Configure Environment Variables

1.  If you don't already have one, create a `.env` file in the `santas_elf/server` directory.
2.  Add the following lines to the `.env` file, replacing the placeholder values with the credentials you just copied. Also, create a random string for the `SESSION_SECRET`.

    ```
    # Google OAuth Credentials
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    # Session Secret
    SESSION_SECRET=a_very_long_and_random_string_for_securing_sessions
    ```

You are now ready to proceed with the backend setup for authentication.

## CLI Login with Google
- Obtain a Google ID token for the configured OAuth client (for example, via `gcloud auth print-identity-token` against the same client ID).
- Run the CLI with `GOOGLE_ID_TOKEN=<token> AGENT_BASE_URL=http://localhost:5000 npm run agent:cli`.
- The server validates the token audience against `GOOGLE_CLIENT_ID` and accepts it as an authenticated session for CLI calls.
