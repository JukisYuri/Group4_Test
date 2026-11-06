// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Nạp các biến môi trường từ file .env (nếu có)
dotenv.config();

const BASE_URL = (process.env.BASE_URL || 'http://localhost').replace(/\/$/, '');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Khớp với các file test của toàn bộ thành viên (.spec.js hoặc .test.js) */
  testMatch: ['**/*.spec.js', '**/*.test.js'],
  testIgnore: ['tests/example.spec.js'],

  /* Thời gian tối đa cho mỗi test case (60 giây để thích ứng với web nopCommerce trên localhost) */
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  /* Chạy tuần tự 1 worker để tránh xung đột session Admin và dữ liệu trên nopCommerce */
  fullyParallel: false,
  workers: process.env.CI ? 1 : 1,

  /* Fail build trên CI nếu còn test.only */
  forbidOnly: !!process.env.CI,

  /* Thử lại test khi thất bại trên CI */
  retries: process.env.CI ? 2 : 0,

  /* Báo cáo kết quả */
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  /* Cấu hình chung cho mọi test */
  use: {
    /* Base URL dùng chung cho toàn bộ dự án, lấy từ file .env */
    baseURL: BASE_URL,

    /* Tự động ghi trace khi test thất bại lần đầu để xem lại nguyên nhân */
    trace: 'on-first-retry',

    /* Tự động chụp màn hình khi có test case bị lỗi */
    screenshot: 'only-on-failure',

    /* Giữ video nếu test bị lỗi */
    video: 'retain-on-failure',
  },

  /* Cấu hình trình duyệt: Mặc định Chromium (Google Chrome) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Bỏ ghi chú nếu muốn chạy trên Firefox / Safari (yêu cầu npx playwright install)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],
});
