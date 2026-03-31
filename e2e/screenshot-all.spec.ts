import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const DESKTOP_DIR = 'e2e-screenshots/final-desktop';
const MOBILE_DIR = 'e2e-screenshots/final-mobile';

const ADMIN_EMAIL = 'admin@packtrial.com';
const ADMIN_PASS = 'admin123!';
const USER_EMAIL = 'user@test.com';
const USER_PASS = 'test1234!';

async function screenshot(page: Page, name: string, dir: string) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true, type: 'png' });
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /비밀번호/i }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForTimeout(1000);
}

// ============================================================
// DESKTOP TESTS (1280x900)
// ============================================================
test.describe('Desktop Screenshots (1280x900)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('01-Public Pages', async ({ page }) => {
    // Main page
    await page.goto(BASE);
    await screenshot(page, '01-main-page', DESKTOP_DIR);

    // Products
    await page.goto(`${BASE}/products`);
    await page.waitForTimeout(2000);
    await screenshot(page, '02-product-list', DESKTOP_DIR);

    // Filter 1인용
    await page.getByRole('button', { name: '1인용' }).click();
    await page.waitForTimeout(500);
    await screenshot(page, '03-product-filter-1인용', DESKTOP_DIR);

    // Filter 2인용
    await page.getByRole('button', { name: '2인용' }).click();
    await page.waitForTimeout(500);
    await screenshot(page, '04-product-filter-2인용', DESKTOP_DIR);

    // Product detail
    await page.getByRole('button', { name: '전체' }).click();
    await page.waitForTimeout(500);
    await page.goto(`${BASE}/products/1`);
    await page.waitForTimeout(2000);
    await screenshot(page, '05-product-detail', DESKTOP_DIR);

    // Tab: 이용 안내
    const useGuideTab = page.getByRole('button', { name: '이용 안내' });
    if (await useGuideTab.isVisible()) {
      await useGuideTab.click();
      await page.waitForTimeout(500);
      await screenshot(page, '06-product-detail-이용안내', DESKTOP_DIR);
    }

    // Tab: 후기
    const reviewTab = page.getByRole('button', { name: /후기/ });
    if (await reviewTab.isVisible()) {
      await reviewTab.click();
      await page.waitForTimeout(500);
      await screenshot(page, '07-product-detail-후기', DESKTOP_DIR);
    }

    // Login page
    await page.goto(`${BASE}/auth/login`);
    await screenshot(page, '08-login', DESKTOP_DIR);

    // Signup page
    await page.goto(`${BASE}/auth/signup`);
    await screenshot(page, '09-signup', DESKTOP_DIR);
  });

  test('02-User Flow', async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASS);
    await screenshot(page, '10-user-logged-in', DESKTOP_DIR);

    // Booking Step 1
    await page.goto(`${BASE}/booking/1`);
    await page.waitForTimeout(2000);
    await screenshot(page, '11-booking-step1', DESKTOP_DIR);

    // Select 1박 2일
    await page.getByRole('button', { name: /1박 2일/ }).click();
    await page.waitForTimeout(500);
    await screenshot(page, '12-booking-step1-selected', DESKTOP_DIR);

    // Step 2
    await page.getByRole('button', { name: '다음 단계' }).click();
    await page.waitForTimeout(2000);

    // Navigate to next month
    const nextMonthBtn = page.getByRole('button', { name: 'Go to the Next Month' });
    if (await nextMonthBtn.isVisible()) {
      await nextMonthBtn.click();
      await page.waitForTimeout(1000);
    }
    await screenshot(page, '13-booking-step2-calendar', DESKTOP_DIR);

    // Try to select a date
    const dayButtons = page.locator('button[name*="4월"]').filter({ hasNot: page.locator('[disabled]') });
    const count = await dayButtons.count();
    if (count > 0) {
      await dayButtons.first().click();
      await page.waitForTimeout(1000);
      await screenshot(page, '14-booking-step2-date-selected', DESKTOP_DIR);

      // Step 3
      await page.getByRole('button', { name: '다음 단계' }).click();
      await page.waitForTimeout(1500);
      await screenshot(page, '15-booking-step3-options', DESKTOP_DIR);

      // Add option
      const plusBtns = page.locator('button').filter({ has: page.locator('svg') });
      // Try clicking a + button
      const optionBtns = page.locator('button:not([disabled])').filter({ hasText: '' });

      // Step 4
      await page.getByRole('button', { name: '다음 단계' }).click();
      await page.waitForTimeout(1500);
      await screenshot(page, '16-booking-step4-summary', DESKTOP_DIR);
    }

    // My page
    await page.goto(`${BASE}/my`);
    await page.waitForTimeout(2000);
    await screenshot(page, '17-mypage', DESKTOP_DIR);

    // 404 page
    await page.goto(`${BASE}/not-a-real-page`);
    await page.waitForTimeout(1500);
    await screenshot(page, '18-404-page', DESKTOP_DIR);
  });

  test('03-Admin Flow', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);

    // Dashboard
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(3000);
    await screenshot(page, '19-admin-dashboard', DESKTOP_DIR);

    // Reservations
    await page.goto(`${BASE}/admin/reservations`);
    await page.waitForTimeout(2000);
    await screenshot(page, '20-admin-reservations', DESKTOP_DIR);

    // Sets - Timeline
    await page.goto(`${BASE}/admin/sets`);
    await page.waitForTimeout(2000);
    await screenshot(page, '21-admin-sets-timeline', DESKTOP_DIR);

    // Sets - Card view
    const cardBtn = page.getByRole('button', { name: /카드/ });
    if (await cardBtn.isVisible()) {
      await cardBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '22-admin-sets-card', DESKTOP_DIR);
    }

    // Products
    await page.goto(`${BASE}/admin/products`);
    await page.waitForTimeout(2000);
    await screenshot(page, '23-admin-products', DESKTOP_DIR);

    // Holidays
    await page.goto(`${BASE}/admin/holidays`);
    await page.waitForTimeout(2000);
    await screenshot(page, '24-admin-holidays', DESKTOP_DIR);

    // Settings
    await page.goto(`${BASE}/admin/settings`);
    await page.waitForTimeout(2000);
    await screenshot(page, '25-admin-settings', DESKTOP_DIR);
  });
});

// ============================================================
// MOBILE TESTS (390x844 — iPhone 14)
// ============================================================
test.describe('Mobile Screenshots (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('01-Public Pages Mobile', async ({ page }) => {
    // Main page
    await page.goto(BASE);
    await screenshot(page, '01-main-page', MOBILE_DIR);

    // Products
    await page.goto(`${BASE}/products`);
    await page.waitForTimeout(2000);
    await screenshot(page, '02-product-list', MOBILE_DIR);

    // Product detail
    await page.goto(`${BASE}/products/1`);
    await page.waitForTimeout(2000);
    await screenshot(page, '03-product-detail', MOBILE_DIR);

    // Login
    await page.goto(`${BASE}/auth/login`);
    await screenshot(page, '04-login', MOBILE_DIR);

    // Signup
    await page.goto(`${BASE}/auth/signup`);
    await screenshot(page, '05-signup', MOBILE_DIR);
  });

  test('02-User Flow Mobile', async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASS);

    // Main with nav
    await screenshot(page, '06-user-logged-in', MOBILE_DIR);

    // Mobile hamburger menu
    const hamburger = page.locator('button').filter({ has: page.locator('svg') }).last();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);
      await screenshot(page, '07-mobile-menu-open', MOBILE_DIR);
      await hamburger.click(); // close
    }

    // Booking Step 1
    await page.goto(`${BASE}/booking/1`);
    await page.waitForTimeout(2000);
    await screenshot(page, '08-booking-step1', MOBILE_DIR);

    // Select type
    await page.getByRole('button', { name: /1박 2일/ }).click();
    await page.waitForTimeout(500);
    await screenshot(page, '09-booking-step1-selected', MOBILE_DIR);

    // Step 2
    await page.getByRole('button', { name: '다음 단계' }).click();
    await page.waitForTimeout(2000);
    const nextMonthBtn = page.getByRole('button', { name: 'Go to the Next Month' });
    if (await nextMonthBtn.isVisible()) {
      await nextMonthBtn.click();
      await page.waitForTimeout(1000);
    }
    await screenshot(page, '10-booking-step2-calendar', MOBILE_DIR);

    // My page
    await page.goto(`${BASE}/my`);
    await page.waitForTimeout(2000);
    await screenshot(page, '11-mypage', MOBILE_DIR);

    // 404
    await page.goto(`${BASE}/not-a-real-page`);
    await page.waitForTimeout(1500);
    await screenshot(page, '12-404-page', MOBILE_DIR);
  });

  test('03-Admin Flow Mobile', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);

    // Dashboard
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(3000);
    await screenshot(page, '13-admin-dashboard', MOBILE_DIR);

    // Reservations
    await page.goto(`${BASE}/admin/reservations`);
    await page.waitForTimeout(2000);
    await screenshot(page, '14-admin-reservations', MOBILE_DIR);

    // Sets
    await page.goto(`${BASE}/admin/sets`);
    await page.waitForTimeout(2000);
    await screenshot(page, '15-admin-sets', MOBILE_DIR);

    // Products
    await page.goto(`${BASE}/admin/products`);
    await page.waitForTimeout(2000);
    await screenshot(page, '16-admin-products', MOBILE_DIR);

    // Holidays
    await page.goto(`${BASE}/admin/holidays`);
    await page.waitForTimeout(2000);
    await screenshot(page, '17-admin-holidays', MOBILE_DIR);

    // Settings
    await page.goto(`${BASE}/admin/settings`);
    await page.waitForTimeout(2000);
    await screenshot(page, '18-admin-settings', MOBILE_DIR);
  });
});
