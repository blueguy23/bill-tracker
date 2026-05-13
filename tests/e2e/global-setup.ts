import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = (config.projects[0]?.use.baseURL) ?? 'http://localhost:4000';
  const authDir = path.join(import.meta.dirname, '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const password = process.env.AUTH_PASSWORD ?? 'testpassword';

  for (let attempt = 0; attempt < 5; attempt++) {
    let pageError = false;
    const errorHandler = () => { pageError = true; };
    page.on('pageerror', errorHandler);

    await page.goto(`${baseURL}/login`);
    await page.locator('[data-testid="password-input"]').fill(password);
    await page.locator('[data-testid="login-btn"]').click();

    try {
      await page.waitForURL(`${baseURL}/`, { timeout: 15000 });
      page.off('pageerror', errorHandler);
      break;
    } catch {
      page.off('pageerror', errorHandler);
      if (attempt === 4) throw new Error('Global setup: login failed after 5 attempts');
    }
  }

  await context.storageState({ path: path.join(authDir, 'user.json') });
  await browser.close();
}

export default globalSetup;
