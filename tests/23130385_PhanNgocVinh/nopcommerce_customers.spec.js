import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@yourstore.com';
const ADMIN_PASSWORD = 'admin';

const NO_DATA = 'No data available in table';
const REG_DATE = '2025-11-04';
const CUST_NEW_EMAIL = 'jamespan@nopCommerce.com';
const CUST_UPDATED_EMAIL = 'jamespan2@nopCommerce.com';
const CUST_CONSISTENCY_EMAIL = 'qa_consistency@nopCommerce.com';

const CUST_ARTHUR = { email: 'arthur_holmes@nopCommerce.com', first: 'Arthur', last: 'Holmes' }; // khách hàng dùng cho TC_CUST_FILTER/TEST_*
const CUST_STEVE = { email: 'steve_gates@nopCommerce.com', first: 'Steve', last: 'Gates' }; // khách hàng dùng cho TC_CUST_INFO/EXPORT

// Khách hàng có sẵn trong CSDL của bạn (tài khoản admin luôn tồn tại). Sửa lại nếu muốn dùng khách hàng khác.
const CUST_EXISTING = { email: 'admin@yourStore.com', first: 'John', last: 'Smith', fullName: 'John Smith' };
// Email chắc chắn KHÔNG tồn tại trong hệ thống (dùng cho TC_CUST_SEARCH_10)
const EMAIL_NOT_EXIST = 'khongtontai@st.hcmuaf.edu.vn';
async function loginAdmin(page) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Email:' }).fill(ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password:' }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
}
async function openCustomerList(page) {
    await page.goto(`${BASE_URL}/Admin/Customer/List`);
    await page.waitForLoadState('networkidle');
}

async function clickSearch(page) {
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle');
}

async function searchByEmail(page, email) {
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await clickSearch(page);
}

async function addCustomer(page, { email, password, firstName, lastName, male } = {}) {
    await page.getByRole('link', { name: 'Add new' }).click();
    await page.waitForLoadState('networkidle');
    if (email) await page.getByRole('textbox', { name: 'Email' }).fill(email);
    if (password) await page.getByRole('textbox', { name: 'Password' }).fill(password);
    if (firstName) await page.getByRole('textbox', { name: 'First name' }).fill(firstName);
    if (lastName) await page.getByRole('textbox', { name: 'Last name' }).fill(lastName);
    if (male) await page.getByRole('radio', { name: 'Male', exact: true }).check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
}

async function ensureCustomer(page, email) {
    await openCustomerList(page);
    await searchByEmail(page, email);
    const found = await page.locator('#customers-grid tbody td', { hasText: email }).count();
    if (found === 0) {
        await openCustomerList(page);
        await addCustomer(page, { email });
    }
}
async function openCustomerEdit(page, email) {
    await openCustomerList(page);
    await searchByEmail(page, email);
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await page.waitForLoadState('networkidle');
}

async function deleteOpenedCustomer(page) {
    await page.locator('#customer-delete').click();
    await page.getByRole('button', { name: 'Delete' }).last().click();
    await page.waitForLoadState('networkidle');
}

async function exportXml(page) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('button', { name: 'Export to XML (all found)' }).click();
    return await downloadPromise;
}
// MODULE: QUẢN LÝ THÔNG TIN KHÁCH HÀNG
test.describe('Quản lý thông tin khách hàng (Customers Management)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAdmin(page);
        await page.getByRole('link', { name: 'Customers', exact: true }).click();
        await page.getByRole('link', { name: 'Customers' }).nth(1).click();
        await page.waitForLoadState('networkidle');
    });
    // TC_CUST_FILTER_01: Lọc danh sách khách hàng theo trạng thái Active
    test('TC_CUST_FILTER_01 - Lọc danh sách khách hàng theo trạng thái Active', async ({ page }) => {
        await page.getByLabel('Is active').selectOption('True');
        await clickSearch(page);
        await expect(page.locator('#customers-grid')).toBeVisible();
        await expect(page.locator('#customers-grid tbody .false-icon')).toHaveCount(0);
    });
    // TC_CUST_FILTER_02: Lọc danh sách khách hàng theo trạng thái Inactive
    test('TC_CUST_FILTER_02 - Lọc danh sách khách hàng theo trạng thái Inactive', async ({ page }) => {
        await page.getByLabel('Is active').selectOption('False');
        await clickSearch(page);

        // Danh sách chỉ hiển thị khách hàng Inactive (hoặc trống), không phát sinh lỗi
        await expect(page.locator('#customers-grid')).toBeVisible();
        await expect(page.locator('#customers-grid tbody .true-icon')).toHaveCount(0);
    });

    // TC_CUST_FILTER_03: Lọc danh sách khách hàng theo vai trò khách hàng
    test('TC_CUST_FILTER_03 - Lọc danh sách khách hàng theo vai trò khách hàng', async ({ page }) => {
        await page.getByRole('searchbox').click();
        await page.getByRole('option', { name: 'Guests' }).click();
        await clickSearch(page);

        await expect(page.locator('#customers-grid')).toBeVisible();
    });

    // TC_CUST_FILTER_04: Lọc danh sách khách hàng theo khoảng thời gian đăng ký
    test('TC_CUST_FILTER_04 - Lọc danh sách khách hàng theo khoảng thời gian đăng ký', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Registration date from' }).fill(REG_DATE);
        await page.getByRole('textbox', { name: 'Registration date to' }).fill(REG_DATE);
        await clickSearch(page);

        await expect(page.locator('#customers-grid')).toBeVisible();
    });

    // TC_CUST_FILTER_05: Kết hợp nhiều điều kiện lọc khách hàng đồng thời
    test('TC_CUST_FILTER_05 - Kết hợp nhiều điều kiện lọc khách hàng đồng thời', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_ARTHUR.email);
        await page.getByRole('textbox', { name: 'First name' }).fill(CUST_ARTHUR.first);
        await page.getByRole('textbox', { name: 'Last name' }).fill(CUST_ARTHUR.last);
        await clickSearch(page);
        await expect(page.locator('#customers-grid')).toContainText(/arthur_holmes@nopcommerce\.com/i);
    });
    // TC_CUST_SEARCH_06: Tìm kiếm khách hàng theo email chính xác
    test('TC_CUST_SEARCH_06 - Tìm kiếm khách hàng theo email chính xác', async ({ page }) => {
        await searchByEmail(page, CUST_ARTHUR.email);

        await expect(page.locator('#customers-grid')).toContainText(/arthur_holmes@nopcommerce\.com/i);
    });

    // TC_CUST_SEARCH_07: Tìm kiếm khách hàng theo họ hoặc tên
    test('TC_CUST_SEARCH_07 - Tìm kiếm khách hàng theo họ hoặc tên', async ({ page }) => {
        await page.getByRole('textbox', { name: 'First name' }).fill(CUST_STEVE.first);
        await page.getByRole('textbox', { name: 'Last name' }).fill(CUST_STEVE.last);
        await clickSearch(page);

        await expect(page.locator('#customers-grid')).toContainText('Steve Gates');
    });

    // TC_CUST_SEARCH_08: Tìm kiếm khách hàng bằng cách kết hợp email, họ và tên
    test('TC_CUST_SEARCH_08 - Tìm kiếm khách hàng bằng cách kết hợp email, họ và tên', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_STEVE.email);
        await page.getByRole('textbox', { name: 'First name' }).fill(CUST_STEVE.first);
        await page.getByRole('textbox', { name: 'Last name' }).fill(CUST_STEVE.last);
        await clickSearch(page);

        await expect(page.locator('#customers-grid')).toContainText(/steve_gates@nopcommerce\.com/i);
    });

    // TC_CUST_SEARCH_09: Tìm kiếm khách hàng theo địa chỉ IP
    test('TC_CUST_SEARCH_09 - Tìm kiếm khách hàng theo địa chỉ IP', async ({ page }) => {
        await page.getByRole('textbox', { name: 'IP address' }).fill('172.0.0.1.1010');
        await clickSearch(page);
        await expect(page.locator('#customers-grid')).toBeVisible();
    });

    // TC_CUST_SEARCH_10: Hiển thị danh sách trống khi không tìm thấy khách hàng
    test('TC_CUST_SEARCH_10 - Hiển thị danh sách trống khi không tìm thấy khách hàng', async ({ page }) => {
        await searchByEmail(page, '23130385@st.hcmuaf.edu.vn');

        await expect(page.locator('#customers-grid')).toContainText(NO_DATA);
    });
    // TC_CUST_INSERT_11: Kiểm tra trường email khi thêm mới khách hàng
    test('TC_CUST_INSERT_11 - Kiểm tra trường email khi thêm mới khách hàng', async ({ page }) => {
        await addCustomer(page, { password: '111', firstName: 'vinh', lastName: 'ngoc', male: true });
        expect(page.url()).toContain('/Customer/Create');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger').first()).toBeVisible();
    });

    // TC_CUST_INSERT_12: Kiểm tra định dạng và tính duy nhất của email khách hàng
    test('TC_CUST_INSERT_12 - Kiểm tra định dạng và tính duy nhất của email khách hàng', async ({ page }) => {
        await addCustomer(page, { email: '#vinhdev@softtest.vn' });
        expect(page.url()).toContain('/Customer/Create');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger').first()).toBeVisible();
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_STEVE.email);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain('/Customer/Create');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger').first()).toBeVisible();
    });

    // TC_CUST_INSERT_13: Thêm mới khách hàng thành công với dữ liệu hợp lệ
    test('TC_CUST_INSERT_13 - Thêm mới khách hàng thành công với dữ liệu hợp lệ', async ({ page }) => {
        await addCustomer(page, { email: CUST_NEW_EMAIL });

        await expect(page.locator('.alert-success')).toContainText('The new customer has been added successfully.');
        await openCustomerList(page);
        await searchByEmail(page, CUST_NEW_EMAIL);
        await expect(page.locator('#customers-grid')).toContainText(CUST_NEW_EMAIL, { ignoreCase: true });
    });

    // TC_CUST_UPDATE_14: Cập nhật thông tin khách hàng
    test('TC_CUST_UPDATE_14 - Cập nhật thông tin khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_NEW_EMAIL);
        await openCustomerEdit(page, CUST_NEW_EMAIL);
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_UPDATED_EMAIL);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');
        await openCustomerEdit(page, CUST_UPDATED_EMAIL);
        await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(CUST_UPDATED_EMAIL);
    });

    // TC_CUST_UPDATE_15: Thay đổi trạng thái tài khoản khách hàng
    test('TC_CUST_UPDATE_15 - Thay đổi trạng thái tài khoản khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_UPDATED_EMAIL);
        await openCustomerEdit(page, CUST_UPDATED_EMAIL);

        await page.getByRole('checkbox', { name: 'Active' }).uncheck();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');

        await openCustomerList(page);
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_UPDATED_EMAIL);
        await page.getByLabel('Is active').selectOption('False');
        await clickSearch(page);
        await expect(page.locator('#customers-grid')).toContainText(CUST_UPDATED_EMAIL, { ignoreCase: true });

        await openCustomerEdit(page, CUST_UPDATED_EMAIL);
        await page.getByRole('checkbox', { name: 'Active' }).check();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');
    });

    // TC_CUST_DELETE_16: Xóa một khách hàng
    test('TC_CUST_DELETE_16 - Xóa một khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_UPDATED_EMAIL);
        await openCustomerEdit(page, CUST_UPDATED_EMAIL);

        await deleteOpenedCustomer(page);
        await expect(page.locator('.alert-success')).toContainText('The customer has been deleted successfully.');
        await openCustomerList(page);
        await searchByEmail(page, CUST_UPDATED_EMAIL);
        await expect(page.locator('#customers-grid')).toContainText(NO_DATA);
    });
    // TC_CUST_DELETE_17: Kiểm tra tính nhất quán dữ liệu sau khi chỉnh sửa hoặc xóa khách hàng
    test('TC_CUST_DELETE_17 - Kiểm tra tính nhất quán dữ liệu sau khi chỉnh sửa hoặc xóa khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_CONSISTENCY_EMAIL);
        await openCustomerList(page);
        await searchByEmail(page, CUST_CONSISTENCY_EMAIL);
        const download = await exportXml(page);
        expect(download.suggestedFilename()).toContain('.xml');
        await openCustomerEdit(page, CUST_CONSISTENCY_EMAIL);
        await page.getByRole('textbox', { name: 'First name' }).first().fill('Consistency');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');

        await openCustomerEdit(page, CUST_CONSISTENCY_EMAIL);
        await expect(page.getByRole('textbox', { name: 'First name' }).first()).toHaveValue('Consistency');
        await deleteOpenedCustomer(page);
        await openCustomerList(page);
        await searchByEmail(page, CUST_CONSISTENCY_EMAIL);
        await expect(page.locator('#customers-grid')).toContainText(NO_DATA);
    });
    // TC_CUST_INFO_18: Hiển thị chính xác thông tin khách hàng trong danh sách
    test('TC_CUST_INFO_18 - Hiển thị chính xác thông tin khách hàng trong danh sách', async ({ page }) => {
        await searchByEmail(page, CUST_STEVE.email);

        // Đối chiếu Email, Name, Customer roles và Active trên cùng một dòng
        const row = page.locator('#customers-grid tbody tr:first-child');
        await expect(row).toContainText(/steve_gates@nopcommerce\.com/i);
        await expect(row).toContainText('Steve Gates');
        await expect(row).toContainText('Registered');
        await expect(row.locator('.true-icon')).toBeVisible();
    });

    // TC_CUST_EXPORT_19: Xuất danh sách khách hàng và kiểm tra dữ liệu trong tệp
    test('TC_CUST_EXPORT_19 - Xuất danh sách khách hàng và kiểm tra dữ liệu trong tệp', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_STEVE.email);
        await page.getByRole('textbox', { name: 'First name' }).fill(CUST_STEVE.first);
        await page.getByRole('textbox', { name: 'Last name' }).fill(CUST_STEVE.last);
        await clickSearch(page);

        const download = await exportXml(page);

        // Tệp được tải xuống và chứa đúng dữ liệu đã lọc
        expect(download.suggestedFilename()).toContain('.xml');
        const content = fs.readFileSync(await download.path(), 'utf8');
        expect(content.toLowerCase()).toContain('steve_gates@nopcommerce.com');
    });

    // TC_CUST_IMPORT_20: Nhập dữ liệu khách hàng từ tệp
    test('TC_CUST_IMPORT_20 - Nhập dữ liệu khách hàng từ tệp', async ({ page }) => {
        // Cần chuẩn bị sẵn tệp nhập theo định dạng nopCommerce hỗ trợ
        const importFile = './test-data/customers_import.xlsx';
        test.skip(!fs.existsSync(importFile), 'Chưa có tệp test-data/customers_import.xlsx');

        await page.getByRole('button', { name: 'Import' }).click();
        await page.setInputFiles('input[type="file"]', importFile);
        await page.getByRole('button', { name: 'Import' }).last().click();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.alert-success, .alert-danger').first()).toBeVisible();
    });

});