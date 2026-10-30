/**
 * Module: Quản lý thông tin khách hàng (Customers Management) - nopCommerce Admin
 * Viết theo thao tác ghi bằng playwright codegen của người dùng, thứ tự theo bảng test case TC_CUST_*.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';

// ==========================================
// CẤU HÌNH VÀ DỮ LIỆU KIỂM THỬ (sửa tại đây cho khớp bảng test case)
// ==========================================
const BASE_URL = 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@yourstore.com';
const ADMIN_PASSWORD = 'admin';

const NO_DATA = 'No data available in table';
const REG_DATE = '2025-11-04'; // ô ngày nhận định dạng yyyy-mm-dd

// Khách hàng dùng cho nhóm INSERT / UPDATE / DELETE
const CUST_NEW_EMAIL = 'jamespan@nopCommerce.com';     // email khi thêm mới (TC_CUST_INSERT_13)
const CUST_UPDATED_EMAIL = 'jamespan2@nopCommerce.com'; // email sau khi cập nhật (TC_CUST_UPDATE_14)
const CUST_CONSISTENCY_EMAIL = 'qa_consistency@nopCommerce.com'; // khách hàng riêng cho TC_CUST_DELETE_17

// Khách hàng có sẵn trong CSDL của bạn (tài khoản admin luôn tồn tại). Sửa lại nếu muốn dùng khách hàng khác.
const CUST_EXISTING = { email: 'admin@yourStore.com', first: 'John', last: 'Smith', fullName: 'John Smith' };
// Email chắc chắn KHÔNG tồn tại trong hệ thống (dùng cho TC_CUST_SEARCH_10)
const EMAIL_NOT_EXIST = 'khongtontai@st.hcmuaf.edu.vn';

// ==========================================
// CÁC HÀM DÙNG CHUNG (HELPERS)
// ==========================================

// Lệnh: đăng nhập tài khoản Admin rồi vào trang Administration
async function loginAdmin(page) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Email:' }).fill(ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password:' }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
}

// Lệnh: mở lại trang Customer list (xóa hết điều kiện lọc đang nhập)
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

// Lệnh: Add new -> điền các trường được truyền vào -> Save
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

// Tạo khách hàng nếu chưa có (giúp test chạy độc lập, không phụ thuộc test trước)
async function ensureCustomer(page, email) {
    await openCustomerList(page);
    await searchByEmail(page, email);
    const found = await page.locator('#customers-grid tbody td', { hasText: email }).count();
    if (found === 0) {
        await openCustomerList(page);
        await addCustomer(page, { email });
    }
}

// Lệnh: tìm khách hàng theo email rồi nhấn Edit
async function openCustomerEdit(page, email) {
    await openCustomerList(page);
    await searchByEmail(page, email);
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await page.waitForLoadState('networkidle');
}

// Lệnh: nhấn Delete trên trang Edit rồi xác nhận trong hộp thoại
async function deleteOpenedCustomer(page) {
    await page.locator('#customer-delete').click();
    await page.getByRole('button', { name: 'Delete' }).last().click();
    await page.waitForLoadState('networkidle');
}

// Lệnh: Export -> Export to XML (all found), trả về file tải xuống
async function exportXml(page) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('button', { name: 'Export to XML (all found)' }).click();
    return await downloadPromise;
}

// =====================================================================
// MODULE: QUẢN LÝ THÔNG TIN KHÁCH HÀNG
// =====================================================================
test.describe('Quản lý thông tin khách hàng (Customers Management)', () => {

    // Lệnh: test.beforeEach() -> Đăng nhập và mở Customers --> Customer list
    test.beforeEach(async ({ page }) => {
        await loginAdmin(page);
        await page.getByRole('link', { name: 'Customers', exact: true }).click();
        await page.getByRole('link', { name: 'Customers' }).nth(1).click();
        await page.waitForLoadState('networkidle');
    });

    // ==========================================
    // NHÓM 1: BỘ LỌC KHÁCH HÀNG (FILTER)
    // ==========================================

    // TC_CUST_FILTER_01: Lọc danh sách khách hàng theo trạng thái Active
    test('TC_CUST_FILTER_01 - Lọc danh sách khách hàng theo trạng thái Active', async ({ page }) => {
        // Chọn Is active = yes
        await page.getByLabel('Is active').selectOption('True');
        await clickSearch(page);

        // Danh sách chỉ hiển thị khách hàng Active (không có biểu tượng Inactive)
        await expect(page.locator('#customers-grid')).toBeVisible();
        await expect(page.locator('#customers-grid tbody .false-icon')).toHaveCount(0);
    });

    // TC_CUST_FILTER_02: Lọc danh sách khách hàng theo trạng thái Inactive
    test('TC_CUST_FILTER_02 - Lọc danh sách khách hàng theo trạng thái Inactive', async ({ page }) => {
        // Chọn Is active = no
        await page.getByLabel('Is active').selectOption('False');
        await clickSearch(page);

        // Danh sách chỉ hiển thị khách hàng Inactive (hoặc trống), không phát sinh lỗi
        await expect(page.locator('#customers-grid')).toBeVisible();
        await expect(page.locator('#customers-grid tbody .true-icon')).toHaveCount(0);
    });

    // TC_CUST_FILTER_03: Lọc danh sách khách hàng theo vai trò khách hàng
    test('TC_CUST_FILTER_03 - Lọc danh sách khách hàng theo vai trò khách hàng', async ({ page }) => {
        // Chọn thêm vai trò "Guests" tại bộ lọc Customer roles
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

        // Kết quả thỏa mãn đồng thời các điều kiện
        await expect(page.locator('#customers-grid')).toContainText(/arthur_holmes@nopcommerce\.com/i);
    });

    // ==========================================
    // NHÓM 2: TÌM KIẾM KHÁCH HÀNG (SEARCH)
    // ==========================================

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

        // Hệ thống xử lý ổn định, bảng vẫn hiển thị
        await expect(page.locator('#customers-grid')).toBeVisible();
    });

    // TC_CUST_SEARCH_10: Hiển thị danh sách trống khi không tìm thấy khách hàng
    test('TC_CUST_SEARCH_10 - Hiển thị danh sách trống khi không tìm thấy khách hàng', async ({ page }) => {
        await searchByEmail(page, '23130385@st.hcmuaf.edu.vn');

        await expect(page.locator('#customers-grid')).toContainText(NO_DATA);
    });

    // ==========================================
    // NHÓM 3: THÊM MỚI KHÁCH HÀNG (INSERT)
    // ==========================================

    // TC_CUST_INSERT_11: Kiểm tra trường email khi thêm mới khách hàng
    test('TC_CUST_INSERT_11 - Kiểm tra trường email khi thêm mới khách hàng', async ({ page }) => {
        // Để trống Email, nhập các trường khác rồi Save
        await addCustomer(page, { password: '111', firstName: 'vinh', lastName: 'ngoc', male: true });

        // Hệ thống không lưu và hiển thị thông báo lỗi
        expect(page.url()).toContain('/Customer/Create');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger').first()).toBeVisible();
    });

    // TC_CUST_INSERT_12: Kiểm tra định dạng và tính duy nhất của email khách hàng
    test('TC_CUST_INSERT_12 - Kiểm tra định dạng và tính duy nhất của email khách hàng', async ({ page }) => {
        // Bước 1: email sai định dạng
        await addCustomer(page, { email: '#vinhdev@softtest.vn' });
        expect(page.url()).toContain('/Customer/Create');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger').first()).toBeVisible();

        // Bước 2: email đã được khách hàng khác sử dụng
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

        // Khách hàng mới tìm thấy được bằng email vừa nhập
        await openCustomerList(page);
        await searchByEmail(page, CUST_NEW_EMAIL);
        await expect(page.locator('#customers-grid')).toContainText(CUST_NEW_EMAIL, { ignoreCase: true });
    });

    // ==========================================
    // NHÓM 4: CẬP NHẬT VÀ XÓA (UPDATE & DELETE)
    // ==========================================

    // TC_CUST_UPDATE_14: Cập nhật thông tin khách hàng
    test('TC_CUST_UPDATE_14 - Cập nhật thông tin khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_NEW_EMAIL);
        await openCustomerEdit(page, CUST_NEW_EMAIL);

        // Đổi email rồi Save
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_UPDATED_EMAIL);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');

        // Mở lại bản ghi: email hiển thị giá trị đã cập nhật
        await openCustomerEdit(page, CUST_UPDATED_EMAIL);
        await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(CUST_UPDATED_EMAIL);
    });

    // TC_CUST_UPDATE_15: Thay đổi trạng thái tài khoản khách hàng
    test('TC_CUST_UPDATE_15 - Thay đổi trạng thái tài khoản khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_UPDATED_EMAIL);
        await openCustomerEdit(page, CUST_UPDATED_EMAIL);

        // Bỏ chọn Active rồi Save
        await page.getByRole('checkbox', { name: 'Active' }).uncheck();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');

        // Bộ lọc Is active = no phản ánh trạng thái mới
        await openCustomerList(page);
        await page.getByRole('textbox', { name: 'Email' }).fill(CUST_UPDATED_EMAIL);
        await page.getByLabel('Is active').selectOption('False');
        await clickSearch(page);
        await expect(page.locator('#customers-grid')).toContainText(CUST_UPDATED_EMAIL, { ignoreCase: true });

        // Khôi phục trạng thái Active
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

        // Tìm lại khách hàng vừa xóa
        await openCustomerList(page);
        await searchByEmail(page, CUST_UPDATED_EMAIL);
        await expect(page.locator('#customers-grid')).toContainText(NO_DATA);
    });

    // TC_CUST_DELETE_17: Kiểm tra tính nhất quán dữ liệu sau khi chỉnh sửa hoặc xóa khách hàng
    test('TC_CUST_DELETE_17 - Kiểm tra tính nhất quán dữ liệu sau khi chỉnh sửa hoặc xóa khách hàng', async ({ page }) => {
        await ensureCustomer(page, CUST_CONSISTENCY_EMAIL);

        // Bước 1: Export thông tin hiện tại của khách hàng
        await openCustomerList(page);
        await searchByEmail(page, CUST_CONSISTENCY_EMAIL);
        const download = await exportXml(page);
        expect(download.suggestedFilename()).toContain('.xml');

        // Bước 2: Chỉnh sửa, lưu, mở lại để đối chiếu
        await openCustomerEdit(page, CUST_CONSISTENCY_EMAIL);
        await page.getByRole('textbox', { name: 'First name' }).first().fill('Consistency');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-success')).toContainText('The customer has been updated successfully.');

        await openCustomerEdit(page, CUST_CONSISTENCY_EMAIL);
        await expect(page.getByRole('textbox', { name: 'First name' }).first()).toHaveValue('Consistency');

        // Bước 3: Xóa khách hàng và tìm lại
        await deleteOpenedCustomer(page);
        await openCustomerList(page);
        await searchByEmail(page, CUST_CONSISTENCY_EMAIL);
        await expect(page.locator('#customers-grid')).toContainText(NO_DATA);
    });

    // ==========================================
    // NHÓM 5: THÔNG TIN, XUẤT VÀ NHẬP DỮ LIỆU
    // ==========================================

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