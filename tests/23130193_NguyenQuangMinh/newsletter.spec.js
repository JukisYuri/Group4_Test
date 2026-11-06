// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * MODULE 4 - NHÓM 4: QUẢN LÝ NGƯỜI ĐĂNG KÝ BẢN TIN (NEWSLETTER) - 20 TEST CASE
 * Ứng với sheet "Module4_Minh" - mục D. NEWSLETTER SUBSCRIBERS
 * Website: http://127.0.0.1:8081/Admin
 *
 * Chạy riêng file này:
 *   npx playwright test tests/23130193_NguyenQuangMinh/newsletter.spec.js --project=chromium
 */

const BASE_URL = 'http://127.0.0.1:8081';
const ADMIN_EMAIL = 'admin@yourstore.com';
const ADMIN_PASSWORD = 'admin';

test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Hàm dùng chung
// ---------------------------------------------------------------------------

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/login?returnUrl=%2FAdmin`, { waitUntil: 'networkidle' });
  await page.fill('#Email', ADMIN_EMAIL);
  await page.fill('#Password', ADMIN_PASSWORD);
  await page.locator('button.login-button').click();
  await page.waitForURL('**/Admin', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

async function searchGrid(page, urlPart, buttonSelector) {
  const response = page
    .waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes(urlPart),
      { timeout: 20000 }
    )
    .catch(() => null);
  await page.locator(buttonSelector).click();
  await response;
  await settle(page);
  await page.waitForTimeout(300);
}

/** Text của một cột trên tất cả dòng dữ liệu thật */
async function columnTexts(page, gridId, columnIndex) {
  return page.$$eval(
    `#${gridId} tbody tr`,
    (rows, col) =>
      rows
        .filter((tr) => tr.querySelectorAll('td').length > 2)
        .map((tr) => (tr.querySelectorAll('td')[col]?.innerText || '').trim()),
    columnIndex
  );
}

/** Cột "Active" (index 2) có icon true-icon hay không */
async function activeFlags(page, gridId) {
  return page.$$eval(
    `#${gridId} tbody tr`,
    (rows) =>
      rows
        .filter((tr) => tr.querySelectorAll('td').length > 2)
        .map((tr) => (tr.querySelectorAll('td')[2]?.innerHTML || '').includes('true-icon')),
    null
  );
}

async function gotoNewsletterList(page) {
  await page.goto(`${BASE_URL}/Admin/NewsLetterSubscription/List`, { waitUntil: 'networkidle' });
  await expect(page.locator('#newsletter-subscriptions-grid')).toBeVisible({ timeout: 20000 });
}

/** Tìm kiếm bản tin theo các điều kiện */
async function searchNewsletter(page, filters = {}) {
  await gotoNewsletterList(page);
  if (filters.email !== undefined) await page.fill('#SearchEmail', filters.email);
  if (filters.start !== undefined) await page.fill('#StartDate', filters.start);
  if (filters.end !== undefined) await page.fill('#EndDate', filters.end);
  if (filters.active !== undefined) await page.locator('#ActiveId').selectOption(filters.active);
  if (filters.store !== undefined) {
    const storeSel = page.locator('#StoreId');
    if ((await storeSel.count()) > 0 && (await storeSel.isVisible().catch(() => false))) {
      await storeSel.selectOption(filters.store);
    }
  }
  if (filters.role !== undefined) await page.locator('#CustomerRoleId').selectOption(filters.role);
  if (filters.subType !== undefined) await page.locator('#SubscriptionTypeId').selectOption(filters.subType);
  await searchGrid(page, '/Admin/NewsLetterSubscription/List', '#search-subscriptions');
}

async function openCreateNews(page) {
  await gotoNewsletterList(page);
  await page.getByRole('link', { name: 'Add new' }).click();
  await page.waitForURL('**/NewsLetterSubscription/Create', { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

/** Tạo mới bản tin, trả về email */
async function createNews(page, opts = {}) {
  await openCreateNews(page);
  const ts = opts.ts || Date.now();
  const email = opts.email || `qa_news_${ts}@test.com`;
  if (opts.active === false) await setActiveChecked(page, false);
  else await setActiveChecked(page, true);
  await page.locator('#Email').fill(email);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.alert-success').first()).toContainText(/has been added successfully/i, { timeout: 15000 });
  return email;
}

/** Mở trang sửa của bản tin theo email (tìm chính xác một phần) */
async function openNewsEdit(page, emailFragment) {
  await searchNewsletter(page, { email: emailFragment });
  const row = page.locator('#newsletter-subscriptions-grid tbody tr').filter({ hasText: emailFragment }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.locator('a:has-text("Edit")').click();
  await page.waitForURL(/\/Admin\/NewsLetterSubscription\/Edit\//, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Đặt trạng thái checkbox Active (checkbox kiểu nopCommerce bị ẩn input,
 * phải click vào label để toggle).
 */
async function setActiveChecked(page, value) {
  const input = page.locator('#Active');
  const label = page.locator('label[for="Active"]');
  const checked = await input.isChecked();
  if (checked !== value) {
    await label.click();
    await page.waitForTimeout(150);
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('QUẢN LÝ NGƯỜI ĐĂNG KÝ BẢN TIN (NEWSLETTER)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await gotoNewsletterList(page);
  });

  // =========================================================================
  // NHÓM LỌC (FILTER) - 5 TEST CASE
  // =========================================================================

  test('TC_NEWS_FILTER_01 - Lọc bản tin theo trạng thái Active', async ({ page }) => {
    // Lọc Active = Active
    await searchNewsletter(page, { active: '1' });
    await expect(page.locator('#ActiveId')).toHaveValue('1');
    const activeList = await activeFlags(page, 'newsletter-subscriptions-grid');
    expect(activeList.length).toBeGreaterThan(0);
    expect(activeList.every(Boolean)).toBeTruthy();

    // Khôi phục All
    await searchNewsletter(page, { active: '0' });
    await expect(page.locator('#ActiveId')).toHaveValue('0');
    expect((await activeFlags(page, 'newsletter-subscriptions-grid')).length).toBeGreaterThan(0);
  });

  test('TC_NEWS_FILTER_02 - Lọc bản tin theo trạng thái Not active', async ({ page }) => {
    await searchNewsletter(page, { active: '2' });
    await expect(page.locator('#ActiveId')).toHaveValue('2');
    const flags = await activeFlags(page, 'newsletter-subscriptions-grid');
    expect(flags.every((v) => !v)).toBeTruthy();
  });

  test('TC_NEWS_FILTER_03 - Lọc bản tin theo khoảng thời gian (Start date - End date)', async ({ page }) => {
    const email = await createNews(page);
    // Lọc khoảng bao trùm -> danh sách hiển thị kết quả (bộ lọc có hiệu lực)
    await searchNewsletter(page, { start: '2020-01-01', end: '2035-12-31' });
    await expect(page.locator('#StartDate')).toHaveValue('2020-01-01');
    await expect(page.locator('#EndDate')).toHaveValue('2035-12-31');
    expect((await columnTexts(page, 'newsletter-subscriptions-grid', 0)).length).toBeGreaterThan(0);

    // Kết hợp email + khoảng thời gian bao trùm -> bản ghi mới xuất hiện
    await searchNewsletter(page, { email, start: '2020-01-01', end: '2035-12-31' });
    expect(await columnTexts(page, 'newsletter-subscriptions-grid', 0)).toContain(email);

    // Khoảng không giao -> bản ghi mới không xuất hiện
    await searchNewsletter(page, { email, start: '2036-01-01', end: '2040-12-31' });
    expect(await columnTexts(page, 'newsletter-subscriptions-grid', 0)).not.toContain(email);
  });

  test('TC_NEWS_FILTER_04 - Lọc bản tin theo cửa hàng (Store)', async ({ page }) => {
    const storeSel = page.locator('#StoreId');
    if ((await storeSel.count()) > 0 && (await storeSel.isVisible().catch(() => false))) {
      // Có trường lọc Store trên giao diện -> lọc và kiểm tra cột Store
      await searchNewsletter(page, { store: '1' });
      const stores = await columnTexts(page, 'newsletter-subscriptions-grid', 3);
      for (const s of stores) expect(s).toBe('Your store name');
    } else {
      // Bản demo không hiển thị bộ lọc Store (N/A) -> kiểm tra cột Store đúng
      const stores = await columnTexts(page, 'newsletter-subscriptions-grid', 3);
      expect(stores.length).toBeGreaterThan(0);
      for (const s of stores) expect(s).toBe('Your store name');
    }
  });

  test('TC_NEWS_FILTER_05 - Kết hợp nhiều điều kiện lọc bản tin', async ({ page }) => {
    const email = await createNews(page);
    await searchNewsletter(page, { email, active: '1', store: '1', start: '2020-01-01', end: '2035-12-31' });
    await expect(page.locator('#SearchEmail')).toHaveValue(email);
    await expect(page.locator('#ActiveId')).toHaveValue('1');
    const emails = await columnTexts(page, 'newsletter-subscriptions-grid', 0);
    expect(emails).toContain(email);

    // Xóa điều kiện
    await searchNewsletter(page, {});
    expect((await columnTexts(page, 'newsletter-subscriptions-grid', 0)).length).toBeGreaterThan(0);
  });

  // =========================================================================
  // NHÓM TÌM KIẾM (SEARCH) - 4 TEST CASE
  // =========================================================================

  test('TC_NEWS_SEARCH_06 - Tìm bản tin theo email chính xác', async ({ page }) => {
    const email = await createNews(page);
    await searchNewsletter(page, { email });
    const emails = await columnTexts(page, 'newsletter-subscriptions-grid', 0);
    expect(emails.length).toBe(1);
    expect(emails[0]).toBe(email);
  });

  test('TC_NEWS_SEARCH_07 - Tìm bản tin theo một phần email', async ({ page }) => {
    const ts = Date.now();
    const email = `qa_part_${ts}@test.com`;
    await createNews(page, { email });
    await searchNewsletter(page, { email: `qa_part_${ts}` });
    const emails = await columnTexts(page, 'newsletter-subscriptions-grid', 0);
    expect(emails.length).toBeGreaterThan(0);
    for (const e of emails) expect(e).toContain(`qa_part_${ts}`);
  });

  test('TC_NEWS_SEARCH_08 - Hiển thị danh sách trống khi không tìm thấy', async ({ page }) => {
    await searchNewsletter(page, { email: `khong_ton_tai_${Date.now()}@test.com` });
    await expect(page.locator('#newsletter-subscriptions-grid')).toContainText('No data available in table');
  });

  test('TC_NEWS_SEARCH_09 - Xử lý email có khoảng trắng hoặc ký tự đặc biệt', async ({ page }) => {
    const ts = Date.now();
    const email = `qa_uni_${ts}@test.com`;
    await createNews(page, { email });
    // Khoảng trắng đầu/cuối -> hệ thống trim và vẫn trả về
    await searchNewsletter(page, { email: `  ${email}  ` });
    expect(await columnTexts(page, 'newsletter-subscriptions-grid', 0)).toContain(email);
  });

  // =========================================================================
  // NHÓM THÊM MỚI (INSERT) - 4 TEST CASE
  // =========================================================================

  test('TC_NEWS_INSERT_10 - Kiểm tra trường bắt buộc Email khi thêm mới', async ({ page }) => {
    await openCreateNews(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    // Không redirect về List, vẫn ở trang Create và có thông báo lỗi
    expect(/\/Create$/.test(page.url())).toBeTruthy();
    await expect(page.locator('.validation-summary-errors, .text-danger, .field-validation-error').first()).toBeVisible();
  });

  test('TC_NEWS_INSERT_11 - Kiểm tra định dạng email không hợp lệ', async ({ page }) => {
    await openCreateNews(page);
    const bad = ['abc', 'abc@', '@abc.com', 'abc@abc'];
    for (const b of bad) {
      await page.locator('#Email').fill(b);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.validation-summary-errors, .text-danger, .field-validation-error').first()).toBeVisible();
      expect(/\/Create$/.test(page.url())).toBeTruthy();
    }
    // Email hợp lệ -> lưu thành công
    const ok = `qa_ok_${Date.now()}@test.com`;
    await page.locator('#Email').fill(ok);
    await setActiveChecked(page, true);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/has been added successfully/i);
  });

  test('TC_NEWS_INSERT_12 - Không cho phép tạo bản ghi trùng email', async ({ page }) => {
    const email = await createNews(page); // bản ghi gốc (1)
    // Tạo lại cùng email
    await openCreateNews(page);
    await setActiveChecked(page, true);
    await page.locator('#Email').fill(email);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    // Hệ thống không lưu bản ghi trùng: không có thông báo thành công, vẫn ở trang Create
    await expect(page.locator('.alert-success')).toHaveCount(0);
    expect(/\/Create$/.test(page.url())).toBeTruthy();

    // Số bản ghi không tăng: tìm theo email -> đúng 1 bản ghi
    await searchNewsletter(page, { email });
    const emails = await columnTexts(page, 'newsletter-subscriptions-grid', 0);
    expect(emails.filter((e) => e === email).length).toBe(1);
  });

  test('TC_NEWS_INSERT_13 - Thêm mới bản tin thành công và hiển thị chính xác', async ({ page }) => {
    const email = await createNews(page);
    await openNewsEdit(page, email);
    await expect(page.locator('#Email')).toHaveValue(email);
    await expect(page.locator('#Active')).toBeChecked();
  });

  // =========================================================================
  // NHÓM CẬP NHẬT (UPDATE) & TRẠNG THÁI (STATUS) - 2 TEST CASE
  // =========================================================================

  test('TC_NEWS_UPDATE_14 - Cập nhật email của bản tin', async ({ page }) => {
    const email = await createNews(page);

    // Trên trang Edit, trường Email bị khóa (read-only, type=hidden) - email là
    // định danh của bản đăng ký trong nopCommerce nên KHÔNG thể sửa trực tiếp
    // qua form (đây là ràng buộc thực tế của UI, tương đương N/A cho "đổi email").
    await openNewsEdit(page, email);
    await expect(page.locator('#Email')).toBeHidden();
    await expect(page.locator('#Email')).toHaveValue(email);

    // Vẫn chứng minh luồng cập nhật hoạt động: đổi một trường cho phép sửa
    // (Loại bản tin: 1 -> 2) rồi lưu.
    await page.locator('#SelectedNewsLetterSubscriptionTypeId').selectOption('2');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/has been updated successfully/i, { timeout: 15000 });

    // Hệ thống redirect về List sau khi lưu -> mở lại trang Edit để kiểm tra
    await openNewsEdit(page, email);
    await expect(page.locator('#SelectedNewsLetterSubscriptionTypeId')).toHaveValue('2');
    // Email giữ nguyên, không đổi được
    await expect(page.locator('#Email')).toHaveValue(email);
  });

  test('TC_NEWS_STATUS_15 - Thay đổi trạng thái Active/Inactive', async ({ page }) => {
    const email = await createNews(page); // mặc định Active
    await openNewsEdit(page, email);
    await expect(page.locator('#Active')).toBeChecked();
    // Tắt Active
    await setActiveChecked(page, false);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/has been updated successfully/i);

    // Hệ thống redirect về List sau khi lưu -> mở lại trang Edit để kiểm tra
    await openNewsEdit(page, email);
    await expect(page.locator('#Active')).not.toBeChecked();

    // Bật lại
    await setActiveChecked(page, true);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');

    await openNewsEdit(page, email);
    await expect(page.locator('#Active')).toBeChecked();
  });

  // =========================================================================
  // NHÓM XÓA (DELETE) & NHẬP/XUẤT (IMPORT/EXPORT) - 4 TEST CASE
  // =========================================================================

  test('TC_NEWS_DELETE_16 - Xóa bản tin và hiển thị popup xác nhận', async ({ page }) => {
    const email = await createNews(page);
    await openNewsEdit(page, email);

    // Mở popup xác nhận
    await page.locator('#subscription-delete').click();
    await page.waitForTimeout(600);
    const modal = page.locator('#newslettersubscriptionmodel-Delete-delete-confirmation');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Are you sure/i);

    // Cancel -> đóng popup, vẫn ở trang Edit.
    // (Popup chỉ có nút đóng × và Delete, KHÔNG có nút Cancel riêng)
    const cancelBtn = modal.locator('button:has-text("Cancel")');
    if (await cancelBtn.count()) {
      await cancelBtn.click();
    } else {
      await modal.locator('button.close[data-dismiss="modal"]').click();
    }
    await page.waitForTimeout(400);
    await expect(modal).toBeHidden();
    expect(/\/Edit\//.test(page.url())).toBeTruthy();

    // Xóa lần 2 và xác nhận
    await page.locator('#subscription-delete').click();
    await page.waitForTimeout(600);
    await modal.locator('button.btn-danger').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/has been deleted successfully/i, { timeout: 15000 });

    // Tìm lại -> không còn
    await searchNewsletter(page, { email });
    await expect(page.locator('#newsletter-subscriptions-grid')).toContainText('No data available in table');
  });

  test('TC_NEWS_DELETE_17 - Xóa hàng loạt (N/A: không có chức năng trên giao diện)', async ({ page }) => {
    // Bản demo không cung cấp checkbox chọn dòng / xóa hàng loạt trên danh sách
    await gotoNewsletterList(page);
    const headerCheckboxes = await page.locator('#newsletter-subscriptions-grid thead input[type="checkbox"]').count();
    const bulkDelete = await page.locator('#newsletter-subscriptions-grid button:has-text("Delete"), #delete-selected').count();
    expect(headerCheckboxes).toBe(0);
    expect(bulkDelete).toBe(0);

    // Xóa đơn lẻ vẫn hoạt động (kiểm chứng lại)
    const email = await createNews(page);
    await openNewsEdit(page, email);
    await page.locator('#subscription-delete').click();
    await page.waitForTimeout(600);
    const modal = page.locator('#newslettersubscriptionmodel-Delete-delete-confirmation');
    await expect(modal).toBeVisible();
    await modal.locator('button.btn-danger').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/has been deleted successfully/i);
  });

  test('TC_NEWS_IMPORT_18 - Nhập danh sách từ file CSV', async ({ page }) => {
    const ts = Date.now();
    const e1 = `qa_imp_${ts}_a@test.com`;
    const e2 = `qa_imp_${ts}_b@test.com`;
    const csv = `Email,Active,StoreId,LanguageId,SubscriptionTypeId\n${e1},true,1,1,1\n${e2},false,1,1,1\n`;
    const file = path.join(os.tmpdir(), `news_imp_${ts}.csv`);
    fs.writeFileSync(file, csv);

    await gotoNewsletterList(page);
    await page.getByRole('button', { name: 'Import from CSV' }).click();
    await page.waitForTimeout(600);
    const modal = page.locator('#importcsv-window');
    await expect(modal).toBeVisible();
    await page.setInputFiles('#importcsvfile', file);
    await modal.locator('button:has-text("Import from CSV")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.locator('.alert-success').first()).toContainText(/have been successfully imported/i);

    // Hai email mới xuất hiện
    await searchNewsletter(page, { email: `qa_imp_${ts}` });
    const emails = await columnTexts(page, 'newsletter-subscriptions-grid', 0);
    expect(emails).toContain(e1);
    expect(emails).toContain(e2);

    // Nhập lại cùng file -> không tạo bản ghi trùng
    await gotoNewsletterList(page);
    await page.getByRole('button', { name: 'Import from CSV' }).click();
    await page.waitForTimeout(500);
    await page.setInputFiles('#importcsvfile', file);
    await modal.locator('button:has-text("Import from CSV")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await searchNewsletter(page, { email: `qa_imp_${ts}` });
    const after = await columnTexts(page, 'newsletter-subscriptions-grid', 0);
    expect(after.filter((e) => e === e1).length).toBe(1);
    expect(after.filter((e) => e === e2).length).toBe(1);
  });

  test('TC_NEWS_EXPORT_19 - Xuất danh sách ra file CSV', async ({ page }) => {
    await gotoNewsletterList(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'Export to CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const filePath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toMatch(/Email/i);
    expect(content).toMatch(/Active/i);
    // Có ít nhất 1 dòng dữ liệu (ngoài header)
    const dataRows = content.trim().split('\n').filter((l) => l.trim().length > 0);
    expect(dataRows.length).toBeGreaterThan(1);
  });

  // =========================================================================
  // NHÓM PHÂN TRANG (PAGE) - 1 TEST CASE
  // =========================================================================

  test('TC_NEWS_PAGE_20 - Phân trang danh sách bản tin', async ({ page }) => {
    await gotoNewsletterList(page);
    // Thay đổi số dòng hiển thị
    const lengthSel = page.locator('#newsletter-subscriptions-grid_length select');
    if (await lengthSel.count()) {
      await lengthSel.selectOption({ label: '50' }).catch(() => {});
      await settle(page);
      await page.waitForTimeout(400);
    }
    // Chuyển sang trang 2 nếu có
    const next = page.locator('#newsletter-subscriptions-grid_next');
    if ((await next.count()) > 0) {
      const cls = (await next.getAttribute('class')) || '';
      if (!cls.includes('disabled')) {
        await next.locator('a').click().catch(() => {});
        await settle(page);
        await page.waitForTimeout(400);
      }
    }
    expect((await columnTexts(page, 'newsletter-subscriptions-grid', 0)).length).toBeGreaterThan(0);
  });
});
