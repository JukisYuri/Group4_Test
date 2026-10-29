import { test, expect } from '@playwright/test';

// ---------- Helpers ----------
const BYOC = '/build-your-own-computer';
const SUCCESS_MSG = 'The product has been added to your shopping cart';

const notification = (page) => page.locator('#bar-notification .bar-notification');
const cartQty = (page) => page.locator('#topcartlink .cart-qty');

/** Lấy giá trị số từ chuỗi tiền tệ (hỗ trợ cả "$1,350.00" và "1.350 ₫") */
function parseMoney(str) {
  const s = str.replace(/[^0-9.,]/g, '').trim();
  if (!s) return 0;
  // Định dạng VNĐ kiểu "1.350" (dấu chấm ngăn cách hàng nghìn, không có phần thập phân)
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseFloat(s.replace(/\./g, ''));
  }
  // Định dạng USD kiểu "1,350.00" hoặc số thông thường
  return parseFloat(s.replace(/,/g, ''));
}

/** Chọn đầy đủ thuộc tính cho "Build your own computer" */
async function configureBYOC(page, { hdd = '400 GB', os = 'Vista Home', office = true } = {}) {
  await page.goto(BYOC, { waitUntil: 'domcontentloaded' });
  await page.locator('#product_attribute_1').selectOption({ index: 1 }); // Processor
  await page.locator('#product_attribute_2').selectOption({ index: 1 }); // RAM
  await page.locator('.attributes label', { hasText: hdd }).first().click();
  await page.locator('.attributes label', { hasText: os }).first().click();

  if (office) {
    const officeLabel = page.locator('.attributes label', { hasText: 'Microsoft Office' }).first();
    const forId = await officeLabel.getAttribute('for');
    const officeCheckbox = forId ? page.locator(`#${forId}`) : officeLabel.locator('..').locator('input[type="checkbox"]');
    if (!(await officeCheckbox.isChecked())) {
      await officeLabel.click();
    }
  }
}

/** Thêm "Build your own computer" hợp lệ vào giỏ (tiền đề TC_CART_ADD_06) */
async function addBYOCToCart(page, qty = 1) {
  await configureBYOC(page);
  await page.locator('.qty-input').fill(String(qty));
  await page.locator('#add-to-cart-button-1').click();
  await expect(notification(page)).toContainText(SUCCESS_MSG, { timeout: 10000 });
  await page.locator('#bar-notification .close').click().catch(() => {});
}

test.describe('Shopping Cart Module', () => {

  // ================= ADD TO CART =================

  test('TC_CART_ADD_01 - Thêm sản phẩm không có thuộc tính bắt buộc từ trang danh sách (Catalog)', async ({ page }) => {
    await page.goto('/desktops', { waitUntil: 'domcontentloaded' });

    await cartQty(page).waitFor({ state: 'visible', timeout: 10000 });

    const productCard = page.locator('.product-item', { hasText: 'Lenovo' });
    await productCard.getByRole('button', { name: /add to cart/i }).click();

    const notificationBar = page.locator('#bar-notification .bar-notification.success');
    await expect(notificationBar).toBeVisible({ timeout: 10000 });
    await expect(notificationBar).toContainText(SUCCESS_MSG);
    await expect(cartQty(page)).toContainText('(1)');
  });

  test('TC_CART_ADD_02 - Cảnh báo khi thêm sản phẩm thiếu các thuộc tính bắt buộc (*)', async ({ page }) => {
    await page.goto(BYOC, { waitUntil: 'domcontentloaded' });
    await page.locator('#add-to-cart-button-1').click();

    const err = page.locator('#bar-notification .bar-notification.error');
    await expect(err).toBeVisible({ timeout: 10000 });
    await expect(err).toContainText(/Please select/i);
    await expect(cartQty(page)).toContainText('(0)');
  });

  test('TC_CART_ADD_03 - Tự động tính lại giá khi chọn thuộc tính tùy chọn', async ({ page }) => {
    await configureBYOC(page, { hdd: '400 GB', os: 'Vista Home', office: true });
    const price = page.locator('.product-price span[id^="price-value"]').first();
    // Chấp nhận cả định dạng USD ($1,315.00 / $1,400.00 / $1,415.00) và VNĐ (1.315 ₫ / 1.350 ₫ / 1.400 ₫ / 1.415 ₫)
    await expect(price).toHaveText(/(\$1,(315|350|400|415)\.00|1\.(315|350|400|415)\s*₫)/, { timeout: 10000 });
  });

  test('TC_CART_ADD_04 - Ràng buộc số lượng tối thiểu (Minimum quantity)', async ({ page }) => {
    await page.goto('/apple-macbook-pro', { waitUntil: 'domcontentloaded' });
    const qty = page.locator('.qty-input');
    await expect(qty).toHaveValue('2');
    await expect(page.locator('body')).toContainText(/minimum quantity of 2/i);

    await qty.fill('1');
    await page.locator('[id^="add-to-cart-button"]').click();
    await expect(page.locator('#bar-notification .bar-notification.error')).toContainText(/minimum quantity.*2/i);
  });

  for (const invalid of ['-1', 'abc', '0']) {
    test(`TC_CART_ADD_05 - Số lượng không hợp lệ (${invalid}) tại trang chi tiết`, async ({ page }) => {
      await page.goto('/apple-macbook-pro', { waitUntil: 'domcontentloaded' });
      await page.locator('.qty-input').fill(invalid);
      await page.locator('[id^="add-to-cart-button"]').click();

      await expect(page.locator('#bar-notification .bar-notification.error')).toBeVisible({ timeout: 10000 });
      await expect(cartQty(page)).toContainText('(0)');
    });
  }

  test('TC_CART_ADD_06 - Thêm sản phẩm thành công từ trang chi tiết khi dữ liệu hợp lệ', async ({ page }) => {
    await configureBYOC(page);
    await page.locator('.qty-input').fill('1');
    await page.locator('#add-to-cart-button-1').click();

    await expect(page.locator('#bar-notification .bar-notification.success')).toContainText(SUCCESS_MSG, { timeout: 10000 });
    await expect(cartQty(page)).toContainText('(1)');
  });

  // ================= VIEW CART =================

  test('TC_CART_VIEW_07 - Hiển thị đầy đủ các cột trong bảng giỏ hàng', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    const header = page.locator('table.cart thead');
    for (const col of ['SKU', 'Image', 'Product(s)', 'Price', 'Qty', 'Total', 'Remove']) {
      await expect(header).toContainText(col);
    }
    await expect(page.locator('table.cart td.remove-from-cart').first()).toBeVisible();
  });

  test('TC_CART_VIEW_08 - Hiển thị chi tiết thuộc tính đã chọn dưới tên sản phẩm', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    const cell = page.locator('table.cart td.product');
    await expect(cell).toContainText('Build your own computer');
    for (const t of ['Processor', 'RAM', 'HDD', 'OS', '400 GB', 'Vista Home']) {
      await expect(cell).toContainText(t);
    }
  });

  test('TC_CART_VIEW_09 - Hiển thị thông báo giỏ hàng rỗng', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.order-summary-content')).toContainText('Your Shopping Cart is empty!');
    await expect(page.locator('table.cart')).toHaveCount(0);
    await expect(page.locator('#checkout')).toHaveCount(0);
  });

  test('TC_CART_VIEW_10 - Popup giỏ hàng nhỏ ở Header hiển thị đúng thông tin', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#topcartlink').hover();

    const flyout = page.locator('#flyout-cart');
    await expect(flyout).toBeVisible();
    await expect(flyout).toContainText('Build your own computer');
    await expect(flyout.locator('.picture img')).toBeVisible();
    await expect(flyout.locator('.totals')).toContainText(/(\$|₫)/);
    await expect(flyout.locator('.count')).toContainText('1');
  });

  // ================= UPDATE & EDIT CART =================

  test('TC_CART_EDIT_11 - Cập nhật số lượng và tính lại Total', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    const unitText = await page.locator('td.unit-price .product-unit-price').innerText();
    const unitPrice = parseMoney(unitText);

    const qtyInput = page.locator('.qty-input');
    await qtyInput.fill('2');
    await qtyInput.press('Enter');

    // Chờ giỏ hàng tự động cập nhật lại thành tiền (Price x 2)
    await expect(async () => {
      const totalText = await page.locator('td.subtotal .product-subtotal').innerText();
      expect(parseMoney(totalText)).toBeCloseTo(unitPrice * 2, 2);
    }).toPass({ timeout: 10000 });
  });

  test('TC_CART_EDIT_12 - Báo lỗi / khôi phục khi nhập số âm hoặc chữ trong giỏ', async ({ page }) => {
    for (const bad of ['-2', 'xyz']) {
      await page.goto('/cart', { waitUntil: 'domcontentloaded' });
      if ((await page.locator('table.cart tbody tr').count()) === 0) {
        await addBYOCToCart(page);
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
      }

      const qtyInput = page.locator('.qty-input');
      await qtyInput.fill(bad);
      await qtyInput.press('Enter');
      await page.waitForTimeout(1000);

      const val = await qtyInput.inputValue().catch(() => null);
      const hasError = await page.locator('.message-error, .bar-notification.error, .field-validation-error, .warning-box').count();
      const isEmpty = await page.locator('.order-summary-content', { hasText: 'Your Shopping Cart is empty!' }).count();

      // Hệ thống không ghi nhận số âm / chữ cái (báo lỗi, khôi phục số dương, hoặc xóa dòng về giỏ rỗng)
      expect(val === null || isEmpty > 0 || hasError > 0 || (val !== bad && Number(val) > 0)).toBeTruthy();
    }
  });

  test('TC_CART_EDIT_13 - Chỉnh sửa cấu hình qua liên kết [Edit]', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await page.locator('table.cart .edit-item a').click();
    await expect(page).toHaveURL(/build-your-own-computer/);
    await expect(page.locator('.attributes label', { hasText: '400 GB' }).locator('..').locator('input')).toBeChecked();
  });

  test('TC_CART_EDIT_14 - Xóa đơn lẻ sản phẩm bằng nút [x]', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await page.locator('table.cart td.remove-from-cart button.remove-btn, table.cart td.remove-from-cart button[name="updatecart"]').first().click();
    await expect(page.locator('table.cart tbody tr')).toHaveCount(0);
  });

  test('TC_CART_EDIT_15 - Chuyển về trạng thái giỏ rỗng khi xóa hết sản phẩm', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await page.locator('table.cart td.remove-from-cart button.remove-btn, table.cart td.remove-from-cart button[name="updatecart"]').first().click();
    await expect(page.locator('.order-summary-content')).toContainText('Your Shopping Cart is empty!');
    await expect(page.locator('table.cart')).toHaveCount(0);
  });

  // ================= NAVIGATION & UTILITIES =================

  test('TC_CART_NAV_16 - Continue shopping quay lại danh sách sản phẩm', async ({ page }) => {
    await page.goto('/desktops', { waitUntil: 'domcontentloaded' });
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /continue shopping/i }).click();
    await expect(page).not.toHaveURL(/\/cart$/);
    await expect(page.locator('.product-grid, .product-list, .master-wrapper-content').first()).toBeVisible();
  });

  test('TC_CART_NAV_17 - Hiển thị khu vực Estimate shipping', async ({ page }) => {
    await addBYOCToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await page.locator('#open-estimate-shipping-popup, a[href="#estimate-shipping-popup"]').first().click();
    await expect(page.locator('#CountryId')).toBeVisible();
    await expect(page.locator('#StateProvinceId')).toBeVisible();
    await expect(page.locator('#ZipPostalCode')).toBeVisible();
  });

  test('TC_CART_NAV_18 - Thêm sản phẩm vào Wishlist từ trang chi tiết', async ({ page }) => {
    await configureBYOC(page);
    await page.locator('.add-to-wishlist-button').click();

    await expect(page.locator('#bar-notification .bar-notification.success')).toContainText(/wishlist/i, { timeout: 10000 });
    await expect(page.locator('#topcartlink .cart-qty')).toContainText('(0)');
    await expect(page.locator('.wishlist-qty')).toContainText('(1)');
  });

  test('TC_CART_NAV_19 - Thêm sản phẩm vào danh sách so sánh', async ({ page }) => {
    await page.goto('/apple-macbook-pro', { waitUntil: 'domcontentloaded' });
    await page.locator('.compare-products button, .add-to-compare-list-button').first().click();

    await expect(page.locator('#bar-notification .bar-notification.success')).toContainText(/compar(e|ison)/i, { timeout: 10000 });
    await page.goto('/compareproducts', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.compare-products-table')).toContainText('Apple MacBook Pro');
  });

  test('TC_CART_NAV_20 - Duy trì dữ liệu giỏ hàng khi chuyển trang hoặc F5', async ({ page }) => {
    await addBYOCToCart(page);

    await page.goto('/about-us', { waitUntil: 'domcontentloaded' });
    await page.reload();
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('table.cart td.product')).toContainText('Build your own computer');
    await expect(page.locator('.qty-input')).toHaveValue('1');
  });

});
