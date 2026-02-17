# Q Yaar Web Frontend

This is the frontend for Q Yaar, an app that allows you to play games across cities.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- API backend server running (see backend repository)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Q-Yaar/q-yaar-web.git
   cd q-yaar-web
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on `.env.example` (if available) and configure environment variables.

### Running the Project

Run `npm run start`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Deployments

`npm run deploy`

## Configuration

Environment variables can be configured in `.env` file:

```
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```
