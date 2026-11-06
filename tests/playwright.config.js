const { defineConfig } = require('@playwright/test');
const path = require('path');

const baseURL = (process.env.BASE_URL || 'http://localhost:80').replace(/\/$/, '');
const isLocalServer = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseURL);

module.exports = defineConfig({
  globalSetup: path.join(__dirname, 'playwright.auth.js'),
  use: {
    baseURL,
    storageState: path.join(__dirname, '.auth', 'admin.json')
  },
  ...(isLocalServer ? {
    webServer: {
      command: 'docker compose up --build --remove-orphans',
      url: baseURL,
      reuseExistingServer: true,
      timeout: 180000
    }
  } : {})
});
  