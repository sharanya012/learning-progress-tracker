
const API_URL = "http://localhost:5000/api/v1";

let csrfToken = null;

async function getCsrfToken() {
  const response = await fetch(`${API_URL}/csrf-token`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Could not initialise secure session.");
  }

  const data = await response.json();
  csrfToken = data.csrfToken;
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrfToken) {
      await getCsrfToken();
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  if (data.csrfToken) {
    csrfToken = data.csrfToken;
  }

  return data;
}
