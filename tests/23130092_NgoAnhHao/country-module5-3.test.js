import { test, expect } from '@playwright/test';

// ---------- Helpers ----------
const LIST_URL = '/Admin/Country/List';
const CREATE_URL = '/Admin/Country/Create';

/** Tạo mã ISO ngẫu nhiên (chỉ gồm chữ cái in hoa) để tránh trùng lặp khi chạy song song */
function randomLetters(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/** Đăng nhập Admin nopCommerce */
async function loginAdmin(page) {
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    const emailInput = page.locator('#Email, input[name="Email"]').first();
    const passInput = page.locator('#Password, input[name="Password"]').first();
    await emailInput.fill(process.env.ADMIN_EMAIL || 'admin@yourstore.com');
    await passInput.fill(process.env.ADMIN_PASSWORD || 'admin123');
    await page.locator('form button.login-button').click();
    const loginError = page.locator('.message-error');
    await Promise.race([
      page.waitForURL(/\/Admin/i, { timeout: 15000 }),
      loginError.waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
        throw new Error(`Đăng nhập Admin thất bại: ${(await loginError.innerText()).replace(/\s+/g, ' ')} -> hãy sửa ADMIN_EMAIL / ADMIN_PASSWORD`);
      }),
    ]);
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
  }
  await page.locator('#countries-grid').waitFor({ state: 'visible', timeout: 15000 });
}

/** Điền giá trị cho Kendo NumericTextBox hoặc input số thông thường */
async function fillNumericField(page, selector, value) {
  const input = page.locator(selector).first();
  const kendoWrapper = input.locator('..').locator('.k-formatted-value');
  if ((await kendoWrapper.count()) > 0 && (await kendoWrapper.isVisible())) {
    await kendoWrapper.click();
  }
  await input.fill(String(value), { force: true });
  await input.blur().catch(() => {});
}

/** Tạo nhanh 1 quốc gia tạm thời hợp lệ để phục vụ các test Edit / Delete / States */
async function createTempCountry(page, prefix = 'TestCountry') {
  const name = `${prefix}_${Date.now()}_${randomLetters(3)}`;
  const iso2 = randomLetters(2);
  const iso3 = randomLetters(3);
  const numIso = Math.floor(100 + Math.random() * 899);

  await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#Name').fill(name);
  await page.locator('#TwoLetterIsoCode').fill(iso2);
  await page.locator('#ThreeLetterIsoCode').fill(iso3);
  await fillNumericField(page, '#NumericIsoCode', numIso);
  await fillNumericField(page, '#DisplayOrder', 1);
  await page.locator('button[name="save-continue"]').click();

  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
  return { name, iso2, iso3, numIso, editUrl: page.url() };
}

test.describe('Country & States Management Module (TS-Module5-3)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  // ================= DISPLAY & BATCH ACTIONS (REQ-CTRY-01 -> 04) =================

  test('TC_CTRY_LIST_01 - Hiển thị đúng bảng danh sách quốc gia với đầy đủ các cột tại /Admin/Country/List', async ({ page }) => {
    const grid = page.locator('#countries-grid');
    await expect(grid).toBeVisible();

    const header = grid.locator('thead');
    for (const col of [
      'Name',
      'Allows billing',
      'Allows shipping',
      'Two letter ISO code',
      'Three letter ISO code',
      'Numeric ISO code',
      'Subject to VAT',
      'Number of states',
      'Display order',
      'Published'
    ]) {
      await expect(header).toContainText(new RegExp(col, 'i'));
    }
    await expect(grid.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_CTRY_LIST_02 - Phân trang danh sách quốc gia và thay đổi số lượng bản ghi hiển thị (Show items)', async ({ page }) => {
    const lengthSelect = page.locator('select[name="countries-grid_length"], .dataTables_length select').first();
    await expect(lengthSelect).toBeVisible();

    await lengthSelect.selectOption('7');
    await expect(lengthSelect).toHaveValue('7');

    await lengthSelect.selectOption('15');
    await expect(lengthSelect).toHaveValue('15');
    await expect(page.locator('#countries-grid tbody tr').first()).toBeVisible();
  });

  test('TC_CTRY_LIST_03 - Xuất bản hàng loạt các quốc gia được tick chọn bằng nút [Publish selected]', async ({ page }) => {
    const firstCheckbox = page.locator('#countries-grid tbody input.checkboxGroups, #countries-grid tbody input[name="checkbox_countries"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 10000 });
    await firstCheckbox.check();

    await page.locator('#publish-selected').click();
    await expect(page.locator('#countries-grid tbody tr').first().locator('i.true-icon, i[nop-value="true"]').last()).toBeVisible({ timeout: 10000 });
  });

  test('TC_CTRY_LIST_04 - Ngưng xuất bản hàng loạt các quốc gia được tick chọn bằng nút [Unpublish selected]', async ({ page }) => {
    // Tạo 1 quốc gia tạm để test Unpublish mà không ảnh hưởng tới US/Canada đang dùng cho Storefront
    const { name } = await createTempCountry(page, 'UnpubCountry');
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });

    const lengthSelect = page.locator('select[name="countries-grid_length"], .dataTables_length select').first();
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption('100');
    }

    const row = page.locator('#countries-grid tbody tr', { hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('input.checkboxGroups, input[type="checkbox"]').first().check();

    await page.locator('#unpublish-selected').click();
    await expect(row.locator('i.false-icon, i[nop-value="false"]')).toBeVisible({ timeout: 10000 });
  });

  // ================= INSERT COUNTRY (REQ-CTRY-05 -> 09) =================

  test('TC_CTRY_ADD_05 - Báo lỗi khi bỏ trống trường bắt buộc Name (*)', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Name').fill('');
    await page.locator('#TwoLetterIsoCode').fill('VN');
    await page.locator('#ThreeLetterIsoCode').fill('VNM');
    await page.locator('button[name="save"]').click();

    const err = page.locator('#Name-error, span[data-valmsg-for="Name"], .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_CTRY_ADD_06 - Báo lỗi khi bỏ trống hoặc nhập sai định dạng Two letter ISO code (khác 2 ký tự)', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Name').fill('Test ISO2 Country');
    await page.locator('#TwoLetterIsoCode').fill('A'); // Chỉ 1 ký tự -> không hợp lệ
    await page.locator('#ThreeLetterIsoCode').fill('ABC');
    await page.locator('button[name="save"]').click();

    const err = page.locator('#TwoLetterIsoCode-error, span[data-valmsg-for="TwoLetterIsoCode"], .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_CTRY_ADD_07 - Báo lỗi khi bỏ trống hoặc nhập sai định dạng Three letter ISO code (khác 3 ký tự)', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Name').fill('Test ISO3 Country');
    await page.locator('#TwoLetterIsoCode').fill('AB');
    await page.locator('#ThreeLetterIsoCode').fill('AB'); // Chỉ 2 ký tự -> không hợp lệ
    await page.locator('button[name="save"]').click();

    const err = page.locator('#ThreeLetterIsoCode-error, span[data-valmsg-for="ThreeLetterIsoCode"], .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_CTRY_ADD_08 - Trường Numeric ISO code và Display order chỉ chấp nhận định dạng số', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    await fillNumericField(page, '#NumericIsoCode', 704);
    await fillNumericField(page, '#DisplayOrder', 5);

    await expect(page.locator('#NumericIsoCode')).toHaveValue('704');
    await expect(page.locator('#DisplayOrder')).toHaveValue('5');
  });

  test('TC_CTRY_ADD_09 - Thêm mới quốc gia thành công khi nhập đầy đủ dữ liệu hợp lệ', async ({ page }) => {
    const name = `NewCountry_${Date.now()}`;
    const iso2 = randomLetters(2);
    const iso3 = randomLetters(3);

    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Name').fill(name);
    await page.locator('#TwoLetterIsoCode').fill(iso2);
    await page.locator('#ThreeLetterIsoCode').fill(iso3);
    await fillNumericField(page, '#NumericIsoCode', 888);
    await fillNumericField(page, '#DisplayOrder', 1);
    await page.locator('button[name="save"]').click();

    await expect(page).toHaveURL(/\/Admin\/Country\/List/i, { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText(/added successfully/i);
  });

  // ================= UPDATE COUNTRY & CONFIGURATION (REQ-CTRY-10 -> 14) =================

  test('TC_CTRY_EDIT_10 - Cập nhật Tên, Mã ISO và Thứ tự hiển thị (Display order) của quốc gia', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'Edit10');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    const updatedName = `Updated_${Date.now()}`;
    const newIso2 = randomLetters(2);
    const newIso3 = randomLetters(3);

    await page.locator('#Name').fill(updatedName);
    await page.locator('#TwoLetterIsoCode').fill(newIso2);
    await page.locator('#ThreeLetterIsoCode').fill(newIso3);
    await fillNumericField(page, '#DisplayOrder', 9);
    await page.locator('button[name="save-continue"]').click();

    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
    await expect(page.locator('#Name')).toHaveValue(updatedName);
    await expect(page.locator('#TwoLetterIsoCode')).toHaveValue(newIso2);
    await expect(page.locator('#ThreeLetterIsoCode')).toHaveValue(newIso3);
    await expect(page.locator('#DisplayOrder')).toHaveValue('9');
  });

  test('TC_CTRY_EDIT_11 - Bật/tắt các cấu hình [Allows billing], [Allows shipping] và [Subject to VAT]', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'Edit11');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#AllowsBilling').uncheck();
    await page.locator('#AllowsShipping').uncheck();
    await page.locator('#SubjectToVat').check();
    await page.locator('button[name="save-continue"]').click();

    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
    await expect(page.locator('#AllowsBilling')).not.toBeChecked();
    await expect(page.locator('#AllowsShipping')).not.toBeChecked();
    await expect(page.locator('#SubjectToVat')).toBeChecked();
  });

  test('TC_CTRY_EDIT_12 - Thay đổi trạng thái xuất bản [Published] của quốc gia', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'Edit12');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#Published').uncheck();
    await page.locator('button[name="save-continue"]').click();

    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
    await expect(page.locator('#Published')).not.toBeChecked();
  });

  test('TC_CTRY_EDIT_13 - Nút [Save and Continue Edit] lưu thông tin và giữ nguyên giao diện chỉnh sửa', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'Edit13');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#Name').fill(`KeepEdit_${Date.now()}`);
    await page.locator('button[name="save-continue"]').click();

    await expect(page).toHaveURL(/\/Admin\/Country\/Edit\/\d+/i);
    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
  });

  test('TC_CTRY_EDIT_14 - Xóa đơn lẻ quốc gia bằng nút [Delete] ngay trong trang chi tiết kèm popup xác nhận', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'Del14');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#country-delete').click();
    const modal = page.locator('#country-delete-confirmation, .modal.show').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('button[type="submit"], button.bg-red, button.btn-danger').first().click();

    await expect(page).toHaveURL(/\/Admin\/Country\/List/i, { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText(/deleted successfully/i);
  });

  // ================= STATES & PROVINCES MANAGEMENT (REQ-CTRY-15 -> 20) =================

  test('TC_CTRY_STATE_15 - Hiển thị danh sách Bang/Tỉnh thành (States and provinces) thuộc quốc gia trong thẻ thông tin', async ({ page }) => {
    // Mở quốc gia đầu tiên (United States) để kiểm tra bảng States and provinces
    const firstEdit = page.locator('#countries-grid tbody tr a[href*="/Admin/Country/Edit/"]').first();
    await firstEdit.click();

    const statesCard = page.locator('#country-states');
    if ((await statesCard.count()) > 0 && (await statesCard.getAttribute('class'))?.includes('collapsed-card')) {
      await statesCard.locator('.card-header').click();
    }

    const statesGrid = page.locator('#states-grid');
    await expect(statesGrid).toBeVisible({ timeout: 10000 });

    const header = statesGrid.locator('thead');
    for (const col of ['Name', 'Abbreviation', 'Published', 'Display order']) {
      await expect(header).toContainText(new RegExp(col, 'i'));
    }
  });

  test('TC_CTRY_STATE_16 - Thống kê chính xác số lượng tỉnh thành tại cột [Number of states] ở bảng danh sách ngoài', async ({ page }) => {
    const { name } = await createTempCountry(page, 'StateCount');
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });

    const lengthSelect = page.locator('select[name="countries-grid_length"], .dataTables_length select').first();
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption('100');
    }

    const row = page.locator('#countries-grid tbody tr', { hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    // Quốc gia mới tạo chưa có bang/tỉnh thành nào -> cột Number of states = 0
    await expect(row).toContainText('0');
  });

  test('TC_CTRY_STATE_17 - Thêm mới Bang/Tỉnh thành qua cửa sổ Popup [Add new state/province] và kiểm tra trường bắt buộc Name', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'StatePopup');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    const statesCard = page.locator('#country-states');
    if ((await statesCard.count()) > 0 && (await statesCard.getAttribute('class'))?.includes('collapsed-card')) {
      await statesCard.locator('.card-header').click();
    }

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#btnAddNewState').click()
    ]);
    await popup.waitForLoadState('domcontentloaded');

    // 1. Thử lưu khi bỏ trống Name -> báo lỗi
    await popup.locator('#Name').fill('');
    await popup.locator('button[name="save"]').click();
    await expect(popup.locator('#Name-error, span[data-valmsg-for="Name"], .validation-summary-errors').first()).toBeVisible({ timeout: 10000 });

    // 2. Điền đầy đủ thông tin hợp lệ -> Lưu thành công và đóng popup
    const stateName = `Hanoi_${Date.now()}`;
    await popup.locator('#Name').fill(stateName);
    await popup.locator('#Abbreviation').fill('HN');
    await Promise.all([
      popup.waitForEvent('close'),
      popup.locator('button[name="save"]').click()
    ]);

    await expect(page.locator('#states-grid')).toContainText(stateName, { timeout: 10000 });
  });

  test('TC_CTRY_STATE_18 - Cho phép xóa Bang/Tỉnh thành khỏi quốc gia', async ({ page }) => {
    const { editUrl } = await createTempCountry(page, 'StateDel');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    const statesCard = page.locator('#country-states');
    if ((await statesCard.count()) > 0 && (await statesCard.getAttribute('class'))?.includes('collapsed-card')) {
      await statesCard.locator('.card-header').click();
    }

    // Thêm 1 tỉnh thành tạm để xóa
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#btnAddNewState').click()
    ]);
    await popup.waitForLoadState('domcontentloaded');
    const stateName = `TempState_${Date.now()}`;
    await popup.locator('#Name').fill(stateName);
    await Promise.all([
      popup.waitForEvent('close'),
      popup.locator('button[name="save"]').click()
    ]);

    const stateRow = page.locator('#states-grid tbody tr', { hasText: stateName });
    await expect(stateRow).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());
    await stateRow.locator('a.btn-default, a[href*="Delete"], button').last().click();

    const confirmBtn = page.locator('.modal.show button[type="submit"], .modal.show button.btn-danger, .modal.show button.bg-red').first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.locator('#states-grid tbody tr', { hasText: stateName })).toHaveCount(0, { timeout: 10000 });
  });

  test('TC_CTRY_CSV_19 - Xuất danh sách Bang/Tỉnh thành ra file CSV bằng nút [Export states to CSV]', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('button[name="exportcsv"], a[href*="ExportCsv"]').first().click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.(csv|txt)$/i);
  });

  test('TC_CTRY_CSV_20 - Hiển thị popup nhập danh sách Bang/Tỉnh thành từ file CSV bằng nút [Import states from CSV]', async ({ page }) => {
    await page.locator('button[name="importcsv"], button[data-target="#importcsv-window"]').first().click();

    const modal = page.locator('#importcsv-window');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('input[type="file"][name="importcsvfile"]')).toBeVisible();
  });

});
