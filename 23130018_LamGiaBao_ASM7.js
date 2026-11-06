// nopCommerce Admin - 60 Playwright test cases
// Run: npx playwright test nopcommerce-all-in-one.spec.js
// Disable CRUD tests explicitly: RUN_MUTATING_TESTS=false npx playwright test nopcommerce-all-in-one.spec.js
require('dotenv').config();
const { test, expect } = require('@playwright/test');

const BASE = (process.env.BASE_URL || 'http://localhost:80').replace(/\/$/, '');
const MUTATING = String(process.env.RUN_MUTATING_TESTS || 'true').toLowerCase() === 'true';

async function go(page, cfg) {
  await page.goto(`${BASE}${cfg.route}`, { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/login/i, { timeout: 15000 });
  await expect(page.locator(cfg.pageReady).first()).toBeVisible({ timeout: 15000 });
}

async function clickAction(container, name) {
  const candidates = [
    container.getByRole('button', { name }).first(),
    container.getByRole('link', { name }).first()
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return;
    }
  }
  throw new Error(`Không tìm thấy thao tác: ${name}`);
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
  await expect(page).not.toHaveURL(/\/login/i, { timeout: 15000 });
  await expect(page).toHaveURL(new RegExp(cfg.createPath.replace('/', '\\/') , 'i'));
}

async function fillRecord(page, cfg, value) {
  await (await findField(page, cfg.title)).fill(value);
  if (cfg.body) {
    const body = await findField(page, cfg.body, false);
    if (body && await body.isEditable().catch(() => false))
      await body.fill(`Automated Playwright content ${value}`);
    else {
      const editor = page.locator('.note-editable').first();
      if (await editor.isVisible().catch(() => false))
        await editor.fill(`Automated Playwright content ${value}`);
    }
  }
}

async function createRecord(page, cfg, value) {
  await openCreate(page, cfg);
  await fillRecord(page, cfg, value);
  await save(page);
  await go(page, cfg);
  await search(page, cfg, value);
  await expect(page.locator('body')).toContainText(value);
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
  const edit = row.locator(cfg.editSelector).first();
  await edit.click();
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

async function requiredValidation(page, cfg) {
  await openCreate(page, cfg);
  await save(page);
  const validation = page.locator('.field-validation-error, .validation-summary-errors, [aria-invalid="true"]').first();
  if (await validation.count() > 0)
    await expect(validation).toBeVisible();
  else
    await expect(page).toHaveURL(new RegExp(`${cfg.route.replace('/', '\\/')}$`, 'i'));
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
            await expect(await findField(page, cfg.search)).toBeVisible();
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
            await expect(page.locator('table').first()).toBeVisible();
            break;
          case 'create':
            await requireMutation();
            {
              const value = `PW_AUTO_${Date.now()}`;
              await createRecord(page, cfg, value);
              await deleteRecord(page, cfg, value);
            }
            break;
          case 'required':
            await requireMutation();
            await requiredValidation(page, cfg);
            break;
          case 'boundary':
            await requireMutation();
            {
              const value = `PW_AUTO_${Date.now()}_Tiếng Việt & !@#`;
              await createRecord(page, cfg, value);
              await deleteRecord(page, cfg, value);
            }
            break;
          case 'crud':
            await requireMutation();
            await runCrud(page, cfg);
            break;
          case 'field':
            await openCreate(page, cfg);
            {
              const field = await findField(page, cfg[item.fieldKey] || item.field, false);
              if (!field)
                throw new Error(`Không tìm thấy trường bắt buộc của test ${item.id}: ${JSON.stringify(cfg[item.fieldKey] || item.field)}`);
              if ((cfg[item.fieldKey] || item.field).visible === false)
                await expect(field).toHaveCount(1);
              else
                await expect(field).toBeVisible();
            }
            break;
          case 'delete':
            await requireMutation();
            {
              const value = `PW_AUTO_${Date.now()}`;
              await createRecord(page, cfg, value);
              await deleteRecord(page, cfg, value);
            }
            break;
          case 'access': {
            const context = await page.context().browser().newContext({
              storageState: { cookies: [], origins: [] }
            });
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

const topics = {
  route: '/Admin/Topic/List',
  pageReady: '#topics-area',
  createPath: '/Admin/Topic/Create',
  searchButton: '#search-topics',
  deleteSelector: '#topic-delete',
  editSelector: 'a[href*="/Topic/Edit/"]',
  stateField: { selectors: ['#Published'], visible: false },
  seoField: { selectors: ['#SeName'], visible: false },
  search: { selectors: ['#SearchKeywords', 'input[name="SearchKeywords"]'] },
  title: { selectors: ['#Title', 'input[name="Title"]'], labels: [/^title$/i] },
  body: { selectors: ['#Body', 'textarea[name="Body"]'], labels: [/^body$/i] },
  seed: 'ConditionsOfUse'
};

const blogs = {
  route: '/Admin/Blog/BlogPosts',
  pageReady: '#blogpost-grid_wrapper, #blogpost-grid',
  createPath: '/Admin/Blog/BlogPostCreate',
  searchButton: '#search-blogpost',
  deleteSelector: '#blogpost-delete',
  editSelector: 'a[href*="/Blog/BlogPostEdit/"]',
  stateField: { selectors: ['#AllowComments'], visible: false },
  seoField: { selectors: ['#SeName'], visible: false },
  search: { selectors: ['#SearchTitle', 'input[name="SearchTitle"]'] },
  title: { selectors: ['#Title', 'input[name="Title"]'], labels: [/^title$/i] },
  body: { selectors: ['#Body', 'textarea[name="Body"]'], labels: [/^body$/i] },
  seed: 'Blog'
};

const categories = {
  route: '/Admin/Category/List',
  pageReady: '#categories-grid_wrapper, #categories-grid',
  createPath: '/Admin/Category/Create',
  searchButton: '#search-categories',
  deleteSelector: '#category-delete',
  editSelector: 'a[href*="/Category/Edit/"]',
  stateField: { selectors: ['#Published'], visible: false },
  seoField: { selectors: ['#SeName'], visible: false },
  search: { selectors: ['#SearchCategoryName', 'input[name="SearchCategoryName"]'] },
  title: { selectors: ['#Name', 'input[name="Name"]'], labels: [/^name$/i] },
  body: null,
  seed: 'Electronics'
};

const products = {
  route: '/Admin/Product/List',
  pageReady: '#products-grid_wrapper, #products-grid',
  createPath: '/Admin/Product/Create',
  searchButton: '#search-products',
  deleteSelector: '#product-delete',
  editSelector: 'a[href*="/Product/Edit/"]',
    stateField: { selectors: ['#Published'], visible: false },
  seoField: { selectors: ['#SeName'], visible: false },
  search: { selectors: ['#SearchProductName', 'input[name="SearchProductName"]'] },
  title: { selectors: ['#Name', 'input[name="Name"]'], labels: [/^name$/i] },
  body: { selectors: ['#FullDescription', 'textarea[name="FullDescription"]'] },
  seed: 'computer'
};

const commonCases = prefix => [
  { id: `TC_${prefix}_LIST_01`, name: 'Hiển thị danh sách', kind: 'list' },
  { id: `TC_${prefix}_SEARCH_01`, name: 'Tìm kiếm dữ liệu hiện có', kind: 'search' },
  { id: `TC_${prefix}_SEARCH_02`, name: 'Tìm kiếm không có kết quả', kind: 'miss' },
  { id: `TC_${prefix}_SEARCH_03`, name: 'Xóa điều kiện tìm kiếm', kind: 'reset' },
  { id: `TC_${prefix}_ADD_01`, name: 'Thêm bản ghi hợp lệ', kind: 'create' },
  { id: `TC_${prefix}_ADD_02`, name: 'Validation trường bắt buộc', kind: 'required' },
  { id: `TC_${prefix}_ADD_03`, name: 'Dữ liệu biên và ký tự đặc biệt', kind: 'boundary' },
  { id: `TC_${prefix}_UPDATE_01`, name: 'Cập nhật bản ghi', kind: 'crud' },
  { id: `TC_${prefix}_UPDATE_02`, name: 'Kiểm tra trường trạng thái', kind: 'field', fieldKey: 'stateField' },
  { id: `TC_${prefix}_UPDATE_03`, name: 'Kiểm tra SEO hoặc slug', kind: 'field', fieldKey: 'seoField' },
  { id: `TC_${prefix}_DELETE_01`, name: 'Xóa bản ghi thử nghiệm', kind: 'delete' },
  { id: `TC_${prefix}_ACCESS_01`, name: 'Chặn truy cập khi chưa đăng nhập', kind: 'access' },
  { id: `TC_${prefix}_FORM_01`, name: 'Mở biểu mẫu thêm mới', kind: 'field', field: { selectors: ['#Name', '#Title', '#Email'] } },
  { id: `TC_${prefix}_FORM_02`, name: 'Kiểm tra trường định danh', kind: 'field', field: { selectors: ['#Name', '#Title', '#Email'] } },
  { id: `TC_${prefix}_FORM_03`, name: 'Kiểm tra nút lưu', kind: 'field', field: { selectors: ['button[name="save"]', 'input[name="save"]'] } }
];

registerSuite('Topics', topics, commonCases('TOP'));
registerSuite('Blog posts', blogs, commonCases('BLOG'));
registerSuite('Categories', categories, commonCases('CAT'));
registerSuite('Products', products, commonCases('PRO'));
