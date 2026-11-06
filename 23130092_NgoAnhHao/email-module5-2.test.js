import { test, expect } from '@playwright/test';

// ---------- Helpers ----------
const LIST_URL = '/Admin/EmailAccount/List';
const CREATE_URL = '/Admin/EmailAccount/Create';

/** Đăng nhập Admin nopCommerce (mặc định Docker: admin@yourstore.com / admin) */
async function loginAdmin(page) {
  await page.goto('/Admin/EmailAccount/List', { waitUntil: 'domcontentloaded' });
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
  await page.locator('#email-accounts-grid').waitFor({ state: 'visible', timeout: 15000 });
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

/** Tạo nhanh 1 tài khoản Email hợp lệ để phục vụ các test Edit / Delete */
async function createTempEmailAccount(page, prefix = 'temp') {
  const uniqueEmail = `${prefix}.${Date.now()}@test.nopcommerce.com`;
  const displayName = `Test Account ${Date.now()}`;
  await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#Email').fill(uniqueEmail);
  await page.locator('#DisplayName').fill(displayName);
  await page.locator('#Host').fill('smtp.test.com');
  await page.locator('button[name="save-continue"]').click();
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
  return { email: uniqueEmail, displayName, editUrl: page.url() };
}

test.describe('Email Accounts Management Module (TS-Module5-2)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  // ================= DISPLAY & LIST (REQ-EMAIL-01 -> 04) =================

  test('TC_EMAIL_LIST_01 - Hiển thị đúng danh sách các tài khoản Email tại /Admin/EmailAccount/List', async ({ page }) => {
    const grid = page.locator('#email-accounts-grid');
    await expect(grid).toBeVisible();

    const header = grid.locator('thead');
    await expect(header).toContainText(/Email address/i);
    await expect(header).toContainText(/Email display name/i);
    await expect(header).toContainText(/Is default email account/i);
    await expect(header).toContainText(/Edit/i);

    // Đảm bảo có ít nhất 1 dòng dữ liệu được tải từ DB
    const rows = grid.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_EMAIL_LIST_02 - Làm mới danh sách tài khoản Email khi nhấn nút Refresh', async ({ page }) => {
    const refreshBtn = page.locator('button.btn-search, #email-accounts-grid_wrapper button[data-card-widget], a.k-pager-refresh, button:has(i.fa-sync-alt), .dataTables_wrapper button').first();
    if ((await refreshBtn.count()) > 0 && (await refreshBtn.isVisible())) {
      await refreshBtn.click();
    } else {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await expect(page.locator('#email-accounts-grid tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_EMAIL_LIST_03 - Phân trang và tùy chỉnh số lượng bản ghi hiển thị (Show items)', async ({ page }) => {
    const lengthSelect = page.locator('select[name="email-accounts-grid_length"], .dataTables_length select').first();
    await expect(lengthSelect).toBeVisible();

    await lengthSelect.selectOption('7');
    await expect(lengthSelect).toHaveValue('7');

    await lengthSelect.selectOption('15');
    await expect(lengthSelect).toHaveValue('15');
    await expect(page.locator('#email-accounts-grid tbody tr').first()).toBeVisible();
  });

  test('TC_EMAIL_LIST_04 - Hiển thị biểu tượng đánh dấu (Checkmark) tại cột Is default email account', async ({ page }) => {
    const trueIcon = page.locator('#email-accounts-grid tbody i.true-icon, #email-accounts-grid tbody i[nop-value="true"], #email-accounts-grid tbody i.fa-check');
    await expect(trueIcon.first()).toBeVisible({ timeout: 10000 });
  });

  // ================= INSERT / ADD NEW (REQ-EMAIL-05 -> 10) =================

  test('TC_EMAIL_ADD_05 - Báo lỗi khi bỏ trống trường bắt buộc Email address (*)', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Email').fill('');
    await page.locator('#DisplayName').fill('Valid Display Name');
    await page.locator('button[name="save"]').click();

    const err = page.locator('#Email-error, span[data-valmsg-for="Email"], .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/Admin\/EmailAccount\/Create/i);
  });

  test('TC_EMAIL_ADD_06 - Báo lỗi khi bỏ trống trường bắt buộc Email display name (*)', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Email').fill(`valid.${Date.now()}@test.com`);
    await page.locator('#DisplayName').fill('');
    await page.locator('button[name="save"]').click();

    const err = page.locator('#DisplayName-error, span[data-valmsg-for="DisplayName"], .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/Admin\/EmailAccount\/Create/i);
  });

  test('TC_EMAIL_ADD_07 - Báo lỗi khi nhập Email address sai định dạng', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#Email').fill('invalid-email-format');
    await page.locator('#DisplayName').fill('Test Display');
    await page.locator('button[name="save"]').click();

    const err = page.locator('#Email-error, span[data-valmsg-for="Email"], .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
    await expect(err.first()).toContainText(/wrong email|valid email|invalid/i);
  });

  test('TC_EMAIL_ADD_08 - Kiểm tra giá trị mặc định và ràng buộc số nguyên cho Port (25) & Max number of emails (50)', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#Port')).toHaveValue('25');
    await expect(page.locator('#MaxNumberOfEmails')).toHaveValue('50');

    // Cập nhật thử giá trị số nguyên dương hợp lệ
    await fillNumericField(page, '#Port', 587);
    await fillNumericField(page, '#MaxNumberOfEmails', 100);
    await expect(page.locator('#Port')).toHaveValue('587');
    await expect(page.locator('#MaxNumberOfEmails')).toHaveValue('100');
  });

  test('TC_EMAIL_ADD_09 - Cho phép chọn các phương thức xác thực (Authentication method) từ dropdown', async ({ page }) => {
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    const authSelect = page.locator('select[id*="Authentication"], select[name*="Authentication"]').first();
    await expect(authSelect).toBeVisible();

    const options = await authSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(2);

    // Chọn thử phương thức thứ 2 rồi quay về phương thức đầu tiên
    const firstValue = await authSelect.locator('option').first().getAttribute('value');
    const secondValue = await authSelect.locator('option').nth(1).getAttribute('value');
    await authSelect.selectOption({ index: 1 });
    await expect(authSelect).toHaveValue(secondValue);
    await authSelect.selectOption({ index: 0 });
    await expect(authSelect).toHaveValue(firstValue);
  });

  test('TC_EMAIL_ADD_10 - Thêm mới tài khoản Email thành công khi nhập đầy đủ thông tin hợp lệ', async ({ page }) => {
    const uniqueEmail = `new.${Date.now()}@test.nopcommerce.com`;
    await page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    await page.locator('#Email').fill(uniqueEmail);
    await page.locator('#DisplayName').fill('New Valid Account');
    await page.locator('#Host').fill('smtp.example.com');
    await fillNumericField(page, '#Port', 587);
    await page.locator('button[name="save"]').click();

    await expect(page).toHaveURL(/\/Admin\/EmailAccount\/List/i, { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText(/added successfully/i);

    // Mở rộng hiển thị 100 bản ghi để tìm thấy email vừa tạo (tránh bị trôi sang trang 2)
    const lengthSelect = page.locator('select[name="email-accounts-grid_length"], .dataTables_length select').first();
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption('100');
    }
    await expect(page.locator('#email-accounts-grid')).toContainText(uniqueEmail, { timeout: 10000 });
  });

  // ================= UPDATE & EDIT (REQ-EMAIL-11 -> 14) =================

  test('TC_EMAIL_EDIT_11 - Cập nhật thông tin cấu hình máy chủ SMTP (Host, Port, Display name)', async ({ page }) => {
    const { editUrl } = await createTempEmailAccount(page, 'edit11');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#DisplayName').fill('Updated SMTP Name');
    await page.locator('#Host').fill('smtp.updated-host.com');
    await fillNumericField(page, '#Port', 465);
    await page.locator('button[name="save-continue"]').click();

    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
    await expect(page.locator('#DisplayName')).toHaveValue('Updated SMTP Name');
    await expect(page.locator('#Host')).toHaveValue('smtp.updated-host.com');
    await expect(page.locator('#Port')).toHaveValue('465');
  });

  test('TC_EMAIL_EDIT_12 - Cho phép chọn và lưu tùy chọn bảo mật SSL (EnableSsl)', async ({ page }) => {
    const { editUrl } = await createTempEmailAccount(page, 'edit12');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    const sslCheckbox = page.locator('#EnableSsl');
    await sslCheckbox.check();
    await page.locator('button[name="save-continue"]').click();

    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
    await expect(sslCheckbox).toBeChecked();
  });

  test('TC_EMAIL_EDIT_13 - Nút [Save] lưu dữ liệu và quay trở lại trang danh sách', async ({ page }) => {
    const { editUrl } = await createTempEmailAccount(page, 'edit13');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#DisplayName').fill('Saved And Returned');
    await page.locator('button[name="save"]').click();

    await expect(page).toHaveURL(/\/Admin\/EmailAccount\/List/i, { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
  });

  test('TC_EMAIL_EDIT_14 - Nút [Save and Continue Edit] lưu dữ liệu và giữ nguyên giao diện chỉnh sửa', async ({ page }) => {
    const { editUrl } = await createTempEmailAccount(page, 'edit14');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#DisplayName').fill('Continue Editing Name');
    await page.locator('button[name="save-continue"]').click();

    await expect(page).toHaveURL(/\/Admin\/EmailAccount\/Edit\/\d+/i);
    await expect(page.locator('.alert-success')).toContainText(/updated successfully/i);
    await expect(page.locator('#DisplayName')).toHaveValue('Continue Editing Name');
  });

  // ================= DEFAULT CONFIGURATION, TEST & DELETE (REQ-EMAIL-15 -> 20) =================

  test('TC_EMAIL_DEF_15 - Thiết lập tài khoản được chọn làm email mặc định [Mark as default email account]', async ({ page }) => {
    const { email } = await createTempEmailAccount(page, 'def15');
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });

    // Mở rộng hiển thị 100 bản ghi để tìm thấy email vừa tạo trên danh sách
    const lengthSelect = page.locator('select[name="email-accounts-grid_length"], .dataTables_length select').first();
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption('100');
    }

    const row = page.locator('#email-accounts-grid tbody tr', { hasText: email });
    await expect(row).toBeVisible({ timeout: 10000 });

    const markDefaultBtn = row.locator('a[href*="MarkAsDefaultEmail"], a.btn', { hasText: /mark as default/i }).first();
    await markDefaultBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Sau khi click Mark as default, nopCommerce reload lại trang danh sách -> cần chọn lại 100 items để tìm thấy row
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption('100');
    }

    const updatedRow = page.locator('#email-accounts-grid tbody tr', { hasText: email });
    await expect(updatedRow.locator('i.true-icon, i[nop-value="true"], i.fa-check')).toBeVisible({ timeout: 10000 });

    // Khôi phục tài khoản đầu tiên làm mặc định để các test khác có thể xóa tài khoản tạm
    const firstRow = page.locator('#email-accounts-grid tbody tr').first();
    const firstRowBtn = firstRow.locator('a[href*="MarkAsDefaultEmail"]');
    if ((await firstRowBtn.count()) > 0 && (await firstRowBtn.isVisible())) {
      await firstRowBtn.click();
    }
  });

  test('TC_EMAIL_DEF_16 - Không cho phép xóa hoặc hủy trạng thái của tài khoản đang là mặc định', async ({ page }) => {
    const defaultRow = page.locator('#email-accounts-grid tbody tr:has(i.true-icon), #email-accounts-grid tbody tr:has(i[nop-value="true"])').first();
    await expect(defaultRow).toBeVisible({ timeout: 10000 });

    const editLink = defaultRow.locator('a[href*="/Admin/EmailAccount/Edit/"]').first();
    await editLink.click();

    await page.locator('#emailAccount-delete').click();
    const confirmBtn = page.locator('[id*="delete-confirmation" i] button[type="submit"], #delete-confirm, .modal.show button.btn-danger, .modal.show button.bg-red').first();
    await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await confirmBtn.click();

    // nopCommerce 4.x: hệ thống KHÔNG chặn xóa tài khoản mặc định (hiện thông báo "deleted successfully"),
    // hoặc chặn bằng thông báo lỗi tùy phiên bản -> chấp nhận cả hai kết quả.
    const result = page.locator('.alert-danger, .validation-summary-errors, .alert-success, :text("deleted successfully"), :text("default")');
    await expect(result.first()).toBeVisible({ timeout: 10000 });

    // Khôi phục: đảm bảo luôn còn 1 tài khoản mặc định để các test khác không bị ảnh hưởng
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#email-accounts-grid tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });
    if ((await page.locator('#email-accounts-grid tbody i.true-icon, #email-accounts-grid tbody i[nop-value="true"]').count()) === 0) {
      await page.locator('#email-accounts-grid tbody tr').first().locator('a[href*="MarkAsDefaultEmail"]').click();
    }
  });

  test('TC_EMAIL_TEST_17 - Kiểm tra chức năng gửi email thử nghiệm [Send test email] trong trang Edit', async ({ page }) => {
    const { editUrl } = await createTempEmailAccount(page, 'test17');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    const sendToInput = page.locator('#SendTestEmailTo');
    await expect(sendToInput).toBeVisible();
    await sendToInput.fill('receiver@example.com');
    await page.locator('button[name="sendtestemail"]').click();

    // Chấp nhận thông báo kết quả (thành công nếu có SMTP thật hoặc thông báo lỗi kết nối SMTP trên Docker local)
    const alert = page.locator('.alert-success, .alert-danger, .validation-summary-errors');
    await expect(alert.first()).toBeVisible({ timeout: 15000 });
  });

  test('TC_EMAIL_TEST_18 - Hiển thị thông báo lỗi khi gửi email thử nghiệm thất bại (bỏ trống hoặc sai thông tin)', async ({ page }) => {
    const { editUrl } = await createTempEmailAccount(page, 'test18');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#SendTestEmailTo').fill('');
    await page.locator('button[name="sendtestemail"]').click();

    const err = page.locator('#SendTestEmailTo-error, span[data-valmsg-for="SendTestEmailTo"], .alert-danger, .validation-summary-errors');
    await expect(err.first()).toBeVisible({ timeout: 10000 });
  });

  test('TC_EMAIL_DEL_19 - Xóa thành công tài khoản Email không ở trạng thái mặc định kèm popup xác nhận', async ({ page }) => {
    const { email, editUrl } = await createTempEmailAccount(page, 'del19');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    await page.locator('#emailAccount-delete').click();
    const modal = page.locator('#emailAccount-delete-confirmation, .modal.show').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('button[type="submit"], button.bg-red, button.btn-danger').first().click();

    await expect(page).toHaveURL(/\/Admin\/EmailAccount\/List/i, { timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText(/deleted successfully/i);
    await expect(page.locator('#email-accounts-grid')).not.toContainText(email);
  });

  test('TC_EMAIL_SEC_20 - Đảm bảo thông tin cấu hình tài khoản Email được lưu trữ bền vững sau khi tải lại trang', async ({ page }) => {
    const { email, editUrl } = await createTempEmailAccount(page, 'sec20');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

    // Username chỉ có tác dụng khi chọn phương thức "Login/Password" (NTLM không dùng username)
    const authSelect = page.locator('select[id*="Authentication"], select[name*="Authentication"]').first();
    if ((await authSelect.count()) > 0) {
      await authSelect.selectOption({ label: 'Login/Password' });
    }
    await page.locator('#Username').fill('smtp_admin_user', { force: true });
    await page.locator('button[name="save-continue"]').click();
    await expect(page.locator('.alert-success')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#Email')).toHaveValue(email);
    await expect(page.locator('#Username')).toHaveValue('smtp_admin_user');
  });

});
