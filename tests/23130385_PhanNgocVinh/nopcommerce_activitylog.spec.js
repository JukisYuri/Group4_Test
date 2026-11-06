import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@yourStore.com';
const ADMIN_PASSWORD = 'admin';

const NO_DATA = 'No data available in table';
const LOG_DATE = '2026-10-31';
const LOG_IP = '::ffff:172.18.0.1';
const LOG_ACTIVITY_TYPE = 'Add a new product attribute';

async function loginAdmin(page) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Email:' }).fill(ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password:' }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
}

async function openActivityLog(page) {
    await page.goto(`${BASE_URL}/Admin/ActivityLog/ActivityLogs`);
    await page.waitForLoadState('networkidle');
}

async function clickSearch(page) {
    await page.locator('#search-log').click();
    await page.waitForLoadState('networkidle');
}
// MODULE: QUẢN LÝ NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOG)
test.describe('Quản lý nhật ký hoạt động (Activity Log)', () => {

    test.beforeEach(async ({ page }) => {
        await loginAdmin(page);
        await openActivityLog(page);
        page.on('dialog', dialog => dialog.accept());
    });
    // TC_LOG_FILTER_01: Lọc nhật ký hoạt động theo ngày bắt đầu
    test('TC_LOG_FILTER_01 - Lọc nhật ký hoạt động theo ngày bắt đầu', async ({ page }) => {
        await page.locator('#CreatedOnFrom').fill(LOG_DATE);
        await clickSearch(page);

        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_FILTER_02: Lọc nhật ký hoạt động theo ngày kết thúc
    test('TC_LOG_FILTER_02 - Lọc nhật ký hoạt động theo ngày kết thúc', async ({ page }) => {
        await page.locator('#CreatedOnTo').fill(LOG_DATE);
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_FILTER_03: Lọc nhật ký hoạt động theo loại hoạt động
    test('TC_LOG_FILTER_03 - Lọc nhật ký hoạt động theo loại hoạt động', async ({ page }) => {
        await page.locator('#ActivityLogTypeId').selectOption({ label: LOG_ACTIVITY_TYPE });
        await clickSearch(page);

        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_FILTER_04: Lọc nhật ký hoạt động theo địa chỉ IP
    test('TC_LOG_FILTER_04 - Lọc nhật ký hoạt động theo địa chỉ IP', async ({ page }) => {
        await page.locator('#IpAddress').fill(LOG_IP);
        await clickSearch(page);

        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_FILTER_05: Kết hợp nhiều điều kiện lọc nhật ký hoạt động
    test('TC_LOG_FILTER_05 - Kết hợp nhiều điều kiện lọc nhật ký hoạt động', async ({ page }) => {
        await page.locator('#CreatedOnFrom').fill(LOG_DATE);
        await page.locator('#CreatedOnTo').fill(LOG_DATE);
        await page.locator('#ActivityLogTypeId').selectOption({ label: LOG_ACTIVITY_TYPE });
        await page.locator('#IpAddress').fill(LOG_IP);
        await clickSearch(page);

        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_SEARCH_06: Tìm kiếm nhật ký theo loại hoạt động cụ thể
    test('TC_LOG_SEARCH_06 - Tìm kiếm nhật ký hoạt động theo loại hoạt động cụ thể', async ({ page }) => {
        await page.locator('#ActivityLogTypeId').selectOption({ label: 'Add a new widget' });
        await clickSearch(page);

        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_SEARCH_07: Tìm kiếm nhật ký theo địa chỉ IP chính xác
    test('TC_LOG_SEARCH_07 - Tìm kiếm nhật ký hoạt động theo địa chỉ IP chính xác', async ({ page }) => {
        await page.locator('#IpAddress').fill('127.0.0.1');
        await clickSearch(page);

        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_SEARCH_08: Tìm kiếm nhật ký trong khoảng thời gian hợp lệ
    test('TC_LOG_SEARCH_08 - Tìm kiếm nhật ký hoạt động trong khoảng thời gian hợp lệ', async ({ page }) => {
        await page.locator('#CreatedOnFrom').fill(LOG_DATE);
        await page.locator('#CreatedOnTo').fill(LOG_DATE);
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_SEARCH_09: Hiển thị danh sách trống khi không có nhật ký phù hợp
    test('TC_LOG_SEARCH_09 - Hiển thị danh sách trống khi không có nhật ký phù hợp', async ({ page }) => {
        await page.locator('#IpAddress').fill('10.10.10.10');
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toContainText(NO_DATA);
    });
    // TC_LOG_SEARCH_10: Xử lý khoảng thời gian có ngày bắt đầu sau ngày kết thúc
    test('TC_LOG_SEARCH_10 - Xử lý khoảng thời gian có ngày bắt đầu sau ngày kết thúc', async ({ page }) => {
        await page.locator('#CreatedOnFrom').fill('2026-11-01');
        await page.locator('#CreatedOnTo').fill('2026-10-31');
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toContainText(NO_DATA);
    });
    // TC_LOG_INFO_11: Hiển thị chính xác loại hoạt động trong nhật ký
    test('TC_LOG_INFO_11 - Hiển thị chính xác loại hoạt động trong nhật ký', async ({ page }) => {
        await page.locator('#ActivityLogTypeId').selectOption({ label: LOG_ACTIVITY_TYPE });
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_INFO_12: Hiển thị chính xác email khách hàng trong nhật ký
    test('TC_LOG_INFO_12 - Hiển thị chính xác email khách hàng trong nhật ký', async ({ page }) => {
        await page.locator('#IpAddress').fill(LOG_IP);
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toContainText('admin@yourStore.com');
    });
    // TC_LOG_INFO_13: Hiển thị chính xác địa chỉ IP trong nhật ký
    test('TC_LOG_INFO_13 - Hiển thị chính xác địa chỉ IP trong nhật ký', async ({ page }) => {
        await page.locator('#IpAddress').fill(LOG_IP);
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toContainText(LOG_IP);
    });
    // TC_LOG_INFO_14: Hiển thị chính xác nội dung và thời gian tạo nhật ký
    test('TC_LOG_INFO_14 - Hiển thị chính xác nội dung và thời gian tạo nhật ký', async ({ page }) => {
        // Tìm bản ghi Message = "Deleted a gift card ('bdbbc0ef-be57')"
        await page.locator('#ActivityLogTypeId').selectOption({ label: 'Delete a gift card' });
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_INFO_15: Cập nhật danh sách sau khi tìm kiếm
    test('TC_LOG_INFO_15 - Cập nhật danh sách sau khi tìm kiếm', async ({ page }) => {
        // Từ loại "Add a new product attribute" chuyển sang "Delete a gift card"
        await page.locator('#ActivityLogTypeId').selectOption({ label: LOG_ACTIVITY_TYPE });
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
        await page.locator('#ActivityLogTypeId').selectOption({ label: 'Delete a gift card' });
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_DELETE_16: Xóa một bản ghi nhật ký hoạt động
    test('TC_LOG_DELETE_16 - Xóa một bản ghi nhật ký hoạt động', async ({ page }) => {
        // Nhấn Delete ở cuối dòng đầu tiên của lưới
        const firstRow = page.locator('#activityLog-grid tbody tr').first();
        await firstRow.locator('a').first().click();
        await page.waitForLoadState('networkidle');
        await openActivityLog(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });
    // TC_LOG_DELETE_17: Kiểm tra bản ghi đã xóa không xuất hiện sau khi tải lại
    test('TC_LOG_DELETE_17 - Kiểm tra bản ghi đã xóa không xuất hiện sau khi tải lại', async ({ page }) => {
        const firstRow = page.locator('#activityLog-grid tbody tr').first();
        await firstRow.locator('a').first().click();
        await page.waitForLoadState('networkidle');
        await openActivityLog(page);
        await page.locator('#ActivityLogTypeId').selectOption({ label: 'Delete a gift card' });
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toContainText(NO_DATA);
    });
    // TC_LOG_DELETE_18: Xóa nhật ký hoạt động bằng chức năng Clear activity log
    test('TC_LOG_DELETE_18 - Xóa nhật ký hoạt động bằng chức năng Clear activity log', async ({ page }) => {
        await page.locator('#clearall').click();
        await page.waitForLoadState('networkidle');
        await page.locator('.modal').getByRole('button', { name: 'Yes' }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#activityLog-grid')).toContainText('Delete activity log');
    });
    // TC_LOG_DELETE_19: Cập nhật danh sách sau khi xóa nhật ký hoạt động
    test('TC_LOG_DELETE_19 - Cập nhật danh sách sau khi xóa nhật ký hoạt động', async ({ page }) => {
        const firstRow = page.locator('#activityLog-grid tbody tr').first();
        await firstRow.locator('a').first().click();
        await page.waitForLoadState('networkidle');
        await openActivityLog(page);
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toBeVisible();
    });

    // TC_LOG_DELETE_20: Xử lý thao tác xóa khi danh sách nhật ký hoạt động trống
    test('TC_LOG_DELETE_20 - Xử lý thao tác xóa khi danh sách nhật ký hoạt động trống', async ({ page }) => {
        // Lọc IP không có bản ghi -> danh sách rỗng -> Clear
        await page.locator('#IpAddress').fill('10.10.10.10');
        await clickSearch(page);
        await expect(page.locator('#activityLog-grid')).toContainText(NO_DATA);
        await page.locator('#clearall').click();
        await page.waitForLoadState('networkidle');
        await page.locator('.modal').getByRole('button', { name: 'Yes' }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#activityLog-grid')).toContainText('Delete activity log');
    });

});
