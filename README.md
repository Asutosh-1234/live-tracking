# Location Sharing Application

## Project Overview
A real-time location sharing application that allows authenticated users to share their current location and view other users' locations on an interactive map. It leverages Kafka for event-driven architecture, enabling scalable processing of high-frequency location updates.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via `pg` module)
- **Messaging/Event Streaming**: Apache Kafka (via `kafkajs`)
- **Real-time Communication**: Socket.IO
- **Authentication**: Passport.js (Google OAuth 2.0)
- **Frontend**: HTML, CSS, Vanilla JavaScript, Leaflet.js (for maps)
- **Containerization**: Docker & Docker Compose (for Kafka & PostgreSQL services)

## Setup Steps
1. Clone the repository.
2. Install dependencies using your preferred package manager (e.g., `pnpm install` or `npm install`).
3. Set up the environment variables by copying `.env.example` to `.env` and filling in the values.
4. Start the required services (Kafka, PostgreSQL) using Docker Compose:
   ```bash
   docker compose up -d
   ```
5. Run the application:
   ```bash
   node index.js
   ```
6. Access the application at `http://localhost:8000`.

## Environment Variables
- `PORT`: Port the server will run on (default: 8000).
- `GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth 2.0 client secret.
- `SESSION_SECRET`: A secure string used for signing the session ID cookie.
- `DATABASE_URL`: Connection string for PostgreSQL database.

## OIDC Auth Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services** > **Credentials**.
4. Click **Create Credentials** and select **OAuth client ID**.
5. Set the application type to **Web application**.
6. Add `http://localhost:8000/auth/google/callback` as an authorized redirect URI.
7. Copy the generated Client ID and Client Secret into your `.env` file.

## Socket Event Flow
1. The client establishes a WebSocket connection after successful authentication. The Express session is shared with Socket.IO to ensure the connection is authorized.
2. The client fetches its current location via the Geolocation API and emits a `client:location:update` event every 10 seconds containing latitude and longitude.
3. The server receives `client:location:update`, validates the coordinates, and forwards the data as a message to the `location-updates` Kafka topic.
4. The server's Kafka consumer listens to the `location-updates` topic and broadcasts the location to all connected clients via a `server:location:update` event.
5. Clients receive `server:location:update` and update the respective remote user markers on the Leaflet map.

## Kafka Event Flow
1. **Topic**: `location-updates`.
2. **Producer**: The WebSocket server produces messages to the topic containing the user's ID, latitude, and longitude.
3. **Consumers**:
   - `socket-server-*`: Consumes location updates and broadcasts them to connected WebSocket clients for real-time map updates.
   - `db-processor`: Consumes location updates independently and persists them to the PostgreSQL `location_history` table for historical tracking.

## Assumptions and Limitations
- **Assumptions**:
  - The client's browser supports the HTML5 Geolocation API.
  - The user will grant permission for location access upon prompting.
  - The PostgreSQL database and Kafka broker are reachable via the specified connection strings/defaults.
  - Docker is available to run Kafka and PostgreSQL locally.
- **Limitations**:
  - There is currently no logic for removing inactive users/markers from the map. Disconnected users will stay at their last known location indefinitely until the page is refreshed.
  - The database consumer assumes continuous growth of the `location_history` table without any retention policy or data cleanup.
  - A real-world production deployment would require setting up robust Kafka clusters, managing schema registries, and securing WebSocket connections (WSS), which are not fully addressed in this learning/development setup.
