// @ts-check

/**
 * Hàm đăng nhập vào nopCommerce và chuyển tiếp vào trang Admin
 * @param {import('@playwright/test').Page} page 
 */
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
