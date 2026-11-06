const fs = require('fs');
const path = require('path');
const { chromium, expect } = require('@playwright/test');

require('dotenv').config();

const BASE = (process.env.BASE_URL || 'http://localhost:80').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@yourstore.com';
const PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

async function isAuthenticated(browser) {
  if (!fs.existsSync(AUTH_FILE)) return false;

  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  await page.goto(`${BASE}/admin/`, { waitUntil: 'domcontentloaded' });
  const authenticated = !/\/login/i.test(page.url()) &&
    await page.locator('body').getByText(/dashboard|control panel|bảng điều khiển/i).first()
      .isVisible().catch(() => false);
  await context.close();
  return authenticated;
}

async function globalSetup() {
  const browser = await chromium.launch();

  try {
    if (await isAuthenticated(browser)) return;

    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/login?ReturnUrl=%2Fadmin%2F`, { waitUntil: 'domcontentloaded' });
    await page.locator('#Email, input[name="Email"]').first().fill(EMAIL);
    await page.locator('#Password, input[name="Password"]').first().fill(PASSWORD);
    const loginForm = page.locator('form[action*="/login"]').first();
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      loginForm.locator('button[type="submit"], input[type="submit"]').first().click()
    ]);
    if (/\/login/i.test(page.url())) {
      const errors = await page.locator('.message-error, .validation-summary-errors, .field-validation-error')
        .allTextContents();
      const message = errors.map(error => error.trim()).filter(Boolean).join(' | ');
      throw new Error(
        `Đăng nhập admin thất bại với ${EMAIL}. ${message || 'Kiểm tra ADMIN_EMAIL và ADMIN_PASSWORD trong file .env.'}`
      );
    }
    await expect(page.locator('body')).toContainText(/dashboard|control panel|bảng điều khiển/i, { timeout: 15000 });
    await context.storageState({ path: AUTH_FILE });
    await context.close();
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
