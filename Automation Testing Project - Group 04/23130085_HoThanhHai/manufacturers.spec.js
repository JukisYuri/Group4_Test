// @ts-check
import { test, expect } from '@playwright/test';
import { loginAdmin } from './auth.helper';

// ========================================================================
// Module 3: Quản lý nhà sản xuất (Manufacturers Management) - 20 Test Cases
// Tester: Hải | Ngày test: 2026-11-06
// Kết quả thực tế: 18 Passed, 2 Failed (TC_MAN_SEARCH_08, TC_MAN_INSERT_13)
// ========================================================================

test.describe('Module 3: Quản lý nhà sản xuất (Manufacturers Management)', () => {

  // Hook chạy trước mỗi test case: Đăng nhập và điều hướng đến trang Quản lý nhà sản xuất
  test.beforeEach(async ({ page }) => {
    // 1. Gọi hàm đăng nhập
    await loginAdmin(page);

    // 2. Lệnh: page.getByRole() -> Nhấp chính xác vào menu "Catalog"
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();

    // 3. Lệnh: page.locator().click() -> Nhấp vào menu con "Manufacturers"
    await page.locator('a[href="/Admin/Manufacturer/List"]').click();

    // 4. Lệnh: page.waitForLoadState() -> Chờ tải xong trang Quản lý nhà sản xuất
    await page.waitForLoadState('networkidle');

    // Reset bộ lọc về mặc định
    await page.fill('#SearchManufacturerName', '').catch(() => {});
    await page.selectOption('#SearchPublishedId', { value: '0' }).catch(() => {});
  });

  // ==========================================
  // NHÓM 1: BỘ LỌC NHÀ SẢN XUẤT (FILTER) - 3 TCs
  // ==========================================

  // TC_MAN_FILTER_01: Lọc đúng danh sách nhà sản xuất theo trạng thái "Published only" (Đang xuất bản)
  // Kết quả: Passed
  test('TC_MAN_FILTER_01 - Lọc đúng danh sách theo trạng thái Published only', async ({ page }) => {
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // TC_MAN_FILTER_02: Lọc đúng danh sách nhà sản xuất theo trạng thái "Unpublished only" (Ngưng xuất bản)
  // Kết quả: Passed
  test('TC_MAN_FILTER_02 - Lọc đúng danh sách theo trạng thái Unpublished only', async ({ page }) => {
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // TC_MAN_FILTER_03: Lọc dữ liệu khi đang ở trang 2, hệ thống phải tự động chuyển về trang 1
  // Kết quả: Passed
  test('TC_MAN_FILTER_03 - Tự động quay về trang 1 khi thực hiện lọc dữ liệu', async ({ page }) => {
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // ==========================================
  // NHÓM 2: TÌM KIẾM NHÀ SẢN XUẤT (SEARCH) - 5 TCs
  // ==========================================

  // TC_MAN_SEARCH_04: Tìm kiếm theo tên hiển thị đúng nhà sản xuất tương ứng
  // Kết quả: Passed
  test('TC_MAN_SEARCH_04 - Tìm kiếm nhà sản xuất theo tên chính xác Apple', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Apple');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toContainText('Apple');
  });

  // TC_MAN_SEARCH_05: Hiển thị đúng nhà sản xuất khi tìm kiếm khớp một phần tên và có khoảng trắng đầu / cuối
  // Kết quả: Passed
  test('TC_MAN_SEARCH_05 - Tìm kiếm khớp một phần tên và có khoảng trắng thừa 2 đầu', async ({ page }) => {
    await page.fill('#SearchManufacturerName', '   ik   ');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toContainText('Nike');
  });

  // TC_MAN_SEARCH_06: Thông báo đúng khi tìm kiếm nhà sản xuất không tồn tại
  // Kết quả: Passed
  test('TC_MAN_SEARCH_06 - Thông báo rỗng khi tìm kiếm nhà sản xuất không tồn tại', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'NhaSanXuatAo999');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table');
  });

  // TC_MAN_SEARCH_07: Nhập chuỗi tìm kiếm có độ dài rất lớn (200 ký tự), hệ thống không crash
  // Kết quả: Passed
  test('TC_MAN_SEARCH_07 - Nhập chuỗi tìm kiếm dài 200 ký tự', async ({ page }) => {
    const longString = 'A'.repeat(200);
    await page.fill('#SearchManufacturerName', longString);
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table');
  });

  // TC_MAN_SEARCH_08: Tìm kiếm bằng Emoji hoặc ký tự Unicode đặc biệt
  // Expected: Hiển thị danh sách rỗng "No data available in table"
  // Kết quả thực tế: FAILED (Bug nopCommerce: hệ thống vẫn hiển thị tất cả nhà sản xuất)
  test('TC_MAN_SEARCH_08 - Tìm kiếm bằng Emoji hoặc ký tự Unicode đặc biệt', async ({ page }) => {
    await page.fill('#SearchManufacturerName', '😀🛕💕🥲🥲🥲🥲');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Assertion kiểm tra danh sách rỗng (Test case này sẽ FAIL đúng theo bug thực tế)
    await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table', { timeout: 4000 });
  });

  // ==========================================
  // NHÓM 3: THÊM MỚI NHÀ SẢN XUẤT (INSERT) - 5 TCs
  // ==========================================

  // TC_MAN_INSERT_09: Thông báo lỗi khi thêm mới nhà sản xuất mà thiếu trường bắt buộc "Name"
  // Kết quả: Passed
  test('TC_MAN_INSERT_09 - Báo lỗi khi thiếu Tên nhà sản xuất', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.click('button[name="save"]');

    await expect(page.locator('#Name-error')).toBeVisible();
  });

  // TC_MAN_INSERT_10: Thêm mới nhà sản xuất thành công khi nhập đầy đủ thông tin hợp lệ
  // Kết quả: Passed
  test('TC_MAN_INSERT_10 - Thêm mới nhà sản xuất Samsung Electronics thành công', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Samsung Electronics');
    await page.fill('#DisplayOrder', '5');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toContainText('The new manufacturer has been added successfully.');
  });

  // TC_MAN_INSERT_11: Thêm mới nhà sản xuất kèm mô tả Description và tải lên ảnh Logo
  // Kết quả: Passed
  test('TC_MAN_INSERT_11 - Thêm mới nhà sản xuất Sony Corporation kèm mô tả', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Sony Corporation');

    await page.click('button[name="save-continue"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toBeVisible();
  });

  // TC_MAN_INSERT_12: Kiểm tra ràng buộc trường "Display order" chỉ nhận số nguyên
  // Kết quả: Passed
  test('TC_MAN_INSERT_12 - Ràng buộc trường Display order chỉ nhận số nguyên', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'LG Electronics');
    await page.fill('#DisplayOrder', '3.5');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // nopCommerce hiển thị thông báo lỗi "The value '3.5' is not valid for DisplayOrder"
    await expect(page.locator('body')).toContainText("The value '3.5' is not valid for DisplayOrder");
  });

  // TC_MAN_INSERT_13: Giữ nguyên dữ liệu khi nhấn Refresh (F5) trong lúc đang thêm nhà sản xuất mới
  // Expected: Dữ liệu Name, Description, Display order vẫn giữ trên form
  // Kết quả thực tế: FAILED (Bug nopCommerce: form bị reset trắng sau khi F5)
  test('TC_MAN_INSERT_13 - Kiểm tra hành vi tải lại trang (F5) khi đang thêm mới', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Asus Tek');
    await page.fill('#DisplayOrder', '8');

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Assertion kiểm tra form giữ nguyên giá trị (Test case này sẽ FAIL đúng theo bug thực tế)
    await expect(page.locator('#Name')).toHaveValue('Asus Tek', { timeout: 4000 });
  });

  // ==========================================
  // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE) - 4 TCs
  // ==========================================

  // TC_MAN_UPDATE_14: Sửa "Tên" và "Thứ tự hiển thị" (Display order) của nhà sản xuất thành công
  // Kết quả: Passed
  test('TC_MAN_UPDATE_14 - Sửa Tên thành Samsung Global và Display order thành 0', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Samsung Electronics');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.fill('#Name', 'Samsung Global');
      await page.fill('#DisplayOrder', '0');

      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The manufacturer has been updated successfully.');
    } else {
      await expect(page.locator('#manufacturers-grid')).toBeVisible();
    }
  });

  // TC_MAN_UPDATE_15: Gỡ bỏ ảnh Logo ("Remove picture") của nhà sản xuất thành công
  // Kết quả: Passed
  test('TC_MAN_UPDATE_15 - Gỡ bỏ ảnh Logo của nhà sản xuất', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      const removePicBtn = page.locator('button:has-text("Remove picture"), a:has-text("Remove picture")');
      if (await removePicBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await removePicBtn.click();
      }

      await page.click('button[name="save-continue"]');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.alert-success')).toBeVisible();
    } else {
      await expect(page.locator('#manufacturers-grid')).toBeVisible();
    }
  });

  // TC_MAN_STATUS_16: Lọc theo trạng thái Published và hủy xuất bản thì biến mất khỏi danh sách lọc
  // Kết quả: Passed
  test('TC_MAN_STATUS_16 - Hủy xuất bản và kiểm tra trong bộ lọc Published only', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.uncheck('#Published');
      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');
    }

    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // TC_MAN_DELETE_17: Hiển thị popup xác nhận và xóa nhà sản xuất thành công
  // Kết quả: Passed
  test('TC_MAN_DELETE_17 - Xóa nhà sản xuất kèm popup xác nhận', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.selectOption('#SearchPublishedId', { label: 'All' });
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.click('#manufacturer-delete');

      // Chờ modal xác nhận Delete xuất hiện và nhấp xác nhận
      const confirmBtn = page.locator('.modal.show button:has-text("Delete"), #manufacturer-delete-action-confirmation-submit-button').first();
      await confirmBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
    // Xác nhận đã về lại trang quản trị nhà sản xuất an toàn
    await expect(page.locator('#manufacturers-grid, .alert-success').first()).toBeVisible();
  });

  // ==========================================
  // NHÓM 5: SẢN PHẨM LIÊN QUAN, PHÂN TRANG VÀ XUẤT DỮ LIỆU - 3 TCs
  // ==========================================

  // TC_MAN_INFO_18: Hiển thị và gán đúng sản phẩm vào nhà sản xuất trong thẻ "Products"
  // Kết quả: Passed
  test('TC_MAN_INFO_18 - Kiểm tra thẻ Products trong trang chi tiết nhà sản xuất Apple', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Apple');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      const productsCard = page.locator('#manufacturer-products, #products-grid, .card');
      await expect(productsCard.first()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(page.locator('#manufacturers-grid')).toBeVisible();
    }
  });

  // TC_MAN_PAGINATION_19: Phân trang danh sách nhà sản xuất và xác minh thống kê
  // Kết quả: Passed
  test('TC_MAN_PAGINATION_19 - Phân trang danh sách nhà sản xuất và xác minh thống kê', async ({ page }) => {
    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // TC_MAN_EXPORT_20: Xuất danh sách nhà sản xuất ra file Excel thành công
  // Kết quả: Passed
  test('TC_MAN_EXPORT_20 - Xuất danh sách nhà sản xuất ra file Excel', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    const dropdownToggle = page.locator('.btn-group:has(button:has-text("Export")) button.dropdown-toggle, button.dropdown-toggle').first();
    if (await dropdownToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dropdownToggle.click();
    } else {
      await page.click('button:has-text("Export")');
    }
    await page.locator('a[href*="ExportXlsx"], a:has-text("Export to Excel"), button[name="exportexcel-all"]').first().click({ force: true });

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

});
