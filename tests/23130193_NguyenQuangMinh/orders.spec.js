// @ts-check
import { test, expect } from '@playwright/test';

/**
 * MODULE 4 - NHÓM 1: QUẢN LÝ ĐƠN HÀNG (ORDERS) - 20 TEST CASE
 * Ứng với sheet "Module4_Minh" - mục A. ORDER MANAGEMENT
 * Website: http://127.0.0.1:8081/Admin
 *
 * Chạy riêng file này:
 *   npx playwright test tests/23130193_NguyenQuangMinh/orders.spec.js --project=chromium
 */

const BASE_URL = 'http://127.0.0.1:8081';
const ADMIN_EMAIL = 'admin@yourstore.com';
const ADMIN_PASSWORD = 'admin';

// Chạy tuần tự trong file để dữ liệu đơn hàng không bị thay đổi chồng chéo giữa các test.
test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Hàm dùng chung
// ---------------------------------------------------------------------------

/** Đăng nhập vào trang Admin */
async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/login?returnUrl=%2FAdmin`, { waitUntil: 'networkidle' });
  await page.fill('#Email', ADMIN_EMAIL);
  await page.fill('#Password', ADMIN_PASSWORD);
  await page.locator('button.login-button').click();
  await page.waitForURL('**/Admin', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

/** Chờ các request nền (DataTables) ổn định */
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

/** Nhấn nút Search và chờ đúng request POST của trang hiện tại trả về */
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

/** Các dòng dữ liệu thật của grid (bỏ dòng "No data available in table") */
function dataRows(page, gridId) {
  // Dòng dữ liệu có nhiều cột; dòng "No data available in table" chỉ có 1 ô (colspan)
  return page.locator(`#${gridId} tbody tr:has(td:nth-child(3))`);
}

/** Lấy text của một cột trên toàn bộ dòng dữ liệu (bỏ dòng rỗng) */
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

/** Mở trang danh sách đơn hàng */
async function gotoOrderList(page) {
  await page.goto(`${BASE_URL}/Admin/Order/List`, { waitUntil: 'networkidle' });
  await expect(page.locator('#orders-grid')).toBeVisible({ timeout: 20000 });
}

/** Lấy href trang Edit của dòng đầu tiên */
async function firstOrderHref(page) {
  return page
    .locator('#orders-grid tbody tr')
    .first()
    .locator('a[href*="/Admin/Order/Edit/"]')
    .first()
    .getAttribute('href');
}

/** Mở trang chi tiết đơn hàng theo href */
async function openOrder(page, href) {
  await page.goto(BASE_URL + href, { waitUntil: 'networkidle' });
  await expect(page.locator('.content-header h1')).toContainText(/Edit order details/i);
}

/** Đổi trạng thái đơn hàng đang mở (có modal xác nhận) */
async function changeOrderStatus(page, statusValue) {
  await page.locator('#btnChangeOrderStatus').click();
  await expect(page.locator('#OrderStatusId')).toBeVisible({ timeout: 10000 });
  await page.locator('#OrderStatusId').selectOption(statusValue);
  await page.locator('#btnSaveOrderStatus').click();
  // nopCommerce hiển thị popup "Are you sure you want to perform this action?"
  const confirmBtn = page.locator('#btnSaveOrderStatus-action-confirmation-submit-button');
  await expect(confirmBtn).toBeVisible({ timeout: 10000 });
  await confirmBtn.click();
  await settle(page);
}

/** Parse chuỗi ngày dạng MM/DD/YYYY (có thể kèm giờ) */
function parseUsDate(text) {
  const m = String(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('QUẢN LÝ ĐƠN HÀNG (ORDERS)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await gotoOrderList(page);
  });

  // =========================================================================
  // NHÓM LỌC (FILTER) - 5 TEST CASE
  // =========================================================================

  test('TC_ORD_FILTER_01 - Lọc đơn hàng theo khoảng thời gian (Start date - End date)', async ({ page }) => {
    // Bước 2-3: nhập khoảng thời gian
    await page.locator('#StartDate').fill('2020-01-01');
    await page.locator('#EndDate').fill('2030-12-31');

    // Bước 4: nhấn Search
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    // Kỳ vọng: hai trường ngày giữ đúng giá trị đã nhập
    await expect(page.locator('#StartDate')).toHaveValue('2020-01-01');
    await expect(page.locator('#EndDate')).toHaveValue('2030-12-31');

    // Kỳ vọng: chỉ hiển thị các đơn có ngày tạo nằm trong khoảng lọc
    const createdOnList = await columnTexts(page, 'orders-grid', 7);
    expect(createdOnList.length).toBeGreaterThan(0);
    for (const text of createdOnList) {
      const createdOn = parseUsDate(text);
      expect(createdOn).not.toBeNull();
      expect(createdOn.getFullYear()).toBeGreaterThanOrEqual(2020);
      expect(createdOn.getFullYear()).toBeLessThanOrEqual(2030);
    }
  });

  test('TC_ORD_FILTER_02 - Lọc đơn hàng theo trạng thái đơn hàng (Order status)', async ({ page }) => {
    // Chọn một trạng thái thực tế CÓ dữ liệu trong danh sách mặc định
    // (demo có thể không có đơn Pending, nên không hard-code).
    const statusMap = { Pending: '10', Processing: '20', Complete: '30', Cancelled: '40' };
    const defaultStatuses = await columnTexts(page, 'orders-grid', 2);
    const target = defaultStatuses.find((s) => statusMap[s]);
    expect(target).toBeTruthy();
    const targetVal = statusMap[target];

    // Bước 2-3: lọc theo trạng thái đó
    await page.locator('#OrderStatusIds').selectOption([targetVal]);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#OrderStatusIds')).toHaveValues([targetVal]);
    const filtered = await columnTexts(page, 'orders-grid', 2);
    expect(filtered.length).toBeGreaterThan(0);
    for (const status of filtered) {
      expect(status).toMatch(new RegExp(target));
    }

    // Bước 4: chuyển sang "All" -> hiển thị lại toàn bộ (số lượng >= kết quả lọc)
    await page.locator('#OrderStatusIds').selectOption(['0']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');
    const allStatuses = await columnTexts(page, 'orders-grid', 2);
    expect(allStatuses.length).toBeGreaterThanOrEqual(filtered.length);
  });

  test('TC_ORD_FILTER_03 - Lọc đơn hàng theo trạng thái thanh toán (Payment status)', async ({ page }) => {
    // Bước 2-3: lọc Payment status = Paid
    await page.locator('#PaymentStatusIds').selectOption(['30']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#PaymentStatusIds')).toHaveValues(['30']);
    const paidStatuses = await columnTexts(page, 'orders-grid', 3);
    expect(paidStatuses.length).toBeGreaterThan(0);
    for (const status of paidStatuses) {
      expect(status).toMatch(/Paid/);
    }

    // Bước 4: đổi sang Refunded
    await page.locator('#PaymentStatusIds').selectOption(['40']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#PaymentStatusIds')).toHaveValues(['40']);
    const refundedStatuses = await columnTexts(page, 'orders-grid', 3);
    for (const status of refundedStatuses) {
      expect(status).toMatch(/Refunded/);
    }
    await expect(page.locator('#orders-grid')).not.toContainText('Paid');
  });

  test('TC_ORD_FILTER_04 - Lọc đơn hàng theo trạng thái giao hàng (Shipping status)', async ({ page }) => {
    // Bước 2-3: lọc Shipping status = Shipped
    await page.locator('#ShippingStatusIds').selectOption(['30']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#ShippingStatusIds')).toHaveValues(['30']);
    const shippedStatuses = await columnTexts(page, 'orders-grid', 4);
    expect(shippedStatuses.length).toBeGreaterThan(0);
    for (const status of shippedStatuses) {
      expect(status).toMatch(/Shipped/);
    }

    // Bước 4: đổi sang Delivered
    await page.locator('#ShippingStatusIds').selectOption(['40']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#ShippingStatusIds')).toHaveValues(['40']);
    const deliveredStatuses = await columnTexts(page, 'orders-grid', 4);
    expect(deliveredStatuses.length).toBeGreaterThan(0);
    for (const status of deliveredStatuses) {
      expect(status).toMatch(/Delivered/);
    }
  });

  test('TC_ORD_FILTER_05 - Kết hợp nhiều điều kiện lọc đơn hàng', async ({ page }) => {
    // Bước 2-3: nhập khoảng thời gian và chọn đồng thời 3 trạng thái
    await page.locator('#StartDate').fill('2020-01-01');
    await page.locator('#EndDate').fill('2030-12-31');
    await page.locator('#OrderStatusIds').selectOption(['20']); // Processing
    await page.locator('#PaymentStatusIds').selectOption(['30']); // Paid
    await page.locator('#ShippingStatusIds').selectOption(['30']); // Shipped

    // Bước 4: Search
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#StartDate')).toHaveValue('2020-01-01');
    await expect(page.locator('#EndDate')).toHaveValue('2030-12-31');

    const orderStatuses = await columnTexts(page, 'orders-grid', 2);
    const paymentStatuses = await columnTexts(page, 'orders-grid', 3);
    const shippingStatuses = await columnTexts(page, 'orders-grid', 4);
    const dates = await columnTexts(page, 'orders-grid', 7);
    expect(orderStatuses.length).toBeGreaterThan(0);
    for (let i = 0; i < orderStatuses.length; i++) {
      expect(orderStatuses[i]).toMatch(/Processing/);
      expect(paymentStatuses[i]).toMatch(/Paid/);
      expect(shippingStatuses[i]).toMatch(/Shipped/);
      const createdOn = parseUsDate(dates[i]);
      expect(createdOn.getFullYear()).toBeGreaterThanOrEqual(2020);
      expect(createdOn.getFullYear()).toBeLessThanOrEqual(2030);
    }

    // Xóa toàn bộ điều kiện và Search lại -> danh sách đầy đủ được khôi phục
    await page.locator('#OrderStatusIds').selectOption(['0']);
    await page.locator('#PaymentStatusIds').selectOption(['0']);
    await page.locator('#ShippingStatusIds').selectOption(['0']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');
    expect((await columnTexts(page, 'orders-grid', 1)).length).toBeGreaterThan(orderStatuses.length);
  });

  // =========================================================================
  // NHÓM TÌM KIẾM (SEARCH) - 5 TEST CASE
  // =========================================================================

  test('TC_ORD_SEARCH_06 - Tìm kiếm đơn hàng theo mã đơn hàng', async ({ page }) => {
    // Bước 2: lấy số đơn hàng có sẵn trên danh sách
    const orderNumber = (await page.locator('#orders-grid tbody tr').first().locator('td').nth(1).innerText()).trim();

    // Bước 2-3: nhập số đơn và nhấn Go
    await page.locator('#GoDirectlyToCustomOrderNumber').fill(orderNumber);
    await page.locator('#go-to-order-by-number').click();

    // Kỳ vọng: mở đúng trang chi tiết của đơn hàng
    await page.waitForURL(/\/Admin\/Order\/Edit\//, { timeout: 20000 });
    await expect(page.locator('.content-header h1')).toContainText(`Edit order details - ${orderNumber}`);
  });

  test('TC_ORD_SEARCH_07 - Tìm kiếm đơn hàng theo email khách hàng', async ({ page }) => {
    // Bước 2: lấy email khách hàng từ cột Customer của dòng đầu tiên
    const customerCell = await page.locator('#orders-grid tbody tr').first().locator('td').nth(5).innerText();
    const matched = customerCell.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    expect(matched).not.toBeNull();
    const email = matched[0];

    await page.locator('#BillingEmail').fill(email);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    // Kỳ vọng: trường nhận đúng email và chỉ trả về đơn của email đó
    await expect(page.locator('#BillingEmail')).toHaveValue(email);
    const customers = await columnTexts(page, 'orders-grid', 5);
    expect(customers.length).toBeGreaterThan(0);
    for (const customer of customers) {
      expect(customer).toContain(email);
    }
  });

  test('TC_ORD_SEARCH_08 - Tìm kiếm đơn hàng theo tên khách hàng (Billing last name)', async ({ page }) => {
    // Bước 2: lấy họ (last name) từ cột Customer
    const customerCell = await page.locator('#orders-grid tbody tr').first().locator('td').nth(5).innerText();
    const fullName = customerCell.split('\n')[0].trim();
    const lastName = fullName.split(/\s+/).pop();
    expect(lastName.length).toBeGreaterThan(0);

    await page.locator('#BillingLastName').fill(lastName);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    await expect(page.locator('#BillingLastName')).toHaveValue(lastName);
    const customers = await columnTexts(page, 'orders-grid', 5);
    expect(customers.length).toBeGreaterThan(0);
    for (const customer of customers) {
      expect(customer).toContain(lastName);
    }
  });

  test('TC_ORD_SEARCH_09 - Tìm kiếm đơn hàng theo tên sản phẩm (autocomplete)', async ({ page }) => {
    // Bước 2: nhập từ khóa vào trường Product
    await page.locator('#search-product-name').fill('a');

    // Bước 3: chọn sản phẩm từ danh sách gợi ý
    const suggestion = page.locator('.ui-autocomplete li, ul.ui-menu li').first();
    await suggestion.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await suggestion.count()) {
      await suggestion.click();
    }

    // Bước 4: Search
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    // Kỳ vọng: danh sách được lọc theo sản phẩm đã chọn, trang không lỗi
    await expect(page.locator('#orders-grid')).toBeVisible();
    await expect(page.locator('#orders-grid_info')).toContainText(/items|No records/i);
  });

  test('TC_ORD_SEARCH_10 - Hiển thị danh sách trống khi không tìm thấy đơn hàng', async ({ page }) => {
    // Bước 2-3: tìm với email chắc chắn không tồn tại
    await page.locator('#BillingEmail').fill(`khong_ton_tai_${Date.now()}@example.com`);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    // Kỳ vọng: bảng rỗng, có thông báo "No data available"
    await expect(page.locator('#orders-grid')).toContainText('No data available in table');

    // Bước 4: xóa từ khóa và Search lại -> danh sách đầy đủ được khôi phục
    await page.locator('#BillingEmail').fill('');
    await searchGrid(page, '/Admin/Order/', '#search-orders');
    expect(await dataRows(page, 'orders-grid').count()).toBeGreaterThan(0);
  });

  // =========================================================================
  // NHÓM XEM VÀ CẬP NHẬT (VIEW & UPDATE) - 5 TEST CASE
  // =========================================================================

  test('TC_ORD_VIEW_11 - Truy cập trang chi tiết đơn hàng từ danh sách', async ({ page }) => {
    const href = await firstOrderHref(page);

    // Bước 3: nhấn nút View của dòng đầu tiên
    await page.locator('#orders-grid tbody tr').first().locator('a:has-text("View")').click();

    // Kỳ vọng: mở trang Edit order details, có link quay lại danh sách
    await page.waitForURL(/\/Admin\/Order\/Edit\//, { timeout: 20000 });
    expect(page.url()).toContain(href);
    await expect(page.locator('a:has-text("back to order list")')).toBeVisible();
  });

  test('TC_ORD_VIEW_12 - Hiển thị chính xác thông tin chi tiết đơn hàng', async ({ page }) => {
    // Bước 2: ghi nhận thông tin đơn hàng trên danh sách
    const row = page.locator('#orders-grid tbody tr').first();
    const tds = row.locator('td');
    const orderNumber = (await tds.nth(1).innerText()).trim();
    const orderStatus = (await tds.nth(2).innerText()).trim();
    const paymentStatus = (await tds.nth(3).innerText()).trim();
    const shippingStatus = (await tds.nth(4).innerText()).trim();
    const customerCell = await tds.nth(5).innerText();
    const email = customerCell.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)[0];
    const createdOn = (await tds.nth(7).innerText()).trim();
    const total = (await tds.nth(8).innerText()).trim();

    // Bước 3: mở trang chi tiết
    await row.locator('a:has-text("View")').click();
    await page.waitForURL(/\/Admin\/Order\/Edit\//, { timeout: 20000 });

    // Bước 4: đối chiếu các trường thông tin
    const content = page.locator('.content');
    await expect(page.locator('.content-header h1')).toContainText(orderNumber);
    await expect(content).toContainText(email);
    await expect(content).toContainText(createdOn);
    await expect(content).toContainText(total);
    await expect(content).toContainText(orderStatus);
    await expect(content).toContainText(paymentStatus);
    await expect(content).toContainText(shippingStatus);
  });

  test('TC_ORD_UPDATE_13 - Cập nhật trạng thái đơn hàng', async ({ page }) => {
    await openOrder(page, await firstOrderHref(page));

    // Bước 2: mở dropdown đổi trạng thái và ghi nhận trạng thái hiện tại
    await page.locator('#btnChangeOrderStatus').click();
    await expect(page.locator('#OrderStatusId')).toBeVisible({ timeout: 10000 });
    const current = await page.locator('#OrderStatusId').inputValue();
    const targetValue = current === '20' ? '30' : '20'; // Processing <-> Complete
    const targetLabel = targetValue === '20' ? 'Processing' : 'Complete';

    // Bước 3-4: chọn trạng thái mới, Save và xác nhận
    await page.locator('#OrderStatusId').selectOption(targetValue);
    await page.locator('#btnSaveOrderStatus').click();
    await page.locator('#btnSaveOrderStatus-action-confirmation-submit-button').click();
    await settle(page);

    // Kỳ vọng: hệ thống lưu trạng thái mới (nopCommerce ghi nhận vào Order notes)
    await expect(page.locator('.content')).toContainText(new RegExp(`Order status\\s*${targetLabel}`));
    await expect(page.locator('#ordernotes-grid')).toContainText(new RegExp(`New status: ${targetLabel}`));
  });

  test('TC_ORD_UPDATE_14 - Cập nhật trạng thái thanh toán hoặc trạng thái giao hàng', async ({ page }) => {
    // Bước 1: tìm đơn hàng có Payment status = Pending
    await page.locator('#PaymentStatusIds').selectOption(['10']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');

    const pendingRows = dataRows(page, 'orders-grid');
    if ((await pendingRows.count()) === 0) {
      test.skip(true, 'Không còn đơn hàng nào ở trạng thái Payment = Pending để kiểm thử');
    }
    const pendingHref = await pendingRows.first().locator('a[href*="/Admin/Order/Edit/"]').first().getAttribute('href');
    await openOrder(page, pendingHref);

    // Bước 2: nhấn "Mark as paid" và xác nhận nếu có
    await expect(page.locator('#markorderaspaid')).toBeVisible();
    await page.locator('#markorderaspaid').click();
    const paidConfirm = page.locator('#markorderaspaid-action-confirmation-submit-button');
    await expect(paidConfirm).toBeVisible({ timeout: 10000 });
    await paidConfirm.click();
    await settle(page);

    // Bước 3: tải lại trang và kiểm tra Payment status
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.content')).toContainText(/Payment status\s*Paid/);

    // Bước 4: mở một đơn có thể giao hàng và nhấn "Add shipment"
    await gotoOrderList(page);
    const shippableRow = page
      .locator('#orders-grid tbody tr')
      .filter({ hasText: 'Not yet shipped' })
      .first();
    if (await shippableRow.count()) {
      await shippableRow.locator('a:has-text("View")').click();
      await page.waitForURL(/\/Admin\/Order\/Edit\//, { timeout: 20000 });
      if (await page.locator('#btnAddNewShipment').count()) {
        await page.locator('#btnAddNewShipment').click();
        await expect(page).toHaveURL(/Shipment/i, { timeout: 20000 });
      }
    }
  });

  test('TC_ORD_UPDATE_15 - Kiểm tra dữ liệu đơn hàng sau khi lưu thay đổi', async ({ page }) => {
    await openOrder(page, await firstOrderHref(page));

    // Bước 2-3: đổi trạng thái sang Complete và lưu
    await page.locator('#btnChangeOrderStatus').click();
    await expect(page.locator('#OrderStatusId')).toBeVisible({ timeout: 10000 });
    await page.locator('#OrderStatusId').selectOption('30');
    await page.locator('#btnSaveOrderStatus').click();
    await page.locator('#btnSaveOrderStatus-action-confirmation-submit-button').click();
    await settle(page);

    // Bước 4: tải lại trang và kiểm tra giá trị mới vẫn được giữ
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.content')).toContainText(/Order status\s*Complete/);
  });

  test('TC_ORD_INVOICE_16 - Tải hóa đơn PDF', async ({ page }) => {
    await openOrder(page, await firstOrderHref(page));

    // Bước 2-3: nhấn "Invoice (PDF)" và chờ file tải xuống
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('a[href*="PdfInvoice"]').first().click();
    const download = await downloadPromise;

    // Kỳ vọng: tệp tải xuống là PDF
    expect(download.suggestedFilename().toLowerCase()).toContain('.pdf');
  });

  test('TC_ORD_DELETE_17 - Hiển thị popup xác nhận xóa đơn hàng', async ({ page }) => {
    await openOrder(page, await firstOrderHref(page));
    const currentUrl = page.url();

    // Bước 2: nhấn Delete
    await page.locator('#order-delete').click();
    const modal = page.locator('#ordermodel-Delete-delete-confirmation');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Are you sure you want to delete this item?');
    await expect(modal).toContainText('No, cancel');
    await expect(modal).toContainText('Delete');

    // Bước 3: nhấn Cancel -> popup đóng, thao tác xóa bị hủy
    await modal.locator('span:has-text("No, cancel")').click();
    await expect(modal).toBeHidden({ timeout: 10000 });
    expect(page.url()).toBe(currentUrl);
    await expect(page.locator('.content-header h1')).toContainText(/Edit order details/i);
  });

  test('TC_ORD_IMPORT_18 - Nhập dữ liệu đơn hàng từ file Excel', async ({ page }) => {
    // Bước 1: tạo file Excel đúng mẫu của hệ thống bằng chức năng Export
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('button[name="exportexcel-all"]').evaluate((el) => el.click());
    const download = await downloadPromise;
    const filePath = test.info().outputPath(`orders-${Date.now()}.xlsx`);
    await download.saveAs(filePath);

    // Bước 2: mở modal Import
    await page.locator('button:has-text("Import")').first().click();
    const modal = page.locator('#importexcel-window');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Import from Excel');

    // Bước 3: chọn file Excel
    await page.setInputFiles('#importexcelfile', filePath);
    await expect(page.locator('#importexcelfile')).toHaveValue(/orders-\d+\.xlsx$/);

    // Bước 4: nhấn Import from Excel và kiểm tra hệ thống xử lý file
    await modal.locator('button:has-text("Import from Excel")').last().click();
    await expect(page.locator('.alert').first()).toContainText(/imported successfully/i, { timeout: 30000 });
    await expect(page).toHaveURL(/\/Admin\/Order\/List/);
    await expect(page.locator('#orders-grid')).toBeVisible();
  });

  test('TC_ORD_PAGE_19 - Phân trang danh sách đơn hàng', async ({ page }) => {
    // Bước 2: ghi nhận thông tin "Showing 1 to N of X entries"
    const info = page.locator('#orders-grid_info');
    await expect(info).toContainText(/1-\d+ of \d+ items/i);

    // Bước 3: thay đổi số dòng hiển thị mỗi trang
    await page.locator('#dt-length-0').selectOption('15');
    await settle(page);
    await expect(info).toContainText(/1-\d+ of \d+ items/i);

    // Bước 4: chuyển trang nếu có trang tiếp theo
    const next = page.locator('#orders-grid_next');
    if ((await next.count()) > 0) {
      const nextClass = (await next.getAttribute('class')) || '';
      if (!nextClass.includes('disabled')) {
        await next.locator('a').click();
        await settle(page);
      }
    }
    await expect(page.locator('#orders-grid')).toBeVisible();
  });

  test('TC_ORD_FILTER_20 - Hiển thị đúng tập đơn hàng khi thay đổi điều kiện lọc', async ({ page }) => {
    // Bước 2: lọc Complete
    await page.locator('#OrderStatusIds').selectOption(['30']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');
    const completeStatuses = await columnTexts(page, 'orders-grid', 2);
    for (const status of completeStatuses) {
      expect(status).toMatch(/Complete/);
    }

    // Bước 3: đổi sang Pending -> danh sách được làm mới, không còn đơn Complete
    await page.locator('#OrderStatusIds').selectOption(['10']);
    await searchGrid(page, '/Admin/Order/', '#search-orders');
    const pendingStatuses = await columnTexts(page, 'orders-grid', 2);
    for (const status of pendingStatuses) {
      expect(status).toMatch(/Pending/);
    }
    await expect(page.locator('#orders-grid')).not.toContainText('Complete');
  });
});
