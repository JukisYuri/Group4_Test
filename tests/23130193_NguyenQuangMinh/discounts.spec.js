// @ts-check
import { test, expect } from '@playwright/test';

/**
 * MODULE 4 - NHÓM 2: QUẢN LÝ GIẢM GIÁ (DISCOUNTS) - 20 TEST CASE
 * Ứng với sheet "Module4_Minh" - mục B. DISCOUNT MANAGEMENT
 * Website: http://127.0.0.1:8081/Admin
 *
 * Chạy riêng file này:
 *   npx playwright test tests/23130193_NguyenQuangMinh/discounts.spec.js --project=chromium
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

/** Text của một cột trên tất cả dòng dữ liệu */
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

/** Cột "Is active" có icon check hay không */
async function activeFlags(page, gridId) {
  return page.$$eval(
    `#${gridId} tbody tr`,
    (rows) =>
      rows
        .filter((tr) => tr.querySelectorAll('td').length > 2)
        .map((tr) => (tr.querySelectorAll('td')[6]?.innerHTML || '').includes('true-icon')),
    null
  );
}

async function gotoDiscountList(page) {
  await page.goto(`${BASE_URL}/Admin/Discount/List`, { waitUntil: 'networkidle' });
  await expect(page.locator('#discounts-grid')).toBeVisible({ timeout: 20000 });
}

async function openCreate(page) {
  await gotoDiscountList(page);
  await page.getByRole('link', { name: 'Add new' }).click();
  await page.waitForURL('**/Discount/Create', { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

/** Bật bảng "Advanced settings" để thấy Start date / End date.
 *  Chỉ click khi chưa mở (checkbox chưa checked) để tránh toggle ngược
 *  do trạng thái panel còn lưu lại giữa các test trong cùng session. */
async function showAdvanced(page) {
  const cb = page.locator('#advanced-settings-mode');
  if ((await cb.count()) > 0) {
    const checked = await cb.isChecked().catch(() => false);
    if (!checked) {
      await page.locator('label[for="advanced-settings-mode"]').first().click();
      await page.waitForTimeout(400);
    }
  }
}

/** Điền form thêm/sửa giảm giá */
async function fillDiscountForm(page, opts = {}) {
  if (opts.active === false) {
    await page.locator('#IsActive').uncheck();
  } else if (opts.active === true) {
    await page.locator('#IsActive').check();
  }
  if (opts.name !== undefined) await page.locator('#Name').fill(opts.name);
  if (opts.typeValue !== undefined) await page.locator('#DiscountTypeId').selectOption(opts.typeValue);

  if (opts.percentage !== undefined) {
    await page.locator('#UsePercentage').check();
    await page.locator('#DiscountPercentage').fill(String(opts.percentage));
  } else if (opts.amount !== undefined) {
    await page.locator('#UsePercentage').uncheck();
    await page.locator('#DiscountAmount').fill(String(opts.amount));
  }

  if (opts.coupon !== undefined) {
    await page.locator('#RequiresCouponCode').check();
    await page.locator('#CouponCode').fill(opts.coupon);
  }

  if (opts.start !== undefined || opts.end !== undefined) {
    await showAdvanced(page);
    if (opts.start !== undefined) await page.locator('#StartDateUtc').fill(opts.start);
    if (opts.end !== undefined) await page.locator('#EndDateUtc').fill(opts.end);
  }
}

/** Tạo mới một giảm giá và trả về tên */
async function createDiscount(page, opts = {}) {
  await openCreate(page);
  const name = opts.name || `QA_DIS_${Date.now()}`;
  await fillDiscountForm(page, { ...opts, name });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.alert-success').first()).toContainText(/successfully/i, { timeout: 15000 });
  return name;
}

/** Tìm giảm giá theo các điều kiện */
async function searchDiscounts(page, filters = {}) {
  await gotoDiscountList(page);
  if (filters.name !== undefined) await page.fill('#SearchDiscountName', filters.name);
  if (filters.coupon !== undefined) await page.fill('#SearchDiscountCouponCode', filters.coupon);
  if (filters.typeValue !== undefined) await page.locator('#SearchDiscountTypeId').selectOption(filters.typeValue);
  if (filters.active !== undefined) await page.locator('#IsActiveId').selectOption(filters.active);
  if (filters.start !== undefined) await page.fill('#SearchStartDate', filters.start);
  if (filters.end !== undefined) await page.fill('#SearchEndDate', filters.end);
  await searchGrid(page, '/Admin/Discount/List', '#search-discounts');
}

/** Mở trang sửa của giảm giá theo tên */
async function openDiscountEdit(page, name) {
  await searchDiscounts(page, { name });
  const row = page.locator('#discounts-grid tbody tr').filter({ hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.locator('a:has-text("Edit")').click();
  await page.waitForURL(/\/Admin\/Discount\/Edit\//, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('QUẢN LÝ GIẢM GIÁ (DISCOUNTS)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await gotoDiscountList(page);
  });

  // =========================================================================
  // NHÓM LỌC (FILTER) - 5 TEST CASE
  // =========================================================================

  test('TC_DIS_FILTER_01 - Lọc giảm giá theo trạng thái hoạt động (Is active)', async ({ page }) => {
    // Bước 2-3: lọc Is active = Active -> mọi bản ghi trả về đều Active
    await searchDiscounts(page, { active: '1' });
    await expect(page.locator('#IsActiveId')).toHaveValue('1');
    const activeFlagsList = await activeFlags(page, 'discounts-grid');
    expect(activeFlagsList.length).toBeGreaterThan(0);
    expect(activeFlagsList.every(Boolean)).toBeTruthy();

    // Bước 4: đổi sang Inactive -> mọi bản ghi trả về đều KHÔNG Active
    await searchDiscounts(page, { active: '2' });
    await expect(page.locator('#IsActiveId')).toHaveValue('2');
    const inactiveFlags = await activeFlags(page, 'discounts-grid');
    expect(inactiveFlags.length).toBeGreaterThan(0);
    expect(inactiveFlags.every((v) => !v)).toBeTruthy();
  });

  test('TC_DIS_FILTER_02 - Lọc giảm giá theo loại giảm giá (Discount type)', async ({ page }) => {
    // Bước 2-3: lọc theo "Assigned to order total"
    await searchDiscounts(page, { typeValue: '1' });
    await expect(page.locator('#SearchDiscountTypeId')).toHaveValue('1');
    const orderTotalTypes = await columnTexts(page, 'discounts-grid', 1);
    expect(orderTotalTypes.length).toBeGreaterThan(0);
    for (const type of orderTotalTypes) {
      expect(type).toBe('Assigned to order total');
    }

    // Bước 4: đổi sang "Assigned to products"
    await searchDiscounts(page, { typeValue: '2' });
    await expect(page.locator('#SearchDiscountTypeId')).toHaveValue('2');
    const productTypes = await columnTexts(page, 'discounts-grid', 1);
    for (const type of productTypes) {
      expect(type).toBe('Assigned to products');
    }
  });

  test('TC_DIS_FILTER_03 - Lọc giảm giá theo mã coupon (Coupon code)', async ({ page }) => {
    // Chuẩn bị một chương trình có mã coupon
    const coupon = `QA_FILTER_CP_${Date.now()}`;
    const name = await createDiscount(page, { coupon, amount: 5 });

    // Bước 2-3: lọc theo mã coupon tồn tại
    await searchDiscounts(page, { coupon });
    await expect(page.locator('#SearchDiscountCouponCode')).toHaveValue(coupon);
    const names = await columnTexts(page, 'discounts-grid', 0);
    expect(names).toContain(name);

    // Bước 4: lọc theo mã không tồn tại -> danh sách trống
    await searchDiscounts(page, { coupon: `KHONG_TON_TAI_${Date.now()}` });
    await expect(page.locator('#discounts-grid')).toContainText('No data available in table');
  });

  test('TC_DIS_FILTER_04 - Lọc giảm giá theo khoảng thời gian', async ({ page }) => {
    // Chuẩn bị chương trình có Start date / End date xác định
    const name = await createDiscount(page, {
      amount: 5,
      start: '2024-01-01T00:00',
      end: '2030-12-31T00:00',
    });

    // Bước 2-4: khoảng thời gian bao trùm chương trình (+ tên để định vị dòng,
    // vì lưới có phân trang/sắp xếp) -> bản ghi phải xuất hiện (bộ lọc ngày không loại)
    await searchDiscounts(page, { name, start: '2023-01-01', end: '2031-12-31' });
    await expect(page.locator('#SearchStartDate')).toHaveValue('2023-01-01');
    await expect(page.locator('#SearchEndDate')).toHaveValue('2031-12-31');
    expect(await columnTexts(page, 'discounts-grid', 0)).toContain(name);

    // Khoảng thời gian KHÔNG giao với chương trình -> bản ghi không xuất hiện
    await searchDiscounts(page, { name, start: '2032-01-01', end: '2035-12-31' });
    expect(await columnTexts(page, 'discounts-grid', 0)).not.toContain(name);
  });

  test('TC_DIS_FILTER_05 - Kết hợp nhiều điều kiện lọc giảm giá', async ({ page }) => {
    const coupon = `QA_COMBO_CP_${Date.now()}`;
    const name = await createDiscount(page, {
      coupon,
      amount: 7,
      start: '2024-01-01T00:00',
      end: '2030-12-31T00:00',
    });

    // Bước 2-4: kết hợp tên + loại + coupon + khoảng ngày + trạng thái
    await searchDiscounts(page, {
      name,
      typeValue: '1',
      coupon,
      active: '1',
      start: '2023-01-01',
      end: '2031-12-31',
    });
    await expect(page.locator('#SearchDiscountName')).toHaveValue(name);
    await expect(page.locator('#SearchDiscountCouponCode')).toHaveValue(coupon);
    await expect(page.locator('#IsActiveId')).toHaveValue('1');
    const filteredNames = await columnTexts(page, 'discounts-grid', 0);
    expect(filteredNames).toContain(name);
    expect(filteredNames.length).toBe(1);

    // Xóa toàn bộ điều kiện -> danh sách đầy đủ được khôi phục
    await searchDiscounts(page, {});
    expect((await columnTexts(page, 'discounts-grid', 0)).length).toBeGreaterThan(1);
  });

  // =========================================================================
  // NHÓM TÌM KIẾM (SEARCH) - 4 TEST CASE
  // =========================================================================

  test('TC_DIS_SEARCH_06 - Tìm giảm giá theo tên chính xác', async ({ page }) => {
    const name = await createDiscount(page, { amount: 9 });

    await searchDiscounts(page, { name });
    await expect(page.locator('#SearchDiscountName')).toHaveValue(name);

    const names = await columnTexts(page, 'discounts-grid', 0);
    expect(names.length).toBe(1);
    expect(names[0]).toBe(name);
  });

  test('TC_DIS_SEARCH_07 - Tìm giảm giá theo một phần tên', async ({ page }) => {
    const keyword = `QA_DIS_PART_${Date.now()}`;
    await createDiscount(page, { name: `${keyword}_A`, amount: 5 });
    await createDiscount(page, { name: `${keyword}_B`, amount: 6 });

    await searchDiscounts(page, { name: keyword });
    const names = await columnTexts(page, 'discounts-grid', 0);
    expect(names.length).toBe(2);
    for (const n of names) {
      expect(n).toContain(keyword);
    }
  });

  test('TC_DIS_SEARCH_08 - Tìm giảm giá theo mã coupon chính xác', async ({ page }) => {
    const coupon = `QA_SEARCH_CP_${Date.now()}`;
    const name = await createDiscount(page, { coupon, amount: 8 });

    await searchDiscounts(page, { coupon });
    const names = await columnTexts(page, 'discounts-grid', 0);
    expect(names).toContain(name);

    // Mở chương trình trong kết quả và kiểm tra mã coupon
    await openDiscountEdit(page, name);
    await expect(page.locator('#RequiresCouponCode')).toBeChecked();
    await expect(page.locator('#CouponCode')).toHaveValue(coupon);
  });

  test('TC_DIS_SEARCH_09 - Hiển thị danh sách trống khi không tìm thấy', async ({ page }) => {
    // Bước 2-3: tìm tên không tồn tại
    await searchDiscounts(page, { name: `khong_ton_tai_${Date.now()}` });
    await expect(page.locator('#discounts-grid')).toContainText('No data available in table');

    // Bước 4: xóa từ khóa -> danh sách đầy đủ được khôi phục
    await searchDiscounts(page, {});
    expect((await columnTexts(page, 'discounts-grid', 0)).length).toBeGreaterThan(0);
  });

  // =========================================================================
  // NHÓM THÊM MỚI (INSERT) - 6 TEST CASE
  // =========================================================================

  test('TC_DIS_INSERT_10 - Kiểm tra trường bắt buộc Name khi thêm mới', async ({ page }) => {
    await openCreate(page);

    // Bước 3: để trống Name, nhập hợp lệ các trường còn lại
    await page.locator('#DiscountTypeId').selectOption('1');
    await page.locator('#IsActive').check();

    // Bước 4: Save
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await settle(page);

    // Kỳ vọng: không lưu, hiển thị lỗi validation cho trường Name
    await expect(page).toHaveURL(/\/Admin\/Discount\/Create/);
    const error = page.locator('.field-validation-error, .validation-summary-errors').first();
    await expect(error).toBeVisible({ timeout: 10000 });
    await expect(error).toContainText(/name/i);
  });

  test('TC_DIS_INSERT_11 - Tạo giảm giá theo số tiền cố định (Discount amount)', async ({ page }) => {
    const name = await createDiscount(page, { amount: 10 });

    // Kiểm tra chương trình mới xuất hiện trong danh sách với đúng giá trị
    await searchDiscounts(page, { name });
    const rows = page.locator('#discounts-grid tbody tr').filter({ hasText: name });
    await expect(rows.first()).toBeVisible();
    await expect(rows.first()).toContainText('10');

    await openDiscountEdit(page, name);
    await expect(page.locator('#UsePercentage')).not.toBeChecked();
    await expect(page.locator('#DiscountAmount')).toHaveValue(/^10(\.0+)?$/);
  });

  test('TC_DIS_INSERT_12 - Tạo giảm giá theo phần trăm (Use percentage)', async ({ page }) => {
    const name = await createDiscount(page, { percentage: 10 });

    await openDiscountEdit(page, name);

    // Kỳ vọng: Use percentage được chọn, Discount percentage = 10, Discount amount bị ẩn
    await expect(page.locator('#UsePercentage')).toBeChecked();
    await expect(page.locator('#DiscountPercentage')).toHaveValue(/^10(\.0+)?$/);
    await expect(page.locator('#DiscountAmount')).toBeHidden();
  });

  test('TC_DIS_INSERT_13 - Hiển thị trường Coupon code khi bật Requires coupon code', async ({ page }) => {
    await openCreate(page);
    const name = `QA_DIS_COUPON_${Date.now()}`;
    const coupon = `QA_COUPON_${Date.now()}`;

    await page.locator('#IsActive').check();
    await page.locator('#Name').fill(name);
    await page.locator('#DiscountTypeId').selectOption('1');
    await page.locator('#UsePercentage').uncheck();
    await page.locator('#DiscountAmount').fill('10');

    // Bước 3: bật Requires coupon code -> trường Coupon code xuất hiện
    await page.locator('#RequiresCouponCode').check();
    await expect(page.locator('#CouponCode')).toBeVisible({ timeout: 10000 });
    await page.locator('#CouponCode').fill(coupon);

    // Bước 4: Save và mở lại chương trình
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/successfully/i);

    await openDiscountEdit(page, name);
    await expect(page.locator('#CouponCode')).toHaveValue(coupon);
  });

  test('TC_DIS_INSERT_14 - Thiết lập ngày bắt đầu và ngày kết thúc', async ({ page }) => {
    const name = await createDiscount(page, {
      amount: 5,
      start: '2024-01-01T00:00',
      end: '2030-12-31T00:00',
    });

    await openDiscountEdit(page, name);
    await showAdvanced(page);

    // Kỳ vọng: hai trường ngày được lưu đúng
    await expect(page.locator('#StartDateUtc')).toHaveValue(/^2024-01-01/);
    await expect(page.locator('#EndDateUtc')).toHaveValue(/^2030-12-31/);
  });

  test('TC_DIS_INSERT_15 - Tạo giảm giá thành công và lưu đúng thông tin', async ({ page }) => {
    await openCreate(page);
    const name = `QA_DIS_FULL_${Date.now()}`;
    const coupon = `QA_FULL_${Date.now()}`;

    await fillDiscountForm(page, {
      name,
      amount: 15,
      coupon,
      start: '2024-01-01T00:00',
      end: '2030-12-31T00:00',
      active: true,
    });

    // Bước 3: Save and Continue Edit để kiểm tra dữ liệu vừa lưu
    await page.getByRole('button', { name: 'Save and Continue Edit' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success').first()).toContainText(/successfully/i, { timeout: 15000 });
    await expect(page.locator('#Name')).toHaveValue(name);
    await expect(page.locator('#CouponCode')).toHaveValue(coupon);
    await expect(page.locator('#DiscountAmount')).toHaveValue(/^15(\.0+)?$/);
  });

  // =========================================================================
  // NHÓM CẬP NHẬT (UPDATE) - 2 TEST CASE
  // =========================================================================

  test('TC_DIS_UPDATE_16 - Cập nhật tên, loại, giá trị và trạng thái', async ({ page }) => {
    const name = await createDiscount(page, { amount: 10 });
    await openDiscountEdit(page, name);

    // Bước 2-5: thay đổi toàn bộ thông tin chính
    const newName = `QA_DIS_UPDATED_${Date.now()}`;
    await page.locator('#Name').fill(newName);
    await page.locator('#DiscountTypeId').selectOption('2');
    await page.locator('#UsePercentage').check();
    await page.locator('#DiscountPercentage').fill('20');
    if (await page.locator('#IsActive').isChecked()) {
      await page.locator('#IsActive').uncheck();
    }

    // Bước 6: Save
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/successfully/i, { timeout: 15000 });

    // Bước 7: mở lại chương trình và kiểm tra giá trị mới vẫn được giữ
    await openDiscountEdit(page, newName);
    await expect(page.locator('#Name')).toHaveValue(newName);
    await expect(page.locator('#DiscountTypeId')).toHaveValue('2');
    await expect(page.locator('#UsePercentage')).toBeChecked();
    await expect(page.locator('#DiscountPercentage')).toHaveValue(/^20(\.0+)?$/);
    await expect(page.locator('#IsActive')).not.toBeChecked();
  });

  test('TC_DIS_UPDATE_17 - Thay đổi mã coupon và điều kiện áp dụng', async ({ page }) => {
    const oldCoupon = `QA_OLD_${Date.now()}`;
    const name = await createDiscount(page, { coupon: oldCoupon, amount: 10 });
    await openDiscountEdit(page, name);

    // Bước 2-4: đổi mã coupon và ngày kết thúc
    const newCoupon = `QA_NEW_${Date.now()}`;
    await expect(page.locator('#RequiresCouponCode')).toBeChecked();
    await page.locator('#CouponCode').fill(newCoupon);
    await showAdvanced(page);
    await page.locator('#EndDateUtc').fill('2031-12-31T00:00');

    // Bước 5: Save
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success').first()).toContainText(/successfully/i, { timeout: 15000 });

    // Bước 6: tìm theo mã cũ và mã mới
    await searchDiscounts(page, { coupon: oldCoupon });
    expect(await columnTexts(page, 'discounts-grid', 0)).not.toContain(name);

    await searchDiscounts(page, { coupon: newCoupon });
    expect(await columnTexts(page, 'discounts-grid', 0)).toContain(name);
  });

  // =========================================================================
  // NHÓM XÓA / THÔNG TIN / PHÂN TRANG - 3 TEST CASE
  // =========================================================================

  test('TC_DIS_DELETE_18 - Xóa giảm giá và yêu cầu xác nhận', async ({ page }) => {
    const name = await createDiscount(page, { amount: 10 });
    await openDiscountEdit(page, name);

    // Bước 2: nhấn Delete -> popup xác nhận
    await page.locator('#discount-delete').click();
    const modal = page.locator('#discountmodel-Delete-delete-confirmation');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Are you sure you want to delete this item?');

    // Bước 3: Cancel -> chương trình vẫn tồn tại
    await modal.locator('span:has-text("No, cancel")').click();
    await expect(modal).toBeHidden({ timeout: 10000 });
    await expect(page).toHaveURL(/\/Admin\/Discount\/Edit\//);

    // Bước 4: Delete lần nữa và xác nhận
    await page.locator('#discount-delete').click();
    await expect(modal).toBeVisible({ timeout: 10000 });
    await modal.locator('button.btn-danger').click();
    await page.waitForURL('**/Discount/List', { timeout: 20000 });
    await expect(page.locator('.alert-success').first()).toContainText(/deleted/i);

    // Chương trình không còn trong danh sách
    await searchDiscounts(page, { name });
    expect(await columnTexts(page, 'discounts-grid', 0)).not.toContain(name);
  });

  test('TC_DIS_INFO_19 - Hiển thị chính xác thông tin giảm giá', async ({ page }) => {
    // Bước 2: kiểm tra đầy đủ tiêu đề các cột
    const headers = page.locator('#discounts-grid thead th');
    await expect(headers).toContainText([
      'Name',
      'Discount type',
      'Discount',
      'Start date',
      'End date',
      'Times used',
      'Is active',
      'Edit',
    ]);

    // Bước 3-4: mở chương trình cụ thể và đối chiếu thông tin
    const firstName = (await columnTexts(page, 'discounts-grid', 0))[0];
    await openDiscountEdit(page, firstName);
    await expect(page.locator('#Name')).toBeVisible();
    await expect(page.locator('#DiscountTypeId')).toBeVisible();
    await expect(page.locator('#Name')).toHaveValue(firstName);
  });

  test('TC_DIS_PAGE_20 - Phân trang danh sách giảm giá', async ({ page }) => {
    // Bước 2: thông tin phân trang
    const info = page.locator('#discounts-grid_info');
    await expect(info).toContainText(/1-\d+ of \d+ items/i);

    // Thay đổi số dòng hiển thị mỗi trang
    await page.locator('#dt-length-0').selectOption('15');
    await settle(page);
    await expect(info).toContainText(/1-\d+ of \d+ items/i);

    // Bước 3: chuyển trang nếu có
    const next = page.locator('#discounts-grid_next');
    if ((await next.count()) > 0) {
      const nextClass = (await next.getAttribute('class')) || '';
      if (!nextClass.includes('disabled')) {
        await next.locator('a').click();
        await settle(page);
      }
    }

    // Bước 4: lọc Is active = Active -> chỉ còn chương trình Active
    await searchDiscounts(page, { active: '1' });
    const flags = await activeFlags(page, 'discounts-grid');
    expect(flags.every(Boolean)).toBeTruthy();
    await expect(page.locator('#discounts-grid')).toBeVisible();
  });
});
