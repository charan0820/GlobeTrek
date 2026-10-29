export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body && { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
  if (!response.ok) {
    const error = new Error(body.error?.message || "Request failed.");
    error.status = response.status;
    error.code = body.error?.code;
    error.details = body.error?.details;
    error.requestId = body.error?.requestId;
    throw error;
  }
  return body;
}
export const money = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
export const dateLabel = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
export const dateOffset = (days) =>
  new Date(Date.parse(new Date().toISOString().slice(0, 10)) + days * 86400000)
    .toISOString()
    .slice(0, 10);
