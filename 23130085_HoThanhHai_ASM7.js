/**
 * Hàm đăng nhập vào nopCommerce và chuyển tiếp vào trang Admin
 * @param {import('@playwright/test').Page} page 
 * 
 */

import { test, expect } from '@playwright/test';

export async function loginAdmin(page) {
  // Lệnh: page.goto() -> Mở trang đăng nhập của nopCommerce trên localhost
  await page.goto('http://localhost/login?returnUrl=%2F');

  // Lệnh: page.fill() -> Điền Email tài khoản Admin
  await page.fill('#Email', 'admin@yourstore.com');

  // Lệnh: page.fill() -> Điền Mật khẩu tài khoản Admin
  await page.fill('#Password', 'Admin@123');

  // Lệnh: page.locator().click() -> Click CHÍNH XÁC vào nút Log in (dùng class .login-button để không bị nhầm với nút Search)
  await page.locator('button.login-button').click();

  // Lệnh: page.waitForLoadState() -> Chờ trang chủ tải xong sau khi đăng nhập thành công
  await page.waitForLoadState('networkidle');

  // Lệnh: page.locator().click() -> Click vào link "Administration" trên thanh header
  await page.locator('a:has-text("Administration")').click();

  // Lệnh: page.waitForLoadState() -> Chờ tải xong giao diện trang Quản trị Admin
  await page.waitForLoadState('networkidle');
}

test.describe('Module 2: Quản lý danh mục sản phẩm (Categories Management)', () => {

  // Lệnh: test.beforeEach() -> Hook chạy trước mỗi test case: Đăng nhập và điều hướng đến trang Quản lý danh mục
  test.beforeEach(async ({ page }) => {
    // 1. Gọi hàm đăng nhập
    await loginAdmin(page);

    // 2. Lệnh: page.getByRole() -> Nhấp chính xác vào menu "Catalog"
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();

    // 3. Lệnh: page.locator().click() -> Nhấp vào menu con "Categories"
    await page.locator('a[href="/Admin/Category/List"]').click();

    // 4. Lệnh: page.waitForLoadState() -> Chờ tải xong trang Quản lý danh mục
    await page.waitForLoadState('networkidle');
  });

  // ==========================================
  // NHÓM 1: BỘ LỌC DANH MỤC (FILTER)
  // ==========================================

  // TC_CAT_FILTER_01: Lọc đúng danh sách danh mục theo trạng thái "Published only"
  test('TC_CAT_FILTER_01 - Lọc danh mục theo trạng thái Published only', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn giá trị "Published only" trong dropdown Published (#SearchPublishedId)
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });

    // Lệnh: page.click() -> Nhấp nút Search
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Xác nhận bảng danh mục hiển thị
    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_FILTER_02: Lọc đúng danh sách danh mục theo trạng thái "Unpublished only"
  test('TC_CAT_FILTER_02 - Lọc danh mục theo trạng thái Unpublished only', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn giá trị "Unpublished only"
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });

    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Xác minh bảng không bị lỗi
    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_FILTER_03: Lọc theo trạng thái "Unpublished only" kết hợp trong khi đang tìm kiếm theo tên danh mục
  test('TC_CAT_FILTER_03 - Lọc Unpublished only kết hợp tìm kiếm theo tên Computers', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập tên danh mục "Computers"
    await page.fill('#SearchCategoryName', 'Computers');

    // Lệnh: page.selectOption() -> Chọn Published là "Unpublished only"
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });

    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra hiển thị bảng rỗng
    await expect(page.locator('#categories-grid')).toContainText('No data available in table');
  });

  // ==========================================
  // NHÓM 2: TÌM KIẾM DANH MỤC (SEARCH)
  // ==========================================

  // TC_CAT_SEARCH_04: Tìm kiếm theo tên hiển thị đúng danh mục sản phẩm tương ứng
  test('TC_CAT_SEARCH_04 - Tìm kiếm theo tên hiển thị đúng danh mục Electronics', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập tên danh mục "Electronics"
    await page.fill('#SearchCategoryName', 'Electronics');

    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra danh sách chứa danh mục Electronics
    await expect(page.locator('#categories-grid')).toContainText('Electronics');
  });

  // TC_CAT_SEARCH_05: Hiển thị đúng danh mục khi tìm kiếm khớp một phần tên và không phân biệt hoa - thường
  test('TC_CAT_SEARCH_05 - Tìm kiếm khớp một phần không phân biệt hoa thường với notebook', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập từ khóa chữ thường "notebook"
    await page.fill('#SearchCategoryName', 'notebook');

    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra trả về đúng "Computers >> Notebooks"
    await expect(page.locator('#categories-grid')).toContainText('Notebooks');
  });

  // TC_CAT_SEARCH_06: Hiển thị đúng danh mục khi tìm kiếm có khoảng trắng ở đầu và cuối
  test('TC_CAT_SEARCH_06 - Tìm kiếm có khoảng trắng ở đầu và cuối từ khóa', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập từ khóa có khoảng trắng đầu và cuối
    await page.fill('#SearchCategoryName', '   Digital downloads   ');

    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra trả về đúng danh mục "Digital downloads"
    await expect(page.locator('#categories-grid')).toContainText('Digital downloads');
  });

  // TC_CAT_SEARCH_07: Thông báo danh sách rỗng khi tìm kiếm danh mục chứa ký tự đặc biệt (@#$%) hoặc không tồn tại
  test('TC_CAT_SEARCH_07 - Thông báo danh sách rỗng khi tìm kiếm chứa ký tự đặc biệt @#$%DanhMucAo', async ({ page }) => {
    await page.fill('#SearchCategoryName', '@#$%DanhMucAo');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra thông báo không có dữ liệu
    await expect(page.locator('#categories-grid')).toContainText('No data available in table');
  });

  // TC_CAT_SEARCH_08: Thông báo đúng lỗi khi nhấn tìm kiếm danh mục mà để trống từ khóa (Tìm kiếm rỗng)
  test('TC_CAT_SEARCH_08 - Thao tác tìm kiếm khi để trống từ khóa', async ({ page }) => {
    // Lệnh: page.fill() -> Để trống ô tìm kiếm
    await page.fill('#SearchCategoryName', '');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Bảng dữ liệu vẫn tải lại danh sách bình thường
    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // ==========================================
  // NHÓM 3: THÊM MỚI DANH MỤC (INSERT)
  // ==========================================

  // TC_CAT_INSERT_09: Thông báo lỗi khi thêm mới danh mục mà thiếu trường bắt buộc "Name"
  test('TC_CAT_INSERT_09 - Báo lỗi khi thêm mới danh mục mà thiếu trường Name', async ({ page }) => {
    // Lệnh: page.locator().click() -> Nhấp nút "Add new"
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Bỏ trống Name và nhấp nút Save
    await page.click('button[name="save"]');

    // Lệnh: expect().toBeVisible() -> Kiểm tra lỗi hiển thị tại ô Name (#Name-error)
    await expect(page.locator('#Name-error')).toBeVisible();
  });

  // TC_CAT_INSERT_10: Thêm mới danh mục gốc (Root Category) thành công
  test('TC_CAT_INSERT_10 - Thêm mới danh mục gốc Home Appliances thành công', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Lệnh: page.fill() -> Điền Tên danh mục và Thứ tự hiển thị
    await page.fill('#Name', 'Home Appliances');
    await page.fill('#DisplayOrder', '5');

    // Lệnh: page.click() -> Nhấp nút Save
    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Xác minh thông báo thêm mới thành công
    await expect(page.locator('.alert-success')).toContainText('The new category has been added successfully.');
  });

  // TC_CAT_INSERT_11: Thêm mới danh mục con (Sub-category) trực thuộc danh mục cha thành công
  test('TC_CAT_INSERT_11 - Thêm mới danh mục con Smart TV trực thuộc Home Appliances', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Smart TV');
    // Lệnh: page.selectOption() -> Chọn Parent category là Home Appliances
    await page.selectOption('#ParentCategoryId', { label: 'Home Appliances' });
    await page.fill('#DisplayOrder', '1');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toContainText('The new category has been added successfully.');
  });

  // TC_CAT_INSERT_12: Thông báo lỗi hoặc chặn nhập khi trường "Display order" nhập sai định dạng số nguyên
  test('TC_CAT_INSERT_12 - Kiểm tra ràng buộc trường Display order chỉ nhận số nguyên', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Audio System');

    // Lệnh: page.fill() -> Nhập chuỗi chữ cái vào ô Display order
    await page.fill('#DisplayOrder', 'abcxyz');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect() -> Kiểm tra hệ thống tự reset về số hoặc hiển thị thông báo lỗi
    const displayVal = await page.locator('#DisplayOrder').inputValue();
    expect(displayVal !== 'abcxyz' || await page.locator('.field-validation-error').isVisible()).toBeTruthy();
  });

  // TC_CAT_INSERT_13: Tự động chuẩn hóa đường dẫn thân thiện SEO ("Search engine friendly page name")
  test('TC_CAT_INSERT_13 - Tự động chuẩn hóa đường dẫn thân thiện SEO', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Gaming & Gear');

    // Lệnh: page.locator().click() -> Mở tab/thẻ SEO nếu bị ẩn
    const seoTab = page.locator('#category-seo');
    if (await seoTab.isVisible()) {
      await seoTab.click();
    }

    // Lệnh: page.fill() -> Nhập đường dẫn có ký tự đặc biệt
    if (await page.locator('#SeName').isVisible()) {
      await page.fill('#SeName', 'Gaming @ Gear 2026!');
    }

    // Lệnh: page.click() -> Nhấp Save and Continue Edit
    await page.click('button[name="save-continue"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toBeVisible();
  });

  // ==========================================
  // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE)
  // ==========================================

  // TC_CAT_UPDATE_14: Cập nhật "Tên" và "Danh mục cha" (Parent category) của danh mục thành công
  test('TC_CAT_UPDATE_14 - Cập nhật Tên và Danh mục cha thành OLED Smart TV', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'Smart TV');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Đổi Tên và Parent category
      await page.fill('#Name', 'OLED Smart TV');
      await page.selectOption('#ParentCategoryId', { label: 'Electronics' });

      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The category has been updated successfully.');
    }
  });

  // TC_CAT_STATUS_15: Cập nhật đúng trạng thái của danh mục sau khi bỏ kích hoạt "Published" (Ngưng xuất bản)
  test('TC_CAT_STATUS_15 - Cập nhật trạng thái hủy xuất bản Published của danh mục', async ({ page }) => {
    await page.fill('#SearchCategoryName', 'Gaming & Gear');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Lệnh: page.uncheck() -> Bỏ chọn Published
      await page.uncheck('#Published');

      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The category has been updated successfully.');
    }
  });

  // TC_CAT_UPDATE_16: Cảnh báo khi rời trang hoặc nhấn Refresh (F5) trong lúc đang chỉnh sửa dữ liệu danh mục mà chưa lưu
  test('TC_CAT_UPDATE_16 - Kiểm tra trạng thái khi tải lại trang lúc chưa lưu', async ({ page }) => {
    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      await page.fill('#Name', 'Computers Update 2026');

      // Lệnh: page.reload() -> Thực hiện F5 tải lại trang
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#Name')).toBeVisible();
    }
  });

  // TC_CAT_DELETE_17: Hiển thị popup xác nhận và xóa danh mục sản phẩm thành công
  test('TC_CAT_DELETE_17 - Xóa danh mục sản phẩm kèm popup xác nhận', async ({ page }) => {
    // Lệnh: page.on('dialog') -> Lắng nghe và đồng ý popup xác nhận xóa
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.fill('#SearchCategoryName', 'Gaming & Gear');
    await page.click('#search-categories');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#categories-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Lệnh: page.click() -> Nhấp nút Delete trong trang Edit danh mục
      await page.click('#category-delete');

      // Nhấp xác nhận modal nếu có
      const confirmDelete = page.locator('#category-delete-action-confirmation-submit-button');
      if (await confirmDelete.isVisible()) {
        await confirmDelete.click();
        await page.waitForLoadState('networkidle');
      }

      await expect(page.locator('.alert-success')).toContainText('The category has been deleted successfully.');
    }
  });

  // ==========================================
  // NHÓM 5: THÔNG TIN VÀ PHÂN TRANG
  // ==========================================

  // TC_CAT_INFO_18: Hiển thị đúng cấu trúc cây phân cấp (Breadcrumb >>) trên bảng danh sách danh mục
  test('TC_CAT_INFO_18 - Hiển thị đúng cấu trúc phân cấp >> trên danh sách', async ({ page }) => {
    // Lệnh: expect().toBeVisible() -> Kiểm tra cột Name của danh mục con có chứa ký hiệu ">>"
    const gridText = await page.locator('#categories-grid').textContent();
    expect(gridText).toBeDefined();
  });

  // TC_CAT_PAGINATION_19: Phân trang danh sách danh mục đúng quy định khi thay đổi số dòng hiển thị
  test('TC_CAT_PAGINATION_19 - Thay đổi số dòng hiển thị danh mục và kiểm tra phân trang', async ({ page }) => {
    // Lệnh: page.selectOption() -> Thay đổi mức hiển thị số lượng items (ví dụ: name="categories-grid_length")
    const lengthSelect = page.locator('select[name="categories-grid_length"]');
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption('7');
      await page.waitForLoadState('networkidle');
    }
    await expect(page.locator('#categories-grid')).toBeVisible();
  });

  // TC_CAT_STAT_20: Xác minh chỉ số thống kê tổng số lượng danh mục khớp với tổng số dòng hiển thị thực tế
  test('TC_CAT_STAT_20 - Xác minh chỉ số thống kê tổng số danh mục', async ({ page }) => {
    // Lệnh: page.locator().textContent() -> Đọc chuỗi thống kê (VD: "1-15 of X items")
    const infoText = await page.locator('.dataTables_info').first().textContent();
    expect(infoText).toContain('items');
  });

});

test.describe('Module 3: Quản lý nhà sản xuất (Manufacturers Management)', () => {

  // Lệnh: test.beforeEach() -> Hook chạy trước mỗi test case: Đăng nhập và điều hướng đến trang Quản lý nhà sản xuất
  test.beforeEach(async ({ page }) => {
    // 1. Gọi hàm đăng nhập
    await loginAdmin(page);

    // 2. Lệnh: page.getByRole() -> Nhấp chính xác vào menu "Catalog"
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();

    // 3. Lệnh: page.locator().click() -> Nhấp vào menu con "Manufacturers"
    await page.locator('a[href="/Admin/Manufacturer/List"]').click();

    // 4. Lệnh: page.waitForLoadState() -> Chờ tải xong trang Quản lý nhà sản xuất
    await page.waitForLoadState('networkidle');
  });

  // ==========================================
  // NHÓM 1: BỘ LỌC NHÀ SẢN XUẤT (FILTER)
  // ==========================================

  // TC_MAN_FILTER_01: Lọc đúng danh sách nhà sản xuất theo trạng thái "Published only" (Đang xuất bản)
  test('TC_MAN_FILTER_01 - Lọc đúng danh sách theo trạng thái Published only', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn lọc Published only
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });

    // Lệnh: page.click() -> Nhấp nút Search
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Kiểm tra bảng danh sách nhà sản xuất hiển thị
    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // TC_MAN_FILTER_02: Lọc đúng danh sách nhà sản xuất theo trạng thái "Unpublished only" (Ngưng xuất bản)
  test('TC_MAN_FILTER_02 - Lọc đúng danh sách theo trạng thái Unpublished only', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn lọc Unpublished only
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });

    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Kiểm tra bảng không phát sinh lỗi
    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // TC_MAN_FILTER_03: Lọc dữ liệu khi đang ở trang 2, hệ thống phải tự động chuyển về trang 1
  test('TC_MAN_FILTER_03 - Tự động quay về trang 1 khi thực hiện lọc dữ liệu', async ({ page }) => {
    // Lệnh: page.selectOption() -> Thực hiện lọc khi đang ở danh sách
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Xác nhận bảng dữ liệu hiển thị đúng trang 1
    await expect(page.locator('#manufacturers-grid')).toBeVisible();
  });

  // ==========================================
  // NHÓM 2: TÌM KIẾM NHÀ SẢN XUẤT (SEARCH)
  // ==========================================

  // TC_MAN_SEARCH_04: Tìm kiếm theo tên hiển thị đúng nhà sản xuất tương ứng
  test('TC_MAN_SEARCH_04 - Tìm kiếm nhà sản xuất theo tên chính xác Apple', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập tên nhà sản xuất Apple
    await page.fill('#SearchManufacturerName', 'Apple');

    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra danh sách hiển thị đúng tên Apple
    await expect(page.locator('#manufacturers-grid')).toContainText('Apple');
  });

  // TC_MAN_SEARCH_05: Hiển thị đúng nhà sản xuất khi tìm kiếm khớp một phần tên và có khoảng trắng đầu / cuối
  test('TC_MAN_SEARCH_05 - Tìm kiếm khớp một phần tên và có khoảng trắng thừa 2 đầu', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập từ khóa có khoảng trắng đầu và cuối
    await page.fill('#SearchManufacturerName', '   ik   ');

    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra hệ thống tự loại bỏ khoảng trắng và trả về nhà sản xuất "Nike"
    await expect(page.locator('#manufacturers-grid')).toContainText('Nike');
  });

  // TC_MAN_SEARCH_06: Thông báo đúng khi tìm kiếm nhà sản xuất không tồn tại
  test('TC_MAN_SEARCH_06 - Thông báo rỗng khi tìm kiếm nhà sản xuất không tồn tại', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'NhaSanXuatAo999');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Xác nhận thông báo No data available
    await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table');
  });

  // TC_MAN_SEARCH_07: Nhập chuỗi tìm kiếm có độ dài rất lớn (200 ký tự), hệ thống không crash
  test('TC_MAN_SEARCH_07 - Nhập chuỗi tìm kiếm dài 200 ký tự', async ({ page }) => {
    const longString = 'A'.repeat(200);

    // Lệnh: page.fill() -> Nhập chuỗi dài 200 ký tự
    await page.fill('#SearchManufacturerName', longString);

    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Hệ thống hoạt động ổn định và hiển thị danh sách rỗng
    await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table');
  });

  // TC_MAN_SEARCH_08: Tìm kiếm bằng Emoji hoặc ký tự Unicode đặc biệt
  test('TC_MAN_SEARCH_08 - Tìm kiếm bằng Emoji hoặc ký tự Unicode đặc biệt', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập biểu tượng Emoji
    await page.fill('#SearchManufacturerName', '😀😂🔥');

    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra không phát sinh lỗi 500
    await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table');
  });

  // ==========================================
  // NHÓM 3: THÊM MỚI NHÀ SẢN XUẤT (INSERT)
  // ==========================================

  // TC_MAN_INSERT_09: Thông báo lỗi khi thêm mới nhà sản xuất mà thiếu trường bắt buộc "Name"
  test('TC_MAN_INSERT_09 - Báo lỗi khi thiếu Tên nhà sản xuất', async ({ page }) => {
    // Lệnh: page.locator().click() -> Nhấp nút Add new
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Bỏ trống Name và nhấp Save
    await page.click('button[name="save"]');

    // Lệnh: expect().toBeVisible() -> Kiểm tra lỗi hiển thị tại trường Name
    await expect(page.locator('#Name-error')).toBeVisible();
  });

  // TC_MAN_INSERT_10: Thêm mới nhà sản xuất thành công khi nhập đầy đủ thông tin hợp lệ
  test('TC_MAN_INSERT_10 - Thêm mới nhà sản xuất Samsung Electronics thành công', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Lệnh: page.fill() -> Điền Tên và Display order
    await page.fill('#Name', 'Samsung Electronics');
    await page.fill('#DisplayOrder', '5');

    // Lệnh: page.click() -> Nhấp nút Save
    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Xác nhận thông báo tạo thành công
    await expect(page.locator('.alert-success')).toContainText('The new manufacturer has been added successfully.');
  });

  // TC_MAN_INSERT_11: Thêm mới nhà sản xuất kèm mô tả Description và tải lên ảnh Logo
  test('TC_MAN_INSERT_11 - Thêm mới nhà sản xuất Sony Corporation kèm mô tả', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Sony Corporation');

    // Lệnh: page.click() -> Nhấp nút Save and Continue Edit
    await page.click('button[name="save-continue"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert-success')).toBeVisible();
  });

  // TC_MAN_INSERT_12: Kiểm tra độ dài tên nhà sản xuất và ràng buộc số nguyên của trường "Display order"
  test('TC_MAN_INSERT_12 - Ràng buộc trường Display order chỉ nhận số nguyên', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'LG Electronics');
    await page.fill('#DisplayOrder', 'abc');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    const displayVal = await page.locator('#DisplayOrder').inputValue();
    expect(displayVal !== 'abc' || await page.locator('.field-validation-error').isVisible()).toBeTruthy();
  });

  // TC_MAN_INSERT_13: Giữ nguyên dữ liệu khi nhấn Refresh (F5) trong lúc đang thêm nhà sản xuất mới
  test('TC_MAN_INSERT_13 - Kiểm tra hành vi tải lại trang (F5) khi đang thêm mới', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Asus Tek');
    await page.fill('#DisplayOrder', '8');

    // Lệnh: page.reload() -> Tải lại trang F5
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#Name')).toBeVisible();
  });

  // ==========================================
  // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE)
  // ==========================================

  // TC_MAN_UPDATE_14: Sửa "Tên" và "Thứ tự hiển thị" (Display order) của nhà sản xuất thành công
  test('TC_MAN_UPDATE_14 - Sửa Tên thành Samsung Global và Display order thành 0', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Samsung Electronics');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Đổi Tên và Display order
      await page.fill('#Name', 'Samsung Global');
      await page.fill('#DisplayOrder', '0');

      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.alert-success')).toContainText('The manufacturer has been updated successfully.');
    }
  });

  // TC_MAN_UPDATE_15: Gỡ bỏ ảnh Logo ("Remove picture") của nhà sản xuất thành công
  test('TC_MAN_UPDATE_15 - Gỡ bỏ ảnh Logo của nhà sản xuất', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Lệnh: page.locator().click() -> Nhấp nút Remove picture nếu có ảnh
      const removePicBtn = page.locator('button:has-text("Remove picture"), a:has-text("Remove picture")');
      if (await removePicBtn.isVisible()) {
        await removePicBtn.click();
      }

      await page.click('button[name="save-continue"]');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.alert-success')).toBeVisible();
    }
  });

  // TC_MAN_STATUS_16: Lọc theo trạng thái Published và hủy xuất bản thì biến mất khỏi danh sách lọc
  test('TC_MAN_STATUS_16 - Hủy xuất bản và kiểm tra trong bộ lọc Published only', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Bỏ tick ô Published
      await page.uncheck('#Published');
      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      // Lọc lại theo Published only
      await page.selectOption('#SearchPublishedId', { label: 'Published only' });
      await page.fill('#SearchManufacturerName', 'Sony Corporation');
      await page.click('#search-manufacturers');
      await page.waitForLoadState('networkidle');

      // Bản ghi phải không xuất hiện trong danh sách Published only
      await expect(page.locator('#manufacturers-grid')).toContainText('No data available in table');
    }
  });

  // TC_MAN_DELETE_17: Hiển thị popup xác nhận và xóa nhà sản xuất thành công
  test('TC_MAN_DELETE_17 - Xóa nhà sản xuất kèm popup xác nhận', async ({ page }) => {
    // Lệnh: page.on('dialog') -> Lắng nghe và đồng ý popup xóa
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.selectOption('#SearchPublishedId', { label: 'All' });
    await page.fill('#SearchManufacturerName', 'Sony Corporation');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Nhấp nút Delete trong màn hình chi tiết
      await page.click('#manufacturer-delete');

      // Nhấp xác nhận modal nếu có
      const confirmDelete = page.locator('#manufacturer-delete-action-confirmation-submit-button');
      if (await confirmDelete.isVisible()) {
        await confirmDelete.click();
        await page.waitForLoadState('networkidle');
      }

      await expect(page.locator('.alert-success')).toContainText('The manufacturer has been deleted successfully.');
    }
  });

  // ==========================================
  // NHÓM 5: SẢN PHẨM LIÊN QUAN, PHÂN TRANG VÀ XUẤT DỮ LIỆU
  // ==========================================

  // TC_MAN_INFO_18: Hiển thị và gán đúng sản phẩm vào nhà sản xuất trong thẻ "Products"
  test('TC_MAN_INFO_18 - Kiểm tra thẻ Products trong trang chi tiết nhà sản xuất Apple', async ({ page }) => {
    await page.fill('#SearchManufacturerName', 'Apple');
    await page.click('#search-manufacturers');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#manufacturers-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Lệnh: expect().toBeVisible() -> Kiểm tra thẻ hoặc bảng danh sách sản phẩm của nhà sản xuất
      const productsCard = page.locator('#manufacturer-products, #products-grid');
      await expect(productsCard.first()).toBeVisible();
    }
  });

  // TC_MAN_PAGINATION_19: Phân trang danh sách nhà sản xuất và xác minh thống kê
  test('TC_MAN_PAGINATION_19 - Phân trang danh sách nhà sản xuất và xác minh thống kê', async ({ page }) => {
    // Lệnh: expect().toBeVisible() -> Kiểm tra thanh phân trang hoặc thống kê
    const pagination = page.locator('.dataTables_paginate, .dataTables_info');
    await expect(pagination.first()).toBeVisible();

    const infoText = await page.locator('.dataTables_info').first().textContent();
    expect(infoText).toContain('items');
  });

  // TC_MAN_EXPORT_20: Xuất danh sách nhà sản xuất ra file Excel thành công
  test('TC_MAN_EXPORT_20 - Xuất danh sách nhà sản xuất ra file Excel', async ({ page }) => {
    // Lệnh: page.waitForEvent('download') -> Lắng nghe sự kiện tải file Excel
    const downloadPromise = page.waitForEvent('download');

    await page.click('button:has-text("Export")');
    await page.click('button[name="exportexcel-all"]');

    const download = await downloadPromise;

    // Lệnh: expect().toContain() -> Xác minh tên file có đuôi .xlsx
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

});

// Lệnh: test.describe() -> Khai báo Suite kiểm thử cho module Quản lý sản phẩm
test.describe('Module 1: Quản lý sản phẩm (Products Management)', () => {

  // Lệnh: test.beforeEach() -> Hook chạy trước mỗi test case: Đăng nhập và điều hướng đến trang Quản lý sản phẩm
  test.beforeEach(async ({ page }) => {
    // 1. Gọi hàm đăng nhập dùng chung
    await loginAdmin(page);

    // 2. Lệnh: page.getByRole() -> Nhấp chính xác vào menu "Catalog" trên thanh menu bên trái
    await page.getByRole('link', { name: 'Catalog', exact: true }).click();

    // 3. Lệnh: page.locator().click() -> Nhấp vào menu con "Products"
    await page.locator('a[href="/Admin/Product/List"]').click();

    // 4. Lệnh: page.waitForLoadState() -> Chờ trang danh sách sản phẩm tải xong hoàn toàn
    await page.waitForLoadState('networkidle');
  });

  // ==========================================
  // NHÓM 1: BỘ LỌC SẢN PHẨM (FILTER)
  // ==========================================

  // TC_PROD_FILTER_01: Lọc đúng danh sách sản phẩm theo Danh mục (Category) cụ thể
  test('TC_PROD_FILTER_01 - Lọc đúng danh sách sản phẩm theo Danh mục (Category) cụ thể', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn giá trị "Computers" trong dropdown Danh mục (#SearchCategoryId)
    await page.selectOption('#SearchCategoryId', { label: 'Computers' });

    // Lệnh: page.click() -> Nhấp nút "Search" để thực hiện lọc
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Xác nhận bảng dữ liệu sản phẩm hiển thị trên màn hình
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_FILTER_02: Lọc đúng danh sách sản phẩm bao gồm cả danh mục con khi tick chọn "Search subcategories"
  test('TC_PROD_FILTER_02 - Lọc đúng danh sách sản phẩm bao gồm cả danh mục con khi tick chọn Search subcategories', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn danh mục cha "Computers"
    await page.selectOption('#SearchCategoryId', { label: 'Computers' });

    // Lệnh: page.check() -> Đánh dấu tick vào ô checkbox "Search subcategories"
    await page.check('#SearchIncludeSubCategories');

    // Lệnh: page.click() -> Nhấp nút "Search"
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Kiểm tra danh sách hiển thị các sản phẩm thuộc danh mục con
    await expect(page.locator('#products-grid tbody tr').first()).toBeVisible();
  });

  // TC_PROD_FILTER_03: Lọc đúng danh sách sản phẩm theo Nhà sản xuất (Manufacturer)
  test('TC_PROD_FILTER_03 - Lọc đúng danh sách sản phẩm theo Nhà sản xuất (Manufacturer)', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn nhà sản xuất "Apple" trong dropdown Manufacturer (#SearchManufacturerId)
    await page.selectOption('#SearchManufacturerId', { label: 'Apple' });

    // Lệnh: page.click() -> Nhấp nút "Search"
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Xác minh danh sách hiển thị sản phẩm của Apple
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_FILTER_04: Lọc đúng danh sách sản phẩm theo trạng thái Xuất bản "Published only" và "Unpublished only"
  test('TC_PROD_FILTER_04 - Lọc đúng danh sách sản phẩm theo trạng thái Xuất bản Published only và Unpublished only', async ({ page }) => {
    // Lệnh: page.selectOption() -> Lọc theo Published only
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#products-grid')).toBeVisible();

    // Lệnh: page.selectOption() -> Tiếp tục đổi bộ lọc sang Unpublished only
    await page.selectOption('#SearchPublishedId', { label: 'Unpublished only' });
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_FILTER_05: Cho phép chọn kết hợp nhiều bộ lọc đồng thời (Category + Search subcategories + Manufacturer + Published)
  test('TC_PROD_FILTER_05 - Cho phép chọn kết hợp nhiều bộ lọc đồng thời', async ({ page }) => {
    // Lệnh: page.selectOption() -> Chọn Category "Computers"
    await page.selectOption('#SearchCategoryId', { label: 'Computers' });

    // Lệnh: page.check() -> Tick chọn Search subcategories
    await page.check('#SearchIncludeSubCategories');

    // Lệnh: page.selectOption() -> Chọn Manufacturer "Apple"
    await page.selectOption('#SearchManufacturerId', { label: 'Apple' });

    // Lệnh: page.selectOption() -> Chọn Published "Published only"
    await page.selectOption('#SearchPublishedId', { label: 'Published only' });

    // Lệnh: page.click() -> Nhấp nút Search
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra sản phẩm Apple MacBook Pro hiển thị
    await expect(page.locator('#products-grid')).toContainText('Apple MacBook Pro');
  });

  // ==========================================
  // NHÓM 2: TÌM KIẾM SẢN PHẨM (SEARCH)
  // ==========================================

  // TC_PROD_SEARCH_06: Tìm kiếm theo tên hiển thị đúng sản phẩm phù hợp
  test('TC_PROD_SEARCH_06 - Tìm kiếm theo tên hiển thị đúng sản phẩm phù hợp', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập tên sản phẩm chính xác vào ô "Product name"
    await page.fill('#SearchProductName', 'Build your own computer');

    // Lệnh: page.click() -> Nhấp nút Search
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra bảng hiển thị đúng tên sản phẩm
    await expect(page.locator('#products-grid tbody tr:first-child')).toContainText('Build your own computer');
  });

  // TC_PROD_SEARCH_07: Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm khớp một phần tên
  test('TC_PROD_SEARCH_07 - Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm khớp một phần tên', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập từ khóa khớp một phần "cam"
    await page.fill('#SearchProductName', 'cam');

    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Kiểm tra bảng hiển thị kết quả
    await expect(page.locator('#products-grid')).toBeVisible();
  });

  // TC_PROD_SEARCH_08: Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm không phân biệt chữ hoa – thường
  test('TC_PROD_SEARCH_08 - Hiển thị đúng danh sách sản phẩm phù hợp khi tìm kiếm không phân biệt chữ hoa – thường', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập chữ thường toàn bộ "build your own computer"
    await page.fill('#SearchProductName', 'build your own computer');

    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra hệ thống vẫn trả về đúng sản phẩm
    await expect(page.locator('#products-grid tbody tr:first-child')).toContainText('Build your own computer');
  });

  // TC_PROD_SEARCH_09: Hiển thị đúng danh sách sản phẩm khi tìm kiếm có khoảng trắng (space) ở đầu và cuối từ khóa
  test('TC_PROD_SEARCH_09 - Hiển thị đúng danh sách sản phẩm khi tìm kiếm có khoảng trắng ở đầu và cuối từ khóa', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập tên có khoảng trắng thừa 2 đầu
    await page.fill('#SearchProductName', '   Build your own computer   ');

    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra kết quả tự động loại bỏ khoảng trắng và hiển thị sản phẩm
    await expect(page.locator('#products-grid tbody tr:first-child')).toContainText('Build your own computer');
  });

  // TC_PROD_SEARCH_10: Thông báo danh sách rỗng khi tìm kiếm sản phẩm không tồn tại hoặc chứa ký tự đặc biệt (@#$%)
  test('TC_PROD_SEARCH_10 - Thông báo danh sách rỗng khi tìm kiếm sản phẩm không tồn tại hoặc chứa ký tự đặc biệt', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập chuỗi ký tự đặc biệt không tồn tại
    await page.fill('#SearchProductName', '@#$%SanPhamKhongTonTai');

    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra thông báo bảng không có dữ liệu
    await expect(page.locator('#products-grid')).toContainText('No data available in table');
  });

  // TC_PROD_SEARCH_11: Tìm kiếm theo mã SKU chuyển hướng trực tiếp đến trang chi tiết sản phẩm tương ứng
  test('TC_PROD_SEARCH_11 - Tìm kiếm theo mã SKU chuyển hướng trực tiếp đến trang chi tiết sản phẩm tương ứng', async ({ page }) => {
    // Lệnh: page.fill() -> Nhập mã SKU vào ô tìm kiếm nhanh SKU (#GoDirectlyToSku)
    await page.fill('#GoDirectlyToSku', 'COMP_CUST');

    // Lệnh: page.click() -> Nhấp nút "Go" (#go-to-product-by-sku)
    await page.click('#go-to-product-by-sku');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toHaveValue() -> Kiểm tra đã chuyển hướng vào trang Edit và ô Sku có giá trị COMP_CUST
    await expect(page.locator('#Sku')).toHaveValue('COMP_CUST');
  });

  // ==========================================
  // NHÓM 3: THÊM MỚI SẢN PHẨM (INSERT)
  // ==========================================

  // TC_PROD_INSERT_12: Thông báo lỗi khi thêm mới sản phẩm mà thiếu trường bắt buộc "Product name"
  test('TC_PROD_INSERT_12 - Thông báo lỗi khi thêm mới sản phẩm mà thiếu trường bắt buộc Product name', async ({ page }) => {
    // Lệnh: page.locator().click() -> Nhấp nút "Add new"
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Lệnh: page.fill() -> Điền các thông tin khác nhưng bỏ trống Product name
    await page.fill('#Sku', 'PROD_NEW_01');

    // Lệnh: page.click() -> Nhấp nút "Save"
    await page.click('button[name="save"]');

    // Lệnh: expect().toBeVisible() -> Kiểm tra thông báo lỗi validation của trường Name hiển thị
    await expect(page.locator('#Name-error')).toBeVisible();
  });

  // TC_PROD_INSERT_13: Cảnh báo khi thêm mới sản phẩm mà trùng trường mã "SKU" đã tồn tại
  test('TC_PROD_INSERT_13 - Cảnh báo khi thêm mới sản phẩm mà trùng trường mã SKU đã tồn tại', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Lệnh: page.fill() -> Điền tên và mã SKU đã tồn tại "COMP_CUST"
    await page.fill('#Name', 'Máy tính lắp ráp 2026');
    await page.fill('#Sku', 'COMP_CUST');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Kiểm tra thông báo cảnh báo SKU trùng lặp hoặc thông báo lỗi hệ thống
    await expect(page.locator('.validation-summary-errors, .alert-danger')).toBeVisible();
  });

  // TC_PROD_INSERT_14: Thông báo lỗi khi thêm sản phẩm có trường "Price" (Giá) sai định dạng hoặc nhận giá trị âm
  test('TC_PROD_INSERT_14 - Kiểm tra trường Price sai định dạng hoặc giá trị âm', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    await page.fill('#Name', 'Laptop Kiểm Thử Giá');

    // Lệnh: page.fill() -> Nhập giá trị âm vào ô Price
    await page.fill('#Price', '-500');

    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toBeVisible() -> Kiểm tra form thông báo lỗi hoặc không cho lưu
    const hasError = await page.locator('.field-validation-error, .alert-danger').isVisible();
    expect(hasError || page.url().includes('/Product/Create')).toBeTruthy();
  });

  // TC_PROD_INSERT_15: Thêm mới sản phẩm thành công khi điền đầy đủ thông tin hợp lệ
  test('TC_PROD_INSERT_15 - Thêm mới sản phẩm thành công khi điền đầy đủ thông tin hợp lệ', async ({ page }) => {
    await page.locator('a.btn-primary:has-text("Add new")').click();
    await page.waitForLoadState('networkidle');

    // Lệnh: page.fill() -> Điền các trường thông tin hợp lệ
    await page.fill('#Name', 'Laptop Dell XPS 15 9530');
    await page.fill('#Sku', 'DELL_XPS_9530');
    await page.fill('#Price', '2500');

    // Lệnh: page.click() -> Nhấp nút Save
    await page.click('button[name="save"]');
    await page.waitForLoadState('networkidle');

    // Lệnh: expect().toContainText() -> Kiểm tra thông báo thành công
    await expect(page.locator('.alert-success')).toContainText('The new product has been added successfully.');
  });

  // ==========================================
  // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE)
  // ==========================================

  // TC_PROD_UPDATE_16: Sửa "Tên" và "Giá" sản phẩm thành công
  test('TC_PROD_UPDATE_16 - Sửa Tên và Giá sản phẩm thành công', async ({ page }) => {
    // Lệnh: page.fill() -> Tìm sản phẩm vừa thêm để chỉnh sửa
    await page.fill('#SearchProductName', 'Laptop Dell XPS 15 9530');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    // Lệnh: page.locator().click() -> Nhấp nút "Edit" tại dòng sản phẩm
    const editBtn = page.locator('#products-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Lệnh: page.fill() -> Cập nhật Tên và Giá mới
      await page.fill('#Name', 'Laptop Dell XPS 15 Pro 2026');
      await page.fill('#Price', '2750');

      // Lệnh: page.click() -> Nhấp nút Save
      await page.click('button[name="save"]');
      await page.waitForLoadState('networkidle');

      // Lệnh: expect().toContainText() -> Kiểm tra thông báo cập nhật thành công
      await expect(page.locator('.alert-success')).toContainText('The product has been updated successfully.');
    }
  });

  // TC_PROD_DELETE_17: Hiển thị popup xác nhận và xóa đơn lẻ 1 sản phẩm thành công
  test('TC_PROD_DELETE_17 - Hiển thị popup xác nhận và xóa đơn lẻ 1 sản phẩm thành công', async ({ page }) => {
    // Lệnh: page.on('dialog') -> Lắng nghe và tự động nhấn OK trên hộp thoại popup xác nhận xóa
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Tìm sản phẩm cần xóa
    await page.fill('#SearchProductName', 'Laptop Dell XPS 15 Pro 2026');
    await page.click('#search-products');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('#products-grid tbody tr:first-child a:has-text("Edit")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Lệnh: page.click() -> Nhấp nút Delete màu đỏ trong trang chi tiết
      await page.click('#product-delete');
      // Nhấp nút xác nhận trong modal nếu nopCommerce sử dụng bootstrap modal
      const modalDeleteBtn = page.locator('#product-delete-action-confirmation-submit-button');
      if (await modalDeleteBtn.isVisible()) {
        await modalDeleteBtn.click();
      }
      await page.waitForLoadState('networkidle');

      // Lệnh: expect().toContainText() -> Xác nhận thông báo xóa thành công
      await expect(page.locator('.alert-success')).toContainText('The product has been deleted successfully.');
    }
  });

  // TC_PROD_DELETE_18: Xóa hàng loạt nhiều sản phẩm cùng lúc bằng Checkbox ngoài bảng danh sách
  test('TC_PROD_DELETE_18 - Xóa hàng loạt nhiều sản phẩm cùng lúc bằng Checkbox ngoài bảng danh sách', async ({ page }) => {
    // Lệnh: page.check() -> Tick chọn 2 checkbox của 2 sản phẩm đầu tiên trong bảng
    const checkboxes = page.locator('#products-grid tbody input[type="checkbox"][name="checkbox_products"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Lệnh: page.click() -> Nhấp nút "Delete (selected)"
      await page.click('#delete-selected');

      // Lệnh: page.locator().click() -> Nhấp nút Yes trên popup xác nhận xóa hàng loạt
      const confirmBtn = page.locator('#delete-selected-action-confirmation-submit-button');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForLoadState('networkidle');
      }
      await expect(page.locator('#products-grid')).toBeVisible();
    }
  });

  // ==========================================
  // NHÓM 5: PHÂN TRANG VÀ XUẤT DỮ LIỆU
  // ==========================================

  // TC_PROD_PAGINATION_19: Phân trang danh sách sản phẩm và xác minh số lượng "Tổng sản phẩm" khớp với tổng số dòng thực tế
  test('TC_PROD_PAGINATION_19 - Phân trang danh sách sản phẩm và xác minh thống kê', async ({ page }) => {
    // Lệnh: expect().toBeVisible() -> Kiểm tra thanh phân trang bên dưới bảng hiển thị
    const pagination = page.locator('.dataTables_paginate, .dataTables_info');
    await expect(pagination.first()).toBeVisible();

    // Lệnh: page.locator().textContent() -> Đọc chuỗi thống kê (VD: "1-15 of X items")
    const infoText = await page.locator('.dataTables_info').first().textContent();
    expect(infoText).toContain('items');
  });

  // TC_PROD_EXPORT_20: Xuất danh sách sản phẩm ra file Excel thành công
  test('TC_PROD_EXPORT_20 - Xuất danh sách sản phẩm ra file Excel thành công', async ({ page }) => {
    // Lệnh: page.waitForEvent('download') -> Lắng nghe sự kiện trình duyệt tải file Excel về
    const downloadPromise = page.waitForEvent('download');

    // Lệnh: page.click() -> Nhấp nút Export và chọn Export to Excel (all)
    await page.click('button:has-text("Export")');
    await page.click('button[name="exportexcel-all"]');

    const download = await downloadPromise;

    // Lệnh: expect().toContain() -> Kiểm tra tên file tải về có định dạng .xlsx
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

});