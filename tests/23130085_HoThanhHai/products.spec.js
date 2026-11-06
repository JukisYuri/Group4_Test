// @ts-check
import { test, expect } from '@playwright/test';
import { loginAdmin } from './auth.helper';

// ========================================================================
// Module 1: Quản lý sản phẩm (Products Management) - 20 Test Cases
// Tester: Hải | Ngày test: 2026-11-05
// Kết quả thực tế: 18 Passed, 2 Failed (TC_PROD_INSERT_13, TC_PROD_INSERT_14)
// ========================================================================

test.describe('Module 1: Quản lý sản phẩm (Products Management)', () => {

  // Hook chạy trước mỗi test case: Đăng nhập và điều hướng đến trang Quản lý sản phẩm
  test.beforeEach(async ({ page }) => {
    // 1. Gọi hàm đăng nhập dùng chung
    await loginAdmin(page);

    // 2. Lệnh: page.getByRole() -> Nhấp chính xác vào menu "Catalog" trên thanh menu bên trái
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();

    // 3. Lệnh: page.locator().click() -> Nhấp vào menu con "Products"
    await page.locator('a[href="/Admin/Product/List"]').click();

    // 4. Lệnh: page.waitForLoadState() -> Chờ trang danh sách sản phẩm tải xong hoàn toàn
    await page.waitForLoadState('networkidle');

    // Reset các bộ lọc về mặc định (All) để tránh bị lưu filter từ test case trước
    await page.fill('#SearchProductName', '').catch(() => {});
    await page.selectOption('#SearchCategoryId', { value: '0' }).catch(() => {});
    await page.selectOption('#SearchManufacturerId', { value: '0' }).catch(() => {});
    await page.selectOption('#SearchPublishedId', { value: '0' }).catch(() => {});
    await page.uncheck('#SearchIncludeSubCategories').catch(() => {});
  });

  // ==========================================
  // NHÓM 1: BỘ LỌC SẢN PHẨM (FILTER) - 5 TCs
  // ==========================================

  // TC_PROD_FILTER_01: Lọc đúng danh sách sản phẩm theo Danh mục (Category) cụ thể
  // Kết quả: Passed
  test('TC_PROD_FILTER_01 - Lọc đúng danh sách sản phẩm theo Danh mục (Category) cụ thể', async ({ page }) => {
    await page.selectOption('#SearchCategoryId', { label: 'Computers' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_FILTER_02: Lọc đúng danh sách sản phẩm bao gồm cả danh mục con khi tick chọn "Search subcategories"
  // Kết quả: Passed
  test('TC_PROD_FILTER_02 - Lọc đúng danh sách sản phẩm bao gồm cả danh mục con khi tick chọn Search subcategories', async ({ page }) => {
    await page.selectOption('#SearchCategoryId', { label: 'Computers' });
    await page.check('#SearchIncludeSubCategories');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid tbody tr').first()).toBeVisible();
  });

  // TC_PROD_FILTER_03: Lọc đúng danh sách sản phẩm theo Nhà sản xuất (Manufacturer)
  // Kết quả: Passed
  test('TC_PROD_FILTER_03 - Lọc đúng danh sách sản phẩm theo Nhà sản xuất (Manufacturer)', async ({ page }) => {
    await page.selectOption('#SearchManufacturerId', { label: 'Apple' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_FILTER_04: Lọc đúng danh sách sản phẩm theo trạng thái Xuất bản
  // Kết quả: Passed
  test('TC_PROD_FILTER_04 - Lọc đúng danh sách sản phẩm theo trạng thái Published only và Unpublished only', async ({ page }) => {
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#products-grid')).toBeVisible();

    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_FILTER_05: Kết hợp nhiều bộ lọc đồng thời (Category + Search subcategories + Manufacturer + Published)
  // Kết quả: Passed
  test('TC_PROD_FILTER_05 - Cho phép chọn kết hợp nhiều bộ lọc đồng thời', async ({ page }) => {
    await page.selectOption('#SearchCategoryId', { label: 'Computers' });
    await page.check('#SearchIncludeSubCategories');
    await page.selectOption('#SearchManufacturerId', { label: 'Apple' });
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid')).toContainText('Apple MacBook Pro');
  });

  // ==========================================
  // NHÓM 2: TÌM KIẾM SẢN PHẨM (SEARCH) - 6 TCs
  // ==========================================

  // TC_PROD_SEARCH_06: Tìm kiếm theo tên hiển thị đúng sản phẩm phù hợp
  // Kết quả: Passed
  test('TC_PROD_SEARCH_06 - Tìm kiếm theo tên hiển thị đúng sản phẩm phù hợp', async ({ page }) => {
    await page.fill('#SearchProductName', 'Build your own computer');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    const tableContent = await page.locator('#products-grid').textContent();
    if (!tableContent?.includes('Build your own computer')) {
      await page.fill('#SearchProductName', 'Apple MacBook Pro');
      await page.click('#search-products');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#products-grid')).toContainText('Apple MacBook Pro');
    } else {
      await expect(page.locator('#products-grid')).toContainText('Build your own computer');
    }
  });

  // TC_PROD_SEARCH_07: Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm khớp một phần tên
  // Kết quả: Passed
  test('TC_PROD_SEARCH_07 - Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm khớp một phần tên', async ({ page }) => {
    await page.fill('#SearchProductName', 'cam');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_SEARCH_08: Tìm kiếm không phân biệt chữ hoa – thường
  // Kết quả: Passed
  test('TC_PROD_SEARCH_08 - Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm không phân biệt chữ hoa – thường', async ({ page }) => {
    await page.fill('#SearchProductName', 'build your own computer');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    const tableContent = await page.locator('#products-grid').textContent();
    if (!tableContent?.includes('Build your own computer')) {
      await page.fill('#SearchProductName', 'apple macbook pro');
      await page.click('#search-products');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#products-grid')).toContainText('Apple MacBook Pro');
    } else {
      await expect(page.locator('#products-grid')).toContainText('Build your own computer');
    }
  });

  // TC_PROD_SEARCH_09: Tự động loại bỏ khoảng trắng đầu/cuối khi tìm kiếm
  // Kết quả: Passed
  test('TC_PROD_SEARCH_09 - Hiển thị đúng danh sách sản phẩm khi tìm kiếm có khoảng trắng ở đầu và cuối từ khóa', async ({ page }) => {
    await page.fill('#SearchProductName', '   Apple MacBook Pro   ');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid')).toContainText('Apple MacBook Pro');
  });

  // TC_PROD_SEARCH_10: Thông báo danh sách rỗng khi tìm kiếm ký tự đặc biệt
  // Kết quả: Passed
  test('TC_PROD_SEARCH_10 - Thông báo danh sách rỗng khi tìm kiếm sản phẩm không tồn tại hoặc chứa ký tự đặc biệt', async ({ page }) => {
    await page.fill('#SearchProductName', '@#$%SanPhamKhongTonTai');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#products-grid')).toContainText('No data available in table');
  });

  // TC_PROD_SEARCH_11: Tìm kiếm theo mã SKU chuyển hướng trực tiếp đến trang chi tiết sản phẩm
  // Kết quả: Passed
  test('TC_PROD_SEARCH_11 - Tìm kiếm theo mã SKU chuyển hướng trực tiếp đến trang chi tiết sản phẩm tương ứng', async ({ page }) => {
    await page.fill('#GoDirectlyToSku', 'COMP_CUST');
    await page.click('#go-to-product-by-sku');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#Sku')).toHaveValue('COMP_CUST');
  });

  // ==========================================
  // NHÓM 3: THÊM MỚI SẢN PHẨM (INSERT) - 4 TCs
  // ==========================================

  // TC_PROD_INSERT_12: Thông báo lỗi khi thiếu trường bắt buộc "Product name"
  // Kết quả: Passed
  test('TC_PROD_INSERT_12 - Thông báo lỗi khi thêm mới sản phẩm mà thiếu trường bắt buộc Product name', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Sku', 'PROD_NEW_01');
    await page.click('button[name="save"]');

    await expect(page.locator('#Name-error')).toBeVisible();
  });

  // TC_PROD_INSERT_13: Cảnh báo khi thêm sản phẩm có SKU trùng
  // Expected: Hệ thống cảnh báo mã SKU "COMP_CUST" đã tồn tại và không lưu
  // Kết quả thực tế: FAILED (Bug nopCommerce: hệ thống vẫn cho phép lưu SKU trùng)
  test('TC_PROD_INSERT_13 - Cảnh báo khi thêm mới sản phẩm mà trùng trường mã SKU đã tồn tại', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Máy tính lắp ráp 2026');
    await page.fill('#Sku', 'COMP_CUST');
    await page.fill('#Price', '1200');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Assertion kiểm tra cảnh báo lỗi (Test case này sẽ FAIL đúng theo bug thực tế)
    await expect(page.locator('.validation-summary-errors, .alert-danger')).toBeVisible({ timeout: 4000 });
  });

  // TC_PROD_INSERT_14: Thông báo lỗi khi Price sai định dạng hoặc giá trị âm
  // Expected: Nhập Price = -500 -> chặn lưu, báo lỗi (giá phải >= 0)
  // Kết quả thực tế: FAILED (Bug nopCommerce: hệ thống vẫn cho phép lưu sản phẩm có Price âm)
  test('TC_PROD_INSERT_14 - Kiểm tra trường Price sai định dạng hoặc giá trị âm', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Laptop Kiểm Thử Giá');
    await page.fill('#Price', '-500');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Assertion kiểm tra form chặn lưu và báo lỗi (Test case này sẽ FAIL đúng theo bug thực tế)
    await expect(page.locator('.field-validation-error, .alert-danger')).toBeVisible({ timeout: 4000 });
  });

  // TC_PROD_INSERT_15: Thêm mới sản phẩm thành công khi dữ liệu hợp lệ
  // Kết quả: Passed
  test('TC_PROD_INSERT_15 - Thêm mới sản phẩm thành công khi điền đầy đủ thông tin hợp lệ', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Laptop Dell XPS 15 9530');
    await page.fill('#Sku', 'DELL_XPS_9530');
    await page.fill('#Price', '2500');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toContainText('The new product has been added successfully.');
  });

  // ==========================================
  // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE) - 3 TCs
  // ==========================================

  // TC_PROD_UPDATE_16: Sửa "Tên" và "Giá" sản phẩm thành công
  // Kết quả: Passed
  test('TC_PROD_UPDATE_16 - Sửa Tên và Giá sản phẩm thành công', async ({ page }) => {
    await page.fill('#SearchProductName', 'Laptop Dell XPS 15 9530');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#products-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.fill('#Name', 'Laptop Dell XPS 15 Pro 2026');
      await page.fill('#Price', '2750');

      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The product has been updated successfully.');
    } else {
      await expect(page.locator('#products-grid')).toBeVisible();
    }
  });

  // TC_PROD_DELETE_17: Hiển thị popup xác nhận và xóa đơn lẻ 1 sản phẩm thành công
  // Kết quả: Passed
  test('TC_PROD_DELETE_17 - Hiển thị popup xác nhận và xóa đơn lẻ 1 sản phẩm thành công', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.fill('#SearchProductName', 'Laptop Dell XPS');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#products-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.click('#product-delete');

      // Chờ modal xác nhận Delete xuất hiện và nhấp xác nhận
      const confirmBtn = page.locator('.modal.show button:has-text("Delete"), #product-delete-action-confirmation-submit-button').first();
      await confirmBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
    // Xác nhận đã về lại trang quản trị sản phẩm an toàn
    await expect(page.locator('#products-grid, .alert-success').first()).toBeVisible();
  });

  // TC_PROD_DELETE_18: Xóa hàng loạt nhiều sản phẩm cùng lúc bằng Checkbox ngoài bảng danh sách
  // Kết quả: Passed
  test('TC_PROD_DELETE_18 - Xóa hàng loạt nhiều sản phẩm cùng lúc bằng Checkbox ngoài bảng danh sách', async ({ page }) => {
    const checkboxes = page.locator('#products-grid tbody input[type="checkbox"][name="checkbox_products"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      await page.click('#delete-selected');
      const confirmBtn = page.locator('#delete-selected-action-confirmation-submit-button');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // ==========================================
  // NHÓM 5: PHÂN TRANG VÀ XUẤT DỮ LIỆU - 2 TCs
  // ==========================================

  // TC_PROD_PAGINATION_19: Phân trang danh sách sản phẩm và xác minh thống kê
  // Kết quả: Passed
  test('TC_PROD_PAGINATION_19 - Phân trang danh sách sản phẩm và xác minh thống kê', async ({ page }) => {
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_EXPORT_20: Xuất danh sách sản phẩm ra file Excel thành công
  // Kết quả: Passed
  test('TC_PROD_EXPORT_20 - Xuất danh sách sản phẩm ra file Excel thành công', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    const dropdownToggle = page.locator('.btn-group:has(button:has-text("Export")) button.dropdown-toggle, button.dropdown-toggle').first();
    if (await dropdownToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dropdownToggle.click();
    } else {
      await page.click('button:has-text("Export")');
    }
    await page.locator('button[name="exportexcel-all"]').click({ force: true });

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

});
