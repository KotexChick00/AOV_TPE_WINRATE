import { serve } from "bun";

// Caching variables
let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes

// External API configuration
//const CONFIG_URL = "https://herowinrate.moba.garena.vn/vn/api/config";
const API_URL = "https://herowinrate.moba.garena.tw/tw/api/server_trend";
const API_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": "https://herowinrate.moba.garena.tw/",
};

// Fetch data from the external API
async function fetchData(): Promise<any> {
  const now = Date.now();

  // Return cached data if it's still valid
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    console.log("Returning cached data");
    return cachedData;
  }

  // Fetch fresh data from the API
  try {
    console.log("Fetching fresh data from API");
    const response = await fetch(API_URL, { headers: API_HEADERS });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Update cache
    cachedData = await response.json();
    lastFetchTime = now;
    return cachedData;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// Handle incoming requests
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Route: API Proxy
  if (url.pathname === "/api") {
    try {
      const data = await fetchData();
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow CORS
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Failed to fetch data" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Route: Serve static files (e.g., index.html)
  const filePath = url.pathname === "/" ? "./index.html" : `.${url.pathname}`;
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file, {
      headers: { "Cache-Control": "public, max-age=3600" }, // Cache static files for 1 hour
    });
  }

  // Fallback for client-side routing (e.g., React/Vue apps)
  return new Response(Bun.file("./index.html"), {
    headers: { "Content-Type": "text/html" },
  });
}

// Start the Bun server
serve({
  port: 3000,
  fetch: handleRequest,
});

console.log("🚀 Server running at http://localhost:3000");