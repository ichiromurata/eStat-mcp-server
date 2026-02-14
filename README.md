# e-Stat API Search MCP Server

This is a **Model Context Protocol (MCP)** server that runs on [Cloudflare Workers](https://workers.cloudflare.com/) and provides an interface to the **[e-Stat API](https://www.e-stat.go.jp/api/)** (Official Statistics of Japan).

It allows AI agents (like Claude Desktop) to search for Japanese government statistical tables, inspect metadata, and retrieve statistical data for analysis.

## Features

- **Search Tables (`get_tables`)**: Find statistical tables by keywords, ministry code, or category.
- **Search Surveys (`get_surveys`)**: Find available surveys if you are unsure about specific tables.
- **Get Metadata (`get_metadata`)**: Retrieve detailed metadata (classifications, area codes, time periods) for a specific table.
- **Get Data (`get_data`)**: Fetch the actual statistical data values based on the table ID and optional filters.

## Prerequisites

- **Node.js**: (v18 or later recommended)
- **Cloudflare Wrangler**: CLI tool for Cloudflare Workers.
- **e-Stat API Key**: You must register to get an "Application ID" (appId).
  - [Register for e-Stat API](https://www.e-stat.go.jp/api/api-dev/how_to_use)

## Setup

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   This server requires the `ESTAT_API_KEY` environment variable.

   **For Local Development:**
   Create a `.dev.vars` file in the project root:
   ```text
   ESTAT_API_KEY=your_app_id_here
   ```

   **For Production (Cloudflare Deployment):**
   Set the secret using Wrangler:
   ```bash
   npx wrangler secret put ESTAT_API_KEY
   # Enter your App ID when prompted
   ```

## Usage

### Local Development

To run the MCP server locally for testing:

```bash
npm run dev
```
This will start the server at `http://localhost:8787`.

### Deployment

To deploy to your Cloudflare Workers account:

```bash
npm run deploy
```

## Connecting to Claude Desktop

To use this MCP server with [Claude Desktop](https://claude.ai/download), add the following configuration to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "e-stat-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-cloudflare",
        "start",
        "https://<your-worker-name>.<your-subdomain>.workers.dev"
      ]
    }
  }
}
```

*Note: Replace the URL with your deployed Cloudflare Worker URL, or use `http://localhost:8787` if running locally along with `mcp-remote`.*

Alternatively, if you are running locally and want to connect directly:

```json
{
  "mcpServers": {
    "e-stat-local": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"
      ]
    }
  }
}
```

## Tools Available

### `get_tables`
Searches for statistical tables.
- **Parameters**: `searchWord`, `statsCode`, `limit`, etc.

### `get_surveys`
Searches for surveys. Useful for data discovery.
- **Parameters**: `searchWord`, `limit`, etc.

### `get_metadata`
Retrieves structure and classification information for a table.
- **Parameters**: `statsDataId` (Required).

### `get_data`
Fetches the actual data records.
- **Parameters**: `statsDataId` (Required), and optional filters like `cdCat01`, `cdTime`, `cdArea`.
