require('dotenv').config();
const { test, expect } = require('@playwright/test');

const BASE = (process.env.BASE_URL || 'http://localhost:80').replace(/\/$/, '');
const MUTATING = String(process.env.RUN_MUTATING_TESTS || 'true').toLowerCase() === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yourstore.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

async function loginAdmin(page) {
  await page.goto(`${BASE}/login?returnUrl=%2FAdmin`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const emailInput = page.locator('#Email, input[name="Email"]').first();
  const passInput = page.locator('#Password, input[name="Password"]').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(ADMIN_EMAIL);
    await passInput.fill(ADMIN_PASSWORD);
    await page.locator('button.login-button').first().click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

async function ensureLogin(page) {
  if (page.url().includes('/login') || page.url().endsWith('/')) {
    await loginAdmin(page);
  }
}

async function clickSelector(container, selectors) {
  for (const selector of selectors) {
    const target = container.locator(selector).first();
    if (await target.isVisible().catch(() => false)) {
      await target.click();
      return;
    }
  }
  throw new Error(`Không tìm thấy phần tử thao tác: ${selectors.join(', ')}`);
}

async function findField(page, definition, required = true) {
  if (!definition) {
    if (required) throw new Error('Thiếu cấu hình trường kiểm thử');
    return null;
  }

  for (const selector of definition.selectors || []) {
    const field = page.locator(selector).first();
    if (definition.visible === false && await field.count() > 0) return field;
    if (await field.isVisible().catch(() => false)) return field;
  }
  for (const label of definition.labels || []) {
    const field = page.getByLabel(label, { exact: false }).first();
    if (await field.isVisible().catch(() => false)) return field;
  }
  if (required) throw new Error(`Không tìm thấy trường: ${JSON.stringify(definition)}`);
  return null;
}

async function go(page, cfg) {
  await page.goto(`${BASE}${cfg.route}`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await loginAdmin(page);
    await page.goto(`${BASE}${cfg.route}`, { waitUntil: 'domcontentloaded' });
  }
  await expect(page).not.toHaveURL(/\/login/i, { timeout: 15000 });
  await expect(page.locator(cfg.pageReady).first()).toBeVisible({ timeout: 15000 });
}

async function search(page, cfg, keyword) {
  const field = await findField(page, cfg.search);
  await field.fill(keyword);
  await clickSelector(page, [cfg.searchButton]);
  await page.locator('table').first().waitFor({ state: 'visible', timeout: 15000 });
}

async function save(page) {
  await clickSelector(page, ['button[name="save"]', 'input[name="save"]']);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
}

async function requireMutation() {
  test.skip(!MUTATING, 'CRUD đang tắt. Chạy với RUN_MUTATING_TESTS=true khi được phép thay đổi dữ liệu demo.');
}

async function openCreate(page, cfg) {
  await page.goto(`${BASE}${cfg.createPath}`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await loginAdmin(page);
    await page.goto(`${BASE}${cfg.createPath}`, { waitUntil: 'domcontentloaded' });
  }
  await expect(page).not.toHaveURL(/\/login/i, { timeout: 15000 });
  await expect(page).toHaveURL(new RegExp(cfg.createPath.replace('/', '\\/'), 'i'));
}

async function fillRecord(page, cfg, value) {
  await (await findField(page, cfg.title)).fill(value);
  if (!cfg.body) return;

  const body = await findField(page, cfg.body, false);
  if (body && await body.isEditable().catch(() => false)) {
    await body.fill(`Automated Playwright content ${value}`);
    return;
  }

  const editor = page.locator('.note-editable').first();
  if (await editor.isVisible().catch(() => false))
    await editor.fill(`Automated Playwright content ${value}`);
}

async function createRecord(page, cfg, value) {
  await openCreate(page, cfg);
  await fillRecord(page, cfg, value);
  await save(page);
  await go(page, cfg);
  if (cfg.search) {
    await search(page, cfg, value);
    await expect(page.locator('body')).toContainText(value);
  }
}

async function rowFor(page, value) {
  const row = page.locator('tr').filter({ hasText: value }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

async function deleteRecord(page, cfg, value) {
  await go(page, cfg);
  await search(page, cfg, value);
  const row = await rowFor(page, value);
  await row.locator(cfg.editSelector).first().click();
  await clickSelector(page, [cfg.deleteSelector]);
  const confirm = page.locator('.modal:visible form button[type="submit"]').last();
  await confirm.waitFor({ state: 'visible', timeout: 5000 });
  await Promise.all([
    page.waitForURL(/\/List/i, { timeout: 15000 }).catch(() => {}),
    confirm.click()
  ]);
  await go(page, cfg);
  await search(page, cfg, value);
  await expect(page.locator('tr').filter({ hasText: value })).toHaveCount(0);
}

async function runCrud(page, cfg) {
  const original = `PW_AUTO_${Date.now()}`;
  await createRecord(page, cfg, original);
  await search(page, cfg, original);
  const row = await rowFor(page, original);
  await row.locator(cfg.editSelector).first().click();
  const updated = `${original}_EDITED`;
  await (await findField(page, cfg.title)).fill(updated);
  await save(page);
  await deleteRecord(page, cfg, updated);
}

function commonCases(prefix) {
  return [
    { id: `TC_${prefix}_LIST_01`, name: 'Hiển thị danh sách', kind: 'list' },
    { id: `TC_${prefix}_SEARCH_01`, name: 'Tìm kiếm dữ liệu', kind: 'search' },
    { id: `TC_${prefix}_SEARCH_02`, name: 'Tìm kiếm không có kết quả', kind: 'miss' },
    { id: `TC_${prefix}_SEARCH_03`, name: 'Xóa điều kiện tìm kiếm', kind: 'reset' },
    { id: `TC_${prefix}_ADD_01`, name: 'Thêm bản ghi hợp lệ', kind: 'create' },
    { id: `TC_${prefix}_ADD_02`, name: 'Validation trường bắt buộc', kind: 'required' },
    { id: `TC_${prefix}_UPDATE_01`, name: 'Cập nhật bản ghi', kind: 'crud' },
    { id: `TC_${prefix}_ACCESS_01`, name: 'Chặn truy cập khi chưa đăng nhập', kind: 'access' },
    { id: `TC_${prefix}_FORM_01`, name: 'Mở biểu mẫu thêm mới', kind: 'field', field: 'title' },
    { id: `TC_${prefix}_FORM_02`, name: 'Kiểm tra trường SEO', kind: 'field', field: 'seoField' }
  ];
}

function registerSuite(name, cfg, cases) {
  test.describe(`${name} Test Suite`, () => {
    for (const item of cases) {
      test(`${item.id} - ${item.name}`, async ({ page }) => {
        switch (item.kind) {
          case 'list':
            await go(page, cfg);
            await expect(page.locator('table').first()).toBeVisible();
            break;
          case 'search':
            await go(page, cfg);
            await search(page, cfg, cfg.seed);
            await expect(page.locator('table').first()).toBeVisible();
            break;
          case 'miss':
            await go(page, cfg);
            await search(page, cfg, `NO_MATCH_${Date.now()}`);
            await expect(page.locator('tr').filter({ hasText: 'NO_MATCH_' })).toHaveCount(0);
            break;
          case 'reset':
            await go(page, cfg);
            await search(page, cfg, cfg.seed);
            await search(page, cfg, '');
            break;
          case 'create': {
            await requireMutation();
            const value = `PW_AUTO_${Date.now()}`;
            await createRecord(page, cfg, value);
            await deleteRecord(page, cfg, value);
            break;
          }
          case 'required':
            await requireMutation();
            await openCreate(page, cfg);
            await save(page);
            await expect(page.locator('.field-validation-error, .validation-summary-errors, [aria-invalid="true"]').first()).toBeVisible();
            break;
          case 'crud':
            await requireMutation();
            await runCrud(page, cfg);
            break;
          case 'field':
            await openCreate(page, cfg);
            await expect(await findField(page, cfg[item.field])).toBeVisible();
            break;
          case 'access': {
            const context = await page.context().browser().newContext({ storageState: { cookies: [], origins: [] } });
            const guest = await context.newPage();
            const response = await guest.goto(`${BASE}${cfg.route}`);
            expect(/login/i.test(guest.url()) || (response && [401, 403].includes(response.status()))).toBeTruthy();
            await context.close();
            break;
          }
          default:
            throw new Error(`Chưa hỗ trợ test kind: ${item.kind}`);
        }
      });
    }
  });
}

module.exports = { BASE, commonCases, registerSuite, loginAdmin };
