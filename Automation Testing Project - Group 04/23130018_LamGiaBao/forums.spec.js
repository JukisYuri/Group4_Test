const { expect, test } = require('@playwright/test');
const { BASE, loginAdmin } = require('./nopcommerce-test-helpers');

const forums = {
  route: '/Admin/Forum/List',
  pageReady: '#forumgroup-grid_wrapper, #forumgroup-grid',
  createPath: '/Admin/Forum/CreateForumGroup',
  title: { selectors: ['#Name', 'input[name="Name"]'] }
};

test.describe('Forums Test Suite', () => {
  test('TC_FORUM_LIST_01 - Hiển thị danh sách diễn đàn', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE}${forums.route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(forums.pageReady).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('TC_FORUM_ACCESS_01 - Chặn truy cập khi chưa đăng nhập', async ({ page }) => {
    const context = await page.context().browser().newContext({ storageState: { cookies: [], origins: [] } });
    const guest = await context.newPage();
    const response = await guest.goto(`${BASE}${forums.route}`);
    expect(/login/i.test(guest.url()) || (response && [401, 403].includes(response.status()))).toBeTruthy();
    await context.close();
  });

  test('TC_FORUM_FORM_01 - Mở biểu mẫu nhóm diễn đàn', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE}${forums.createPath}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#Name, input[name="Name"]').first()).toBeVisible({ timeout: 15000 });
  });
});
