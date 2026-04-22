import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = (config.projects[0]?.use.baseURL) ?? 'http://localhost:4000';
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.locator('[data-testid="password-input"]').fill(
    process.env.AUTH_PASSWORD ?? 'testpassword',
  );
  await page.locator('[data-testid="login-btn"]').click();
  await page.waitForURL('/');

  await page.context().storageState({ path: path.join(authDir, 'user.json') });
  await browser.close();
}

export default globalSetup;
