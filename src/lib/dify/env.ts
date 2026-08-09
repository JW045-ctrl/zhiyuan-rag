import "server-only";

export interface DifyServerConfig {
  apiBaseUrl: string;
  apiKey: string;
}

export function getDifyServerConfig(): DifyServerConfig {
  const apiBaseUrl = process.env.DIFY_API_BASE_URL?.trim();
  const apiKey = process.env.DIFY_API_KEY?.trim();

  if (!apiBaseUrl) {
    throw new Error("DIFY_API_BASE_URL is not configured");
  }

  if (!apiKey) {
    throw new Error("DIFY_API_KEY is not configured");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error("DIFY_API_BASE_URL is invalid");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("DIFY_API_BASE_URL must use HTTP or HTTPS");
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    apiKey,
  };
}

