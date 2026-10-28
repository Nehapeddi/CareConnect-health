# CareConnect Pro — Full Stack Healthcare Management Website

## Features

- Healthcare landing page with a responsive design for desktop and mobile
- User registration and login with authentication
- Doctor information and healthcare services
- Appointment management
- Prescription management
- Patient dashboard with upcoming appointments and health-related information
- Task management for healthcare-related activities
- Payment information and payment summaries
- Community features for users
- Demo video consultation interface
- REST API built with Node.js and Express
- API health endpoint to check server status
- Netlify deployment support for online access

## Requirements

Install:

1. Node.js LTS
2. npm (included with Node.js)
3. Visual Studio Code
4. Git and a GitHub account (for deployment)

## Setup

1. Open the CareConnect Pro project folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Install the project dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root directory.
5. Add your environment variables to `.env`:

   ```env
   JWT_SECRET=your_private_random_secret
   PORT=5001
   ```

6. Start the local server:

   ```bash
   npm start
   ```

7. Open the local website in your browser:

   `http://localhost:5001`

8. To access the deployed website, visit:

   https://careconne.netlify.app/

For development with automatic server restart, use:

```bash
npm run dev
```

*Note: The development command requires a corresponding script in `package.json` and a development tool such as `nodemon`.*

## Deployment on Netlify

The project is configured to support Netlify deployment.

- `public` is the frontend publishing directory.
- `netlify/functions` contains the serverless API function.
- `netlify.toml` configures the build and API redirects.
- The Express application in `server.js` is wrapped using `serverless-http` for Netlify Functions.

After pushing changes to the connected GitHub repository, Netlify can deploy the updated project automatically.

Live website: https://careconne.netlify.app/

## API

The following API endpoints are available in the project:

- `GET /api/health` — Checks whether the API is running.
- `POST /api/auth/register` — Registers a user.
- `POST /api/auth/login` — Logs in a user.
- `GET /api/dashboard` — Retrieves the authenticated user's dashboard information.
- Appointment endpoints — Manage appointment information.
- Prescription endpoints — Manage prescription information.
- Task endpoints — Manage tasks.
- Payment endpoints — Retrieve payment information.
- Community endpoints — Manage community-related actions.

Some endpoints require authentication.

## Project Structure

- `public/index.html` → Website page structure
- `public/style.css` → Website styling and responsive layout
- `public/app.js` → Frontend logic, API requests, and user interactions
- `server.js` → Express server, API routes, authentication, and application logic
- `netlify/functions/api.js` → Connects the Express application to Netlify Functions
- `netlify.toml` → Netlify build configuration and API redirects
- `package.json` → Project dependencies and npm scripts
- `.env` → Private environment variables; create locally and do not upload to GitHub
- `.gitignore` → Specifies files and folders Git should ignore

## Important

- Keep `.env` and all private credentials out of your public GitHub repository.
- Set a strong, unique `JWT_SECRET` in Netlify's environment variables for production.
- The project currently uses JSON files for data storage, as implemented in `server.js`. It does not currently use MongoDB unless you add and configure that integration.
- Netlify Functions are designed for serverless execution; local file-based storage should not be treated as permanent production storage.
- The video consultation feature is a demo interface and does not, by itself, provide a complete real-time video consultation between two users.
- The API base URL in `public/app.js` is configured for the frontend and backend to use the same Netlify domain.
- For local development, use `http://localhost:5001`. For the deployed website, use the Netlify URL above.
