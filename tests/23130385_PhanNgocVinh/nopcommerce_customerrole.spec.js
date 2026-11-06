import { test, expect } from '@playwright/test';
const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yourstore.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const NO_DATA = 'No data available in table';
async function loginAdmin(page) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Email:' }).fill(ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password:' }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
}
async function openCustomerRoleList(page) {
    await page.goto(`${BASE_URL}/Admin/CustomerRole/List`);
    await page.waitForLoadState('networkidle');
}
async function openCustomerRoleCreate(page) {
    await page.goto(`${BASE_URL}/Admin/CustomerRole/Create`);
    await page.waitForLoadState('networkidle');
}
async function openCustomerRoleEditByName(page, name) {
    await openCustomerRoleList(page);
    const row = page.locator('#customerroles-grid tbody tr').filter({ hasText: name }).first();
    await row.getByRole('link', { name: 'Edit' }).click();
    await page.waitForLoadState('networkidle');
}

async function clickSave(page) {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
}

async function clickSaveAndContinueEdit(page) {
    await page.getByRole('button', { name: 'Save and Continue Edit' }).click();
    await page.waitForLoadState('networkidle');
}

async function deleteOpenedRole(page) {
    await page.locator('#customerrole-delete').click();
    await page.locator('#customerrolemodel-Delete-delete-confirmation .modal-footer button').click();
    await page.waitForLoadState('networkidle');
}

async function createCustomerRole(page, { name, active = true, freeShipping = false, taxExempt = false } = {}) {
    await openCustomerRoleCreate(page);
    if (name) await page.locator('#Name').fill(name);
    if (active) await page.locator('#Active').check();
    if (freeShipping) await page.locator('#FreeShipping').check();
    if (taxExempt) await page.locator('#TaxExempt').check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
}

// MODULE: QUẢN LÝ VAI TRÒ KHÁCH HÀNG (CUSTOMER ROLES)
test.describe('Quản lý vai trò khách hàng (Customer Roles)', () => {

    test.beforeEach(async ({ page }) => {
        await loginAdmin(page);
        await openCustomerRoleList(page);
        page.on('dialog', dialog => dialog.accept());
    });
    // TC_ROLE_INFO_01: Hiển thị chính xác danh sách vai trò khách hàng
    test('TC_ROLE_INFO_01 - Hiển thị chính xác danh sách vai trò khách hàng', async ({ page }) => {
        const grid = page.locator('#customerroles-grid');
        await expect(grid).toBeVisible();
        await expect(grid).toContainText('Administrators');
        await expect(grid).toContainText('Registered');
        await expect(grid).toContainText('Guests');
        await expect(grid).toContainText('Vendors');
        await expect(grid).toContainText('Forum Moderators');
    });
    // TC_ROLE_INFO_02: Hiển thị chính xác tên vai trò khách hàng trong danh sách
    test('TC_ROLE_INFO_02 - Hiển thị chính xác tên vai trò khách hàng trong danh sách', async ({ page }) => {
        // Vai trò hệ thống Registered có ID = 2
        await openCustomerRoleEditByName(page, 'Registered');
        await expect(page.locator('#Name')).toHaveValue('Registered');
    });
    // TC_ROLE_INFO_03: Hiển thị chính xác trạng thái Active của từng vai trò
    test('TC_ROLE_INFO_03 - Hiển thị chính xác trạng thái Active của từng vai trò', async ({ page }) => {
        // Vai trò hệ thống Registered có ID = 2, mọi vai trò hệ thống đều Active = Yes
        await openCustomerRoleEditByName(page, 'Registered');
        await expect(page.locator('#Active')).toBeChecked();
    });
    // TC_ROLE_INFO_04: Hiển thị chính xác thuộc tính Free shipping và Tax exempt
    test('TC_ROLE_INFO_04 - Hiển thị chính xác thuộc tính Free shipping và Tax exempt', async ({ page }) => {
        // Vai trò hệ thống Registered có ID = 2, Free shipping = No, Tax exempt = No
        await openCustomerRoleEditByName(page, 'Registered');
        await expect(page.locator('#FreeShipping')).not.toBeChecked();
        await expect(page.locator('#TaxExempt')).not.toBeChecked();
    });
    // TC_ROLE_INFO_05: Hiển thị chính xác System name và Is system role
    test('TC_ROLE_INFO_05 - Hiển thị chính xác System name và Is system role', async ({ page }) => {
        // Vai trò hệ thống Administrators có ID = 1
        await openCustomerRoleEdit(page, 1);
        await expect(page.locator('#IsSystemRole')).toHaveValue('True');
    });
    // TC_ROLE_INSERT_06: Kiểm tra trường Name bắt buộc khi thêm vai trò khách hàng
    test('TC_ROLE_INSERT_06 - Kiểm tra trường Name bắt buộc khi thêm vai trò khách hàng', async ({ page }) => {
        await openCustomerRoleCreate(page);
        await page.locator('#Active').check();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/CustomerRole/Create');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger')).toContainText('Please provide a name.');
    });
    // TC_ROLE_INSERT_07: Hiển thị thông báo khi bỏ trống tên vai trò khách hàng
    test('TC_ROLE_INSERT_07 - Hiển thị thông báo khi bỏ trống tên vai trò khách hàng', async ({ page }) => {
        await openCustomerRoleCreate(page);
        await page.locator('#FreeShipping').check();
        await page.locator('#TaxExempt').check();
        await page.locator('#Active').check();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.validation-summary-errors, .field-validation-error, .alert-danger')).toContainText('Please provide a name.');
    });
    // TC_ROLE_INSERT_08: Thêm mới vai trò khách hàng với tên hợp lệ
    test('TC_ROLE_INSERT_08 - Thêm mới vai trò khách hàng với tên hợp lệ', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role', active: true, freeShipping: true, taxExempt: false });
        await expect(page.locator('.alert-success')).toContainText('The new customer role has been added successfully.');
    });
    // TC_ROLE_INSERT_09: Kiểm tra xử lý khi tạo vai trò có tên trùng
    test('TC_ROLE_INSERT_09 - Kiểm tra xử lý khi tạo vai trò có tên trùng', async ({ page }) => {
        await createCustomerRole(page, { name: 'Registered', active: true });
        await expect(page.locator('.alert-success')).toContainText('The new customer role has been added successfully.');
    });
    // TC_ROLE_INSERT_10: Kiểm tra trạng thái Active mặc định khi thêm vai trò
    test('TC_ROLE_INSERT_10 - Kiểm tra trạng thái Active mặc định khi thêm vai trò', async ({ page }) => {
        await openCustomerRoleCreate(page);
        await expect(page.locator('#Active')).toBeChecked();
        await page.locator('#Name').fill('QA_Role_Default');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.alert-success')).toContainText('The new customer role has been added successfully.');
    });
    // TC_ROLE_UPDATE_11: Cập nhật tên vai trò khách hàng
    test('TC_ROLE_UPDATE_11 - Cập nhật tên vai trò khách hàng', async ({ page }) => {
        // Tạo vai trò mới rồi mở lại để cập nhật
        await createCustomerRole(page, { name: 'QA_Test_Role', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await page.locator('#Name').fill('QA_Test_Role_Updated');
        await clickSave(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
    });
    // TC_ROLE_UPDATE_12: Cập nhật trạng thái Active của vai trò khách hàng
    test('TC_ROLE_UPDATE_12 - Cập nhật trạng thái Active của vai trò khách hàng', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await page.locator('#Active').uncheck();
        await clickSave(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await expect(page.locator('#Active')).not.toBeChecked();
    });
    // TC_ROLE_UPDATE_13: Cập nhật thuộc tính Free shipping và Tax exempt
    test('TC_ROLE_UPDATE_13 - Cập nhật thuộc tính Free shipping và Tax exempt', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role', active: true, freeShipping: true, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await page.locator('#FreeShipping').uncheck();
        await page.locator('#TaxExempt').check();
        await clickSave(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await expect(page.locator('#FreeShipping')).not.toBeChecked();
        await expect(page.locator('#TaxExempt')).toBeChecked();
    });
    // TC_ROLE_UPDATE_14: Cập nhật cấu hình Override default tax display type và Enable password lifetime
    test('TC_ROLE_UPDATE_14 - Cập nhật cấu hình Override default tax display type và Enable password lifetime', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await page.locator('#OverrideTaxDisplayType').selectOption('Yes');
        await page.locator('#DefaultTaxDisplayTypeId').selectOption({ label: 'Excluding tax' });
        await page.locator('#EnablePasswordLifetime').check();
        await clickSave(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
    });
    // TC_ROLE_UPDATE_15: Lưu thay đổi vai trò bằng Save hoặc Save and Continue Edit
    test('TC_ROLE_UPDATE_15 - Lưu thay đổi vai trò bằng Save hoặc Save and Continue Edit', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role');
        await page.locator('#Name').fill('QA_Test_Role_Save');
        await clickSave(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
        await openCustomerRoleEditByName(page, 'QA_Test_Role_Save');
        await page.locator('#Name').fill('QA_Test_Role_SaveContinue');
        await clickSaveAndContinueEdit(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
    });

    // TC_ROLE_UPDATE_20: Kiểm tra tính nhất quán dữ liệu vai trò sau khi chỉnh sửa hoặc xóa
    test('TC_ROLE_UPDATE_20 - Kiểm tra tính nhất quán dữ liệu vai trò sau khi chỉnh sửa hoặc xóa', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role_Consistency', active: true, freeShipping: true, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role_Consistency');
        await page.locator('#FreeShipping').uncheck();
        await page.locator('#TaxExempt').check();
        await clickSave(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been updated successfully.');
        await openCustomerRoleEditByName(page, 'QA_Test_Role_Consistency');
        await expect(page.locator('#FreeShipping')).not.toBeChecked();
        await expect(page.locator('#TaxExempt')).toBeChecked();
    });
    // TC_ROLE_DELETE_16: Xóa vai trò khách hàng có thể xóa
    test('TC_ROLE_DELETE_16 - Xóa vai trò khách hàng có thể xóa', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role_Delete', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role_Delete');
        await deleteOpenedRole(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been deleted successfully.');
    });
    // TC_ROLE_DELETE_17: Kiểm tra xác nhận khi xóa vai trò khách hàng
    test('TC_ROLE_DELETE_17 - Kiểm tra xác nhận khi xóa vai trò khách hàng', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role_Confirm', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role_Confirm');
        await page.locator('#customerrole-delete').click();
        const modal = page.locator('#customerrolemodel-Delete-delete-confirmation');
        await modal.getByRole('button', { name: 'No, cancel' }).click();
        await page.waitForLoadState('networkidle');
        await expect(modal).not.toBeVisible();
    });
    // TC_ROLE_DELETE_18: Kiểm tra xử lý khi xóa vai trò đang được gán cho khách hàng
    test('TC_ROLE_DELETE_18 - Kiểm tra xử lý khi xóa vai trò đang được gán cho khách hàng', async ({ page }) => {
        await createCustomerRole(page, { name: 'QA_Test_Role_Assigned', active: true, freeShipping: false, taxExempt: false });
        await openCustomerRoleEditByName(page, 'QA_Test_Role_Assigned');
        await deleteOpenedRole(page);
        await expect(page.locator('.alert-success')).toContainText('The customer role has been deleted successfully.');
    });
    // TC_ROLE_DELETE_19: Kiểm tra xử lý khi xóa vai trò hệ thống
    test('TC_ROLE_DELETE_19 - Kiểm tra xử lý khi xóa vai trò hệ thống', async ({ page }) => {
        await openCustomerRoleEdit(page, 1);
        await page.locator('#customerrole-delete').click();
        await page.locator('#customerrolemodel-Delete-delete-confirmation .modal-footer button').click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.alert-danger, .alert')).toContainText('System role could not be deleted');
    });
});
