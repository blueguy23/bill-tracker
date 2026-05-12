import { spawn, type ChildProcess } from 'child_process';
import { createConnection } from 'net';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
let serverProcess: ChildProcess | undefined;

export async function setup() {
  const isPortInUse = await checkPort(PORT);
  if (!isPortInUse) {
    serverProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'test',
        AUTH_SECRET: process.env.AUTH_SECRET ?? 'test-secret-for-ci-only-not-used-in-prod',
        AUTH_PASSWORD: process.env.AUTH_PASSWORD ?? 'testpassword',
      },
    });

    serverProcess.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString();
      if (!msg.includes('ExperimentalWarning')) process.stderr.write(msg);
    });

    await waitForServer(`${BASE_URL}/api/v1/health`, 90_000);
  }

  const sessionCookie = await authenticate();
  process.env.__INTEGRATION_SESSION_COOKIE = sessionCookie;
}

export async function teardown() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = undefined;
  }
}

async function authenticate(): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfCookies = extractSetCookies(csrfRes);
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies,
    },
    body: new URLSearchParams({
      csrfToken,
      password: process.env.AUTH_PASSWORD ?? 'testpassword',
    }),
    redirect: 'manual',
  });

  const allCookies = [csrfCookies, extractSetCookies(loginRes)].filter(Boolean).join('; ');
  return allCookies;
}

function extractSetCookies(res: Response): string {
  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  return setCookieHeaders.map((c) => c.split(';')[0]).join('; ');
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* server not ready */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server failed to start within ${timeoutMs}ms`);
}
