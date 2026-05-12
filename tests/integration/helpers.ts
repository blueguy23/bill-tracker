const BASE_URL = 'http://localhost:3000';

function cookies(): string {
  return process.env.__INTEGRATION_SESSION_COOKIE ?? '';
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export function get(path: string) {
  return fetch(apiUrl(path), {
    headers: { Cookie: cookies() },
  });
}

export function post(path: string, body: unknown) {
  return fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies() },
    body: JSON.stringify(body),
  });
}

export function put(path: string, body: unknown) {
  return fetch(apiUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies() },
    body: JSON.stringify(body),
  });
}

export function patch(path: string, body: unknown) {
  return fetch(apiUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookies() },
    body: JSON.stringify(body),
  });
}

export function del(path: string) {
  return fetch(apiUrl(path), {
    method: 'DELETE',
    headers: { Cookie: cookies() },
  });
}
