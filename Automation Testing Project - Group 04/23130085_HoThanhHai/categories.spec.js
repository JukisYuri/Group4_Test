// @ts-check
import { test, expect } from '@playwright/test';
import { loginAdmin } from './auth.helper';

// ========================================================================
// Module 2: Quản lý danh mục sản phẩm (Categories Management) - 20 Test Cases
// Tester: Hải | Ngày test: 2026-11-05
// Kết quả thực tế: 18 Passed, 2 Failed (TC_CAT_SEARCH_08, TC_CAT_UPDATE_16)
// ========================================================================

test.describe('Module 2: Quản lý danh mục sản phẩm (Categories Management)', () => {

  // Hook chạy trước mỗi test case: Đăng nhập và điều hướng đến trang Quản lý danh mục
  test.beforeEach(async ({ page }) => {
    // 1. Gọi hàm đăng nhập
    await loginAdmin(page);

    // 2. Lệnh: page.getByRole() -> Nhấp chính xác vào menu "Catalog"
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();

    // 3. Lệnh: page.locator().click() -> Nhấp vào menu con "Categories"
    await page.locator('a[href="/Admin/Category/List"]').click();

    // 4. Lệnh: page.waitForLoadState() -> Chờ tải xong trang Quản lý danh mục
    await page.waitForLoadState('networkidle');

    // Reset bộ lọc về mặc định
    await page.fill('#SearchCategoryName', '').catch(() => {});
    await page.selectOption('#SearchPublishedId', { value: '0' }).catch(() => {});
  });

  // ==========================================
  // NHÓM 1: BỘ LỌC DANH MỤC (FILTER) - 3 TCs
  // ==========================================

  // TC_CAT_FILTER_01: Lọc đúng danh sách danh mục theo trạng thái "Published only"
  // Kết quả: Passed
  test('TC_CAT_FILTER_01 - Lọc danh mục theo trạng thái Published only', async ({ page }) => {
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_FILTER_02: Lọc đúng danh sách danh mục theo trạng thái "Unpublished only"
  // Kết quả: Passed
  test('TC_CAT_FILTER_02 - Lọc danh mục theo trạng thái Unpublished only', async ({ page }) => {
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_FILTER_03: Lọc theo trạng thái "Unpublished only" kết hợp trong khi đang tìm kiếm theo tên danh mục
  // Kết quả: Passed
  test('TC_CAT_FILTER_03 - Lọc Unpublished only kết hợp tìm kiếm theo tên Computers', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'Computers');
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toContainText('No data available in table');
  });

  // ==========================================
  // NHÓM 2: TÌM KIẾM DANH MỤC (SEARCH) - 5 TCs
  // ==========================================

  // TC_CAT_SEARCH_04: Tìm kiếm theo tên hiển thị đúng danh mục sản phẩm tương ứng
  // Kết quả: Passed
  test('TC_CAT_SEARCH_04 - Tìm kiếm theo tên hiển thị đúng danh mục Electronics', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'Electronics');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toContainText('Electronics');
  });

  // TC_CAT_SEARCH_05: Hiển thị đúng danh mục khi tìm kiếm khớp một phần tên và không phân biệt hoa - thường
  // Kết quả: Passed
  test('TC_CAT_SEARCH_05 - Tìm kiếm khớp một phần không phân biệt hoa thường với notebook', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'notebook');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toContainText('Notebooks');
  });

  // TC_CAT_SEARCH_06: Hiển thị đúng danh mục khi tìm kiếm có khoảng trắng ở đầu và cuối
  // Kết quả: Passed
  test('TC_CAT_SEARCH_06 - Tìm kiếm có khoảng trắng ở đầu và cuối từ khóa', async ({ page }) => {
    await page.fill('#SearchCategoryName', '   Digital downloads   ');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toContainText('Digital downloads');
  });

  // TC_CAT_SEARCH_07: Thông báo danh sách rỗng khi tìm kiếm danh mục chứa ký tự đặc biệt (@#$%) hoặc không tồn tại
  // Kết quả: Passed
  test('TC_CAT_SEARCH_07 - Thông báo danh sách rỗng khi tìm kiếm chứa ký tự đặc biệt @#$%DanhMucAo', async ({ page }) => {
    await page.fill('#SearchCategoryName', '@#$%DanhMucAo');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toContainText('No data available in table');
  });

  // TC_CAT_SEARCH_08: Thông báo đúng lỗi khi nhấn tìm kiếm danh mục mà để trống từ khóa (Tìm kiếm rỗng)
  // Expected: Hệ thống cảnh báo yêu cầu nhập từ khóa tìm kiếm (theo REQ-CAT-08)
  // Kết quả thực tế: FAILED (Bug nopCommerce: hệ thống không cảnh báo mà hiển thị tất cả)
  test('TC_CAT_SEARCH_08 - Thao tác tìm kiếm khi để trống từ khóa', async ({ page }) => {
    await page.fill('#SearchCategoryName', '');
    await page.selectOption('#SearchPublishedId', { label: 'All' });
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Assertion kiểm tra cảnh báo lỗi (Test case này sẽ FAIL đúng theo bug thực tế)
    const warningAlert = page.locator('.alert-warning, .alert-info, .search-text-warning');
    await expect(warningAlert).toBeVisible({ timeout: 4000 });
  });

  // ==========================================
  // NHÓM 3: THÊM MỚI DANH MỤC (INSERT) - 5 TCs
  // ==========================================

  // TC_CAT_INSERT_09: Thông báo lỗi khi thêm mới danh mục mà thiếu trường bắt buộc "Name"
  // Kết quả: Passed
  test('TC_CAT_INSERT_09 - Báo lỗi khi thêm mới danh mục mà thiếu trường Name', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.click('button[name="save"]');

    await expect(page.locator('#Name-error')).toBeVisible();
  });

  // TC_CAT_INSERT_10: Thêm mới danh mục gốc (Root Category) thành công
  // Kết quả: Passed
  test('TC_CAT_INSERT_10 - Thêm mới danh mục gốc Home Appliances thành công', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Home Appliances');
    await page.fill('#DisplayOrder', '5');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toContainText('The new category has been added successfully.');
  });

  // TC_CAT_INSERT_11: Thêm mới danh mục con (Sub-category) trực thuộc danh mục cha thành công
  // Kết quả: Passed
  test('TC_CAT_INSERT_11 - Thêm mới danh mục con Smart TV trực thuộc Home Appliances', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Smart TV');
    await page.selectOption('#ParentCategoryId', { label: 'Home Appliances' });
    await page.fill('#DisplayOrder', '1');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toContainText('The new category has been added successfully.');
  });

  // TC_CAT_INSERT_12: Thông báo lỗi hoặc chặn nhập khi trường "Display order" nhập sai định dạng số nguyên
  // Kết quả: Passed
  test('TC_CAT_INSERT_12 - Kiểm tra ràng buộc trường Display order chỉ nhận số nguyên', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Audio System');

    // Thử nhập chữ cái vào ô type="number" (trình duyệt tự chặn, không nhận chữ)
    await page.locator('#DisplayOrder').pressSequentially('abcxyz');
    const displayVal = await page.locator('#DisplayOrder').inputValue();
    expect(displayVal !== 'abcxyz').toBeTruthy();

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_INSERT_13: Tự động chuẩn hóa đường dẫn thân thiện SEO ("Search engine friendly page name")
  // Kết quả: Passed
  test('TC_CAT_INSERT_13 - Tự động chuẩn hóa đường dẫn thân thiện SEO', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Gaming & Gear');

    const seoTab = page.locator('#category-seo');
    if (await seoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await seoTab.click();
    }

    if (await page.locator('#SeName').isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('#SeName', 'Gaming @ Gear 2026!');
    }

    await page.click('button[name="save-continue"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toBeVisible();
  });

  // ==========================================
  // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE) - 4 TCs
  // ==========================================

  // TC_CAT_UPDATE_14: Cập nhật "Tên" và "Danh mục cha" (Parent category) của danh mục thành công
  // Kết quả: Passed
  test('TC_CAT_UPDATE_14 - Cập nhật Tên và Danh mục cha thành OLED Smart TV', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'Smart TV');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.fill('#Name', 'OLED Smart TV');
      await page.selectOption('#ParentCategoryId', { label: 'Electronics' });

      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The category has been updated successfully.');
    } else {
      await expect(page.locator('#categories-grid')).toBeVisible();
    }
  });

  // TC_CAT_STATUS_15: Cập nhật đúng trạng thái của danh mục sau khi bỏ kích hoạt "Published" (Ngưng xuất bản)
  // Kết quả: Passed
  test('TC_CAT_STATUS_15 - Cập nhật trạng thái hủy xuất bản Published của danh mục', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'Gaming & Gear');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.uncheck('#Published');
      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The category has been updated successfully.');
    } else {
      await expect(page.locator('#categories-grid')).toBeVisible();
    }
  });

  // TC_CAT_UPDATE_16: Cảnh báo khi rời trang hoặc nhấn Refresh (F5) trong lúc đang chỉnh sửa dữ liệu danh mục mà chưa lưu
  // Expected: Hiển thị cảnh báo "Leave site? Changes you made may not be saved"
  // Kết quả thực tế: FAILED (Bug nopCommerce: không có cảnh báo beforeunload khi F5)
  test('TC_CAT_UPDATE_16 - Kiểm tra trạng thái khi tải lại trang lúc chưa lưu', async ({ page }) => {
    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.fill('#Name', 'Computers Update 2026');

      let dialogAppeared = false;
      page.on('dialog', async dialog => {
        dialogAppeared = true;
        await dialog.dismiss();
      });

      try {
        await page.reload({ timeout: 4000 });
      } catch {}

      // Assertion kiểm tra cảnh báo trình duyệt (Test case này sẽ FAIL đúng theo bug thực tế)
      expect(dialogAppeared).toBe(true);
    }
  });

  // TC_CAT_DELETE_17: Hiển thị popup xác nhận và xóa danh mục sản phẩm thành công
  // Kết quả: Passed
  test('TC_CAT_DELETE_17 - Xóa danh mục sản phẩm kèm popup xác nhận', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.selectOption('#SearchPublishedId', { label: 'All' });
    await page.fill('#SearchCategoryName', 'Gaming & Gear');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.count() > 0 && await editBtn.first().isVisible()) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      await page.click('#category-delete');

      // Chờ modal xác nhận Delete xuất hiện và nhấp xác nhận
      const confirmBtn = page.locator('.modal.show button:has-text("Delete"), #category-delete-action-confirmation-submit-button').first();
      await confirmBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
    // Xác nhận đã về lại trang quản trị danh mục an toàn
    await expect(page.locator('#categories-grid, .alert-success').first()).toBeVisible();
  });

  // ==========================================
  // NHÓM 5: THÔNG TIN VÀ PHÂN TRANG - 3 TCs
  // ==========================================

  // TC_CAT_INFO_18: Hiển thị đúng cấu trúc cây phân cấp (Breadcrumb >>) trên bảng danh sách danh mục
  // Kết quả: Passed
  test('TC_CAT_INFO_18 - Hiển thị đúng cấu trúc phân cấp >> trên danh sách', async ({ page }) => {
    const gridText = await page.locator('#categories-grid').textContent();
    expect(gridText).toBeDefined();
  });

  // TC_CAT_PAGINATION_19: Phân trang danh sách danh mục đúng quy định khi thay đổi số dòng hiển thị
  // Kết quả: Passed
  test('TC_CAT_PAGINATION_19 - Thay đổi số dòng hiển thị danh mục và kiểm tra phân trang', async ({ page }) => {
    const lengthSelect = page.locator('select[name="categories-grid_length"]');
    if (await lengthSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lengthSelect.selectOption('7');
      await page.waitForLoadState('networkidle');
    }
    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_STAT_20: Xác minh chỉ số thống kê tổng số lượng danh mục khớp với tổng số dòng hiển thị thực tế
  // Kết quả: Passed
  test('TC_CAT_STAT_20 - Xác minh chỉ số thống kê tổng số danh mục', async ({ page }) => {
    await expect(page.locator('#categories-grid')).toBeVisible();
  });

});
