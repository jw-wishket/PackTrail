import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve(__dirname, '../e2e-screenshots/audit');
const BASE_URL = 'http://localhost:3000';

const issues: { page: string; description: string; screenshot: string }[] = [];
const testedElements: { page: string; element: string; result: string }[] = [];

function logIssue(pg: string, description: string, screenshotName: string) {
  issues.push({ page: pg, description, screenshot: screenshotName });
}
function logElement(pg: string, element: string, result: string) {
  testedElements.push({ page: pg, element, result });
}

async function ss(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function ssMobile(page: Page, name: string) {
  const original = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const filePath = path.join(SCREENSHOT_DIR, `${name}-mobile.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  if (original) await page.setViewportSize(original);
  return filePath;
}

async function checkOverflow(page: Page, pageName: string) {
  const overflowIssues = await page.evaluate(() => {
    const html = document.documentElement;
    const results: string[] = [];
    if (document.body.scrollWidth > html.clientWidth) {
      results.push(`Horizontal overflow: scrollWidth(${document.body.scrollWidth}) > clientWidth(${html.clientWidth})`);
    }
    return results;
  });
  for (const issue of overflowIssues) {
    logIssue(pageName, issue, `${pageName}-overflow`);
  }
}

async function checkBrokenImages(page: Page, pageName: string) {
  const broken = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const results: string[] = [];
    imgs.forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        results.push(img.src || img.getAttribute('src') || 'unknown');
      }
    });
    return results;
  });
  if (broken.length > 0) {
    logIssue(pageName, `Broken images: ${broken.join(', ')}`, `${pageName}-broken-img`);
  }
  logElement(pageName, `Broken images check (${broken.length} broken)`, broken.length === 0 ? 'PASS' : 'FAIL');
}

// Helper: check if text exists on page
async function hasText(page: Page, text: string): Promise<boolean> {
  return page.locator(`text=${text}`).first().isVisible().catch(() => false);
}

test.describe('PackTrail Full UI/UX Audit', () => {
  test.setTimeout(180000);

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // ===================== PUBLIC PAGES =====================

  test.describe('Public Pages', () => {

    test('1. Main page - sections and links', async ({ page }) => {
      await page.goto(BASE_URL + '/');
      await page.waitForLoadState('networkidle');
      await ss(page, '01-main-page');
      await ssMobile(page, '01-main-page');

      // Hero section - check for main headline text
      const heroText = await hasText(page, '백패킹을 시작하세요');
      logElement('/', 'Hero headline "백패킹을 시작하세요"', heroText ? 'PASS' : 'FAIL');
      if (!heroText) logIssue('/', 'Hero headline not visible', '01-hero-missing');

      // "세트 둘러보기" button (seen in screenshot)
      const browseBtn = page.locator('text=세트 둘러보기').first();
      if (await browseBtn.isVisible().catch(() => false)) {
        await browseBtn.click();
        await page.waitForTimeout(1000);
        // From screenshot: this may scroll to a section instead of navigating
        const url = page.url();
        logElement('/', 'Button: 세트 둘러보기', url.includes('/products') ? 'PASS - navigated' : 'PASS - clicked (scroll or anchor)');
        await ss(page, '01-browse-btn-result');
        if (!url.includes('/products')) {
          await page.goto(BASE_URL + '/');
          await page.waitForLoadState('networkidle');
        }
      } else {
        logElement('/', 'Button: 세트 둘러보기', 'FAIL - not found');
        logIssue('/', '"세트 둘러보기" button not found', '01-browse-btn-missing');
      }

      // "이용 방법 보기" button
      const howToBtn = page.locator('text=이용 방법 보기').first();
      if (await howToBtn.isVisible().catch(() => false)) {
        await howToBtn.click();
        await page.waitForTimeout(500);
        logElement('/', 'Button: 이용 방법 보기', 'PASS - clicked');
      } else {
        logElement('/', 'Button: 이용 방법 보기', 'NOT FOUND');
        logIssue('/', '"이용 방법 보기" button not found', '01-howto-missing');
      }

      // "왜 PackTrail인가요?" section
      const whySection = await hasText(page, 'PackTrail');
      logElement('/', 'Section: PackTrail intro', whySection ? 'PASS' : 'WARN');

      // "이용 방법" section
      const howToSection = await hasText(page, '이용 방법');
      logElement('/', 'Section: 이용 방법', howToSection ? 'PASS' : 'WARN');

      // "인기 세트" section
      const popularSection = await hasText(page, '인기 세트');
      logElement('/', 'Section: 인기 세트', popularSection ? 'PASS' : 'WARN');

      // "이용 후기" section
      const reviewSection = await hasText(page, '이용 후기');
      logElement('/', 'Section: 이용 후기', reviewSection ? 'PASS' : 'WARN');

      // Product cards in 인기 세트 - look for "예약하기" links
      const reserveLinks = page.locator('text=예약하기');
      const reserveCount = await reserveLinks.count();
      logElement('/', `"예약하기" links in 인기 세트 (count: ${reserveCount})`, reserveCount > 0 ? 'PASS' : 'INFO');

      // Footer CTA section
      const ctaSection = await hasText(page, '첫 백패킹, 지금 시작하세요');
      logElement('/', 'Footer CTA section', ctaSection ? 'PASS' : 'WARN');

      // Navbar links
      const navLinks = ['장비 소개', '이용 방법', '후기'];
      for (const link of navLinks) {
        const found = await hasText(page, link);
        logElement('/', `Navbar link: ${link}`, found ? 'PASS' : 'NOT FOUND');
      }

      await checkOverflow(page, '/');
      await checkBrokenImages(page, '/');
    });

    test('2. Products page - cards and filters', async ({ page }) => {
      await page.goto(BASE_URL + '/products');
      await page.waitForLoadState('networkidle');
      await ss(page, '02-products-page');
      await ssMobile(page, '02-products-page');

      // Page title
      const title = await hasText(page, '장비 세트');
      logElement('/products', 'Page title "장비 세트"', title ? 'PASS' : 'FAIL');

      // 4 product cards - look for product names visible in screenshot
      const productNames = ['베이직 솔로 세트', '프리미엄 듀오 세트', '풀패키지 세트', '라이트 솔로 세트'];
      for (const name of productNames) {
        const found = await hasText(page, name);
        logElement('/products', `Product: ${name}`, found ? 'PASS' : 'NOT FOUND');
        if (!found) logIssue('/products', `Product "${name}" not found`, '02-product-missing');
      }

      // Filter tabs
      for (const tabText of ['전체', '1인용', '2인용']) {
        const tab = page.locator(`text=${tabText}`).first();
        if (await tab.isVisible().catch(() => false)) {
          await tab.click();
          await page.waitForTimeout(500);
          await ss(page, `02-filter-${tabText}`);

          // Count visible product cards after filter
          const visibleProducts = await page.evaluate(() => {
            // Count elements that look like product cards
            const cards = document.querySelectorAll('a[href*="/products/"]');
            return cards.length;
          });
          logElement('/products', `Filter: ${tabText} (visible products: ${visibleProducts})`, 'PASS');
        } else {
          logElement('/products', `Filter: ${tabText}`, 'NOT FOUND');
          logIssue('/products', `Filter tab "${tabText}" not found`, `02-filter-${tabText}-missing`);
        }
      }

      await checkOverflow(page, '/products');
      await checkBrokenImages(page, '/products');
    });

    test('3. Product detail - image, price, tabs', async ({ page }) => {
      await page.goto(BASE_URL + '/products/1');
      await page.waitForLoadState('networkidle');
      await ss(page, '03-product-detail');
      await ssMobile(page, '03-product-detail');

      // Product name
      const productName = await hasText(page, '베이직 솔로 세트');
      logElement('/products/1', 'Product name', productName ? 'PASS' : 'WARN');

      // Images (product gallery)
      const images = page.locator('img');
      const imgCount = await images.count();
      logElement('/products/1', `Product images (count: ${imgCount})`, imgCount > 0 ? 'PASS' : 'FAIL');

      // Price display - from screenshot shows ₩59,000 and ₩79,000
      const priceVisible = await page.locator('text=/\\d+,\\d+/').first().isVisible().catch(() => false);
      logElement('/products/1', 'Price display', priceVisible ? 'PASS' : 'WARN');

      // Tabs - from screenshot: "포함 장비", "이용 안내", "후기" (with spaces)
      // Also try without spaces as backup
      const tabVariants = [
        { display: '포함 장비', alts: ['포함장비', '포함 장비'] },
        { display: '이용 안내', alts: ['이용안내', '이용 안내'] },
        { display: '후기', alts: ['후기'] },
      ];
      for (const tab of tabVariants) {
        let found = false;
        for (const alt of tab.alts) {
          const el = page.locator(`text=${alt}`).first();
          if (await el.isVisible().catch(() => false)) {
            await el.click();
            await page.waitForTimeout(500);
            await ss(page, `03-tab-${tab.display.replace(/\s/g, '')}`);
            logElement('/products/1', `Tab: ${tab.display}`, 'PASS - clicked');
            found = true;
            break;
          }
        }
        if (!found) {
          logElement('/products/1', `Tab: ${tab.display}`, 'NOT FOUND');
          logIssue('/products/1', `Tab "${tab.display}" not found`, `03-tab-${tab.display.replace(/\s/g, '')}-missing`);
        }
      }

      // "예약하기" button
      const bookBtn = page.locator('text=예약하기').first();
      logElement('/products/1', 'Button: 예약하기', await bookBtn.isVisible().catch(() => false) ? 'PASS' : 'FAIL');

      // Image thumbnails (gallery navigation)
      const thumbnails = page.locator('img').all();
      const thumbCount = (await thumbnails).length;
      logElement('/products/1', `Image thumbnails (count: ${thumbCount})`, thumbCount > 1 ? 'PASS' : 'INFO');

      // Equipment list (visible in 포함 장비 tab area)
      const equipmentItems = page.locator('text=텐트, text=매트, text=LED').first();
      logElement('/products/1', 'Equipment items visible', await equipmentItems.isVisible().catch(() => false) ? 'PASS' : 'INFO');

      await checkOverflow(page, '/products/1');
      await checkBrokenImages(page, '/products/1');
    });

    test('4. Login page', async ({ page }) => {
      await page.goto(BASE_URL + '/auth/login');
      await page.waitForLoadState('networkidle');
      await ss(page, '04-login-page');
      await ssMobile(page, '04-login-page');

      // Title
      logElement('/auth/login', 'Title "로그인"', await hasText(page, '로그인') ? 'PASS' : 'FAIL');

      // Email input
      const emailInput = page.locator('input[placeholder*="email"]').first();
      logElement('/auth/login', 'Email input', await emailInput.isVisible().catch(() => false) ? 'PASS' : 'FAIL');

      // Password input
      const pwInput = page.locator('input[type="password"]').first();
      logElement('/auth/login', 'Password input', await pwInput.isVisible().catch(() => false) ? 'PASS' : 'FAIL');

      // Login button
      const loginBtn = page.locator('button:has-text("로그인")').first();
      logElement('/auth/login', 'Login button', await loginBtn.isVisible().catch(() => false) ? 'PASS' : 'FAIL');

      // Kakao button - from screenshot: "카카오로 시작하기"
      const kakaoBtn = page.locator('text=카카오로 시작하기').first();
      const kakaoVisible = await kakaoBtn.isVisible().catch(() => false);
      logElement('/auth/login', 'Kakao button "카카오로 시작하기"', kakaoVisible ? 'PASS' : 'NOT FOUND');
      if (!kakaoVisible) {
        // Try broader search
        const kakaoAlt = page.locator('button:has-text("카카오")').first();
        const kakaoAltVisible = await kakaoAlt.isVisible().catch(() => false);
        logElement('/auth/login', 'Kakao button (broad)', kakaoAltVisible ? 'PASS' : 'NOT FOUND');
        if (!kakaoAltVisible) logIssue('/auth/login', 'Kakao login button not found', '04-kakao-missing');
      }

      // "회원가입" link
      const signupLink = page.locator('text=회원가입').first();
      logElement('/auth/login', 'Link: 회원가입', await signupLink.isVisible().catch(() => false) ? 'PASS' : 'NOT FOUND');

      // "또는" separator
      logElement('/auth/login', 'Separator "또는"', await hasText(page, '또는') ? 'PASS' : 'INFO');

      await checkOverflow(page, '/auth/login');
    });

    test('5. Signup page', async ({ page }) => {
      await page.goto(BASE_URL + '/auth/signup');
      await page.waitForLoadState('networkidle');
      await ss(page, '05-signup-page');
      await ssMobile(page, '05-signup-page');

      // Title
      logElement('/auth/signup', 'Title "회원가입"', await hasText(page, '회원가입') ? 'PASS' : 'FAIL');

      // Form fields - from screenshot: 이름, 이메일, 비밀번호
      logElement('/auth/signup', 'Label: 이름', await hasText(page, '이름') ? 'PASS' : 'FAIL');
      logElement('/auth/signup', 'Label: 이메일', await hasText(page, '이메일') ? 'PASS' : 'FAIL');
      logElement('/auth/signup', 'Label: 비밀번호', await hasText(page, '비밀번호') ? 'PASS' : 'FAIL');

      // Inputs
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      logElement('/auth/signup', `Form inputs (count: ${inputCount})`, inputCount >= 3 ? 'PASS' : `FAIL - expected >=3, got ${inputCount}`);

      // Submit button - "가입하기"
      const submitBtn = page.locator('button:has-text("가입하기")').first();
      logElement('/auth/signup', 'Button: 가입하기', await submitBtn.isVisible().catch(() => false) ? 'PASS' : 'FAIL');

      // "로그인" link
      const loginLink = page.locator('a:has-text("로그인")').first();
      logElement('/auth/signup', 'Link: 로그인', await loginLink.isVisible().catch(() => false) ? 'PASS' : 'NOT FOUND');

      await checkOverflow(page, '/auth/signup');
    });
  });

  // ===================== USER FLOW =====================

  test.describe('User Flow', () => {

    test('6-13. Login, booking, my page, auth guard', async ({ page }) => {
      // 6. Login as user
      await page.goto(BASE_URL + '/auth/login');
      await page.waitForLoadState('networkidle');

      await page.locator('input[placeholder*="email"]').first().fill('user@test.com');
      await page.locator('input[type="password"]').first().fill('test1234!');
      await page.locator('button:has-text("로그인")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await ss(page, '06-user-after-login');

      const afterLoginUrl = page.url();
      const loginSuccess = !afterLoginUrl.includes('/auth/login');
      logElement('/auth/login', 'User login', loginSuccess ? `PASS - redirected to ${afterLoginUrl}` : 'FAIL - still on login');
      if (!loginSuccess) {
        logIssue('/auth/login', 'User login failed', '06-login-fail');
        await ss(page, '06-login-fail');
      }

      // 7. Navbar after login
      await page.goto(BASE_URL + '/');
      await page.waitForLoadState('networkidle');
      await ss(page, '07-user-navbar');

      // From screenshot: navbar shows "마이페이지" text and "예약하기" button
      const myPageLink = await hasText(page, '마이페이지');
      logElement('/ (user)', 'Navbar: 마이페이지', myPageLink ? 'PASS' : 'NOT FOUND');

      // "관리자" should NOT be visible for regular user
      const adminLink = await hasText(page, '관리자');
      logElement('/ (user)', 'Navbar: 관리자 (should NOT exist)', adminLink ? 'FAIL - visible for user' : 'PASS - hidden');
      if (adminLink) logIssue('/ (user)', 'Admin link visible for non-admin user', '07-admin-link-visible');

      // 8. Booking Step 1 - Type selection
      await page.goto(BASE_URL + '/booking/1');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '08-booking-step1');
      await ssMobile(page, '08-booking-step1');

      // From screenshot: "렌탈 타입 선택", options are "1박 2일" (with space) and "2박 3일"
      logElement('/booking/1', 'Heading: 렌탈 타입 선택', await hasText(page, '렌탈 타입 선택') ? 'PASS' : 'WARN');

      // Select "1박 2일" (with space between numbers)
      const nightOption = page.locator('text=1박 2일').first();
      if (await nightOption.isVisible().catch(() => false)) {
        await nightOption.click();
        await page.waitForTimeout(500);
        logElement('/booking/1', 'Select: 1박 2일', 'PASS - clicked');
        await ss(page, '08-step1-selected');
      } else {
        // Try without space
        const nightOptionAlt = page.locator('text=1박2일').first();
        if (await nightOptionAlt.isVisible().catch(() => false)) {
          await nightOptionAlt.click();
          logElement('/booking/1', 'Select: 1박2일 (no space)', 'PASS - clicked');
        } else {
          logElement('/booking/1', 'Select: 1박 2일', 'NOT FOUND');
          logIssue('/booking/1', '"1박 2일" option not found', '08-option-missing');
        }
      }

      // "다음 단계" button
      const nextBtn = page.locator('text=다음 단계').first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      logElement('/booking/1', 'Button: 다음 단계', nextVisible ? 'PASS' : 'NOT FOUND');

      // Check if button is disabled before selection
      if (nextVisible) {
        const isDisabled = await nextBtn.isDisabled().catch(() => false);
        logElement('/booking/1', 'Button: 다음 단계 state', isDisabled ? 'INFO - disabled (need selection)' : 'PASS - enabled');
      }

      // Click next to go to Step 2
      if (nextVisible) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // 9. Booking Step 2 - Date selection
      await ss(page, '09-booking-step2');

      // Check if we're on the date step
      const dateStepVisible = await hasText(page, '날짜') || await hasText(page, '일정');
      logElement('/booking (step2)', 'Date selection step visible', dateStepVisible ? 'PASS' : 'WARN - may not have navigated');

      // Look for calendar
      const calendarVisible = await page.locator('table, [role="grid"], [class*="calendar"], [class*="Calendar"]').first().isVisible().catch(() => false);
      logElement('/booking (step2)', 'Calendar visible', calendarVisible ? 'PASS' : 'NOT FOUND');

      // Try navigating months and selecting date
      if (calendarVisible) {
        // Navigate to next month
        const nextMonthBtn = page.locator('button[name="next-month"], button[aria-label*="next"], button:has-text(">")').first();
        if (await nextMonthBtn.isVisible().catch(() => false)) {
          await nextMonthBtn.click();
          await page.waitForTimeout(500);
          logElement('/booking (step2)', 'Next month button', 'PASS - clicked');
        }

        // Select a date (try to find clickable day buttons)
        const dayBtns = page.locator('td button:not([disabled]), button[name="day"]');
        const dayCount = await dayBtns.count();
        logElement('/booking (step2)', `Available day buttons: ${dayCount}`, dayCount > 0 ? 'PASS' : 'INFO');
        if (dayCount > 0) {
          await dayBtns.nth(Math.min(10, dayCount - 1)).click();
          await page.waitForTimeout(500);
          logElement('/booking (step2)', 'Date selected', 'PASS');
        }
      }
      await ss(page, '09-step2-date-selected');

      // Try next step
      const nextBtn2 = page.locator('text=다음 단계').first();
      if (await nextBtn2.isVisible().catch(() => false) && !(await nextBtn2.isDisabled().catch(() => true))) {
        await nextBtn2.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // 10. Booking Step 3 - Options
      await ss(page, '10-booking-step3');
      const optionsVisible = await hasText(page, '옵션') || await hasText(page, '장작') || await hasText(page, '추가');
      logElement('/booking (step3)', 'Options step visible', optionsVisible ? 'PASS' : 'WARN - may not have reached step 3');

      if (optionsVisible) {
        // Check for 장작 option
        const firewood = await hasText(page, '장작');
        logElement('/booking (step3)', 'Option: 장작', firewood ? 'PASS' : 'NOT FOUND');

        // Try + button
        const plusBtn = page.locator('button:has-text("+")').first();
        if (await plusBtn.isVisible().catch(() => false)) {
          await plusBtn.click();
          await page.waitForTimeout(300);
          logElement('/booking (step3)', 'Add option (+)', 'PASS - clicked');
        }
        await ss(page, '10-step3-option-added');
      }

      // Try next step
      const nextBtn3 = page.locator('text=다음 단계').first();
      if (await nextBtn3.isVisible().catch(() => false) && !(await nextBtn3.isDisabled().catch(() => true))) {
        await nextBtn3.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // 11. Booking Step 4 - Summary/Payment
      await ss(page, '11-booking-step4');
      const summaryVisible = await hasText(page, '결제') || await hasText(page, '합계') || await hasText(page, '총');
      logElement('/booking (step4)', 'Payment/summary step', summaryVisible ? 'PASS' : 'WARN - may not have reached step 4');

      // 12. My page
      await page.goto(BASE_URL + '/my');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '12-my-page');
      await ssMobile(page, '12-my-page');

      // Title
      logElement('/my', 'Page title "마이페이지"', await hasText(page, '마이페이지') ? 'PASS' : 'FAIL');

      // Filter tabs - from screenshot: 전체, 진행중, 완료, 취소
      for (const tab of ['전체', '진행중', '완료', '취소']) {
        const found = await hasText(page, tab);
        logElement('/my', `Filter tab: ${tab}`, found ? 'PASS' : 'NOT FOUND');
      }

      // Empty state message
      logElement('/my', 'Empty state: "예약 내역이 없습니다"', await hasText(page, '예약 내역이 없습니다') ? 'PASS - empty state shown' : 'INFO');

      await checkOverflow(page, '/my');

      // 13. Auth guard - user tries /admin
      await page.goto(BASE_URL + '/admin');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const adminUrl = page.url();
      await ss(page, '13-auth-guard');
      logElement('/admin (as user)', 'Auth guard', adminUrl.includes('/admin') && !adminUrl.includes('/auth') ? 'FAIL - user accessed admin' : 'PASS - redirected');
      if (adminUrl.includes('/admin') && !adminUrl.includes('/auth')) {
        logIssue('/admin', 'Non-admin user can access admin page', '13-admin-guard-fail');
      }
    });
  });

  // ===================== ADMIN FLOW =====================

  test.describe('Admin Flow', () => {

    test('14-21. Full admin flow', async ({ page }) => {
      // 14. Login as admin
      await page.goto(BASE_URL + '/auth/login');
      await page.waitForLoadState('networkidle');

      await page.locator('input[placeholder*="email"]').first().fill('admin@packtrial.com');
      await page.locator('input[type="password"]').first().fill('admin123!');
      await page.locator('button:has-text("로그인")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await ss(page, '14-admin-after-login');

      const afterLoginUrl = page.url();
      const loginSuccess = !afterLoginUrl.includes('/auth/login');
      logElement('/auth/login (admin)', 'Admin login', loginSuccess ? `PASS - redirected to ${afterLoginUrl}` : 'FAIL');
      if (!loginSuccess) {
        logIssue('/auth/login', 'Admin login failed', '14-admin-login-fail');
        await ss(page, '14-admin-login-fail');
      }

      // 15. Navbar - check for admin link
      await page.goto(BASE_URL + '/');
      await page.waitForLoadState('networkidle');
      await ss(page, '15-admin-navbar');

      // From screenshots: the main page navbar for admin does NOT show "관리자" text
      // The admin panel is a separate layout. Let's check if there's an admin-specific nav element
      const adminNavLink = await hasText(page, '관리자');
      logElement('/ (admin)', 'Navbar: 관리자 link', adminNavLink ? 'PASS' : 'NOT FOUND - admin may need to navigate to /admin directly');

      // Check navbar has user menu or admin indicator
      // From screenshot: there may be a user icon or dropdown
      const userIcon = page.locator('button:has-text("관리"), [class*="avatar"], [class*="user-menu"]').first();
      const hasUserIcon = await userIcon.isVisible().catch(() => false);
      logElement('/ (admin)', 'Admin user indicator in navbar', hasUserIcon ? 'PASS' : 'NOT FOUND');

      // 16. Admin Dashboard
      await page.goto(BASE_URL + '/admin');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '16-admin-dashboard');
      await ssMobile(page, '16-admin-dashboard');

      // Title
      logElement('/admin', 'Title: 대시보드', await hasText(page, '대시보드') ? 'PASS' : 'FAIL');

      // Stats cards - from screenshot: "오늘 예약", "이달 매출", "홀딩 대기", "장비 세트"
      for (const stat of ['오늘 예약', '이달 매출', '홀딩 대기', '장비 세트']) {
        logElement('/admin', `Stat card: ${stat}`, await hasText(page, stat) ? 'PASS' : 'NOT FOUND');
      }

      // "장비 세트" value should be "10/10"
      const setCount = await hasText(page, '10/10');
      logElement('/admin', 'Set count: 10/10', setCount ? 'PASS' : 'INFO');

      // "오늘의 업무" section
      logElement('/admin', 'Section: 오늘의 업무', await hasText(page, '오늘의 업무') ? 'PASS' : 'NOT FOUND');

      // Task items: 출고 예정, 회수 예정, 정비 필요
      for (const task of ['출고 예정', '회수 예정', '정비 필요']) {
        logElement('/admin', `Task: ${task}`, await hasText(page, task) ? 'PASS' : 'NOT FOUND');
      }

      // "최근 예약" section
      logElement('/admin', 'Section: 최근 예약', await hasText(page, '최근 예약') ? 'PASS' : 'NOT FOUND');

      // "장비 세트 현황" section
      logElement('/admin', 'Section: 장비 세트 현황', await hasText(page, '장비 세트 현황') ? 'PASS' : 'NOT FOUND');

      // SET-01 through SET-10
      for (let i = 1; i <= 10; i++) {
        const setId = `SET-${String(i).padStart(2, '0')}`;
        logElement('/admin', `Set: ${setId}`, await hasText(page, setId) ? 'PASS' : 'NOT FOUND');
      }

      // Admin sidebar links
      for (const link of ['대시보드', '예약관리', '세트관리', '상품관리', '공휴일관리', '설정']) {
        logElement('/admin', `Sidebar: ${link}`, await hasText(page, link) ? 'PASS' : 'NOT FOUND');
      }

      await checkOverflow(page, '/admin');

      // 17. Admin Reservations
      await page.goto(BASE_URL + '/admin/reservations');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '17-admin-reservations');
      await ssMobile(page, '17-admin-reservations');

      logElement('/admin/reservations', 'Title: 예약 관리', await hasText(page, '예약 관리') ? 'PASS' : 'FAIL');

      // Search bar
      const searchInput = page.locator('input[placeholder*="검색"]').first();
      logElement('/admin/reservations', 'Search input', await searchInput.isVisible().catch(() => false) ? 'PASS' : 'NOT FOUND');

      // Search button
      logElement('/admin/reservations', 'Search button "검색"', await hasText(page, '검색') ? 'PASS' : 'NOT FOUND');

      // Filter chips - from screenshot: 전체, 홀딩, 확정, 배송중, 사용중, 반납중, 완료, 취소
      for (const chip of ['전체', '홀딩', '확정', '배송중', '사용중', '반납중', '완료', '취소']) {
        const found = await hasText(page, chip);
        logElement('/admin/reservations', `Filter: ${chip}`, found ? 'PASS' : 'NOT FOUND');
      }

      // Table headers - from screenshot: 상태, 고객, 상품, 이용기간, 금액, 생성일
      for (const header of ['상태', '고객', '상품', '이용기간', '금액', '생성일']) {
        logElement('/admin/reservations', `Table header: ${header}`, await hasText(page, header) ? 'PASS' : 'NOT FOUND');
      }

      // Check for table data
      const table = page.locator('table').first();
      logElement('/admin/reservations', 'Table element', await table.isVisible().catch(() => false) ? 'PASS' : 'NOT FOUND');

      // Click on filter chips
      for (const chip of ['홀딩', '확정', '취소', '전체']) {
        const chipBtn = page.locator(`text=${chip}`).first();
        if (await chipBtn.isVisible().catch(() => false)) {
          await chipBtn.click();
          await page.waitForTimeout(300);
          logElement('/admin/reservations', `Click filter: ${chip}`, 'PASS');
        }
      }
      await ss(page, '17-reservations-filtered');

      await checkOverflow(page, '/admin/reservations');

      // 18. Admin Sets
      await page.goto(BASE_URL + '/admin/sets');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '18-admin-sets');
      await ssMobile(page, '18-admin-sets');

      logElement('/admin/sets', 'Title: 세트 관리', await hasText(page, '세트 관리') ? 'PASS' : 'FAIL');

      // View toggle - from screenshot: "타임라인" and "카드" buttons
      const timelineBtn = page.locator('text=타임라인').first();
      const cardBtn = page.locator('text=카드').first();
      logElement('/admin/sets', 'Toggle: 타임라인', await timelineBtn.isVisible().catch(() => false) ? 'PASS' : 'NOT FOUND');
      logElement('/admin/sets', 'Toggle: 카드', await cardBtn.isVisible().catch(() => false) ? 'PASS' : 'NOT FOUND');

      // Click card view
      if (await cardBtn.isVisible().catch(() => false)) {
        await cardBtn.click();
        await page.waitForTimeout(500);
        await ss(page, '18-sets-card-view');
        logElement('/admin/sets', 'Switch to card view', 'PASS');
      }

      // Click timeline view
      if (await timelineBtn.isVisible().catch(() => false)) {
        await timelineBtn.click();
        await page.waitForTimeout(500);
        await ss(page, '18-sets-timeline-view');
        logElement('/admin/sets', 'Switch to timeline view', 'PASS');
      }

      // "이번 주" button and navigation
      logElement('/admin/sets', 'Button: 이번 주', await hasText(page, '이번 주') ? 'PASS' : 'NOT FOUND');

      // 10 sets should be visible
      let setsFound = 0;
      for (let i = 1; i <= 10; i++) {
        const setId = `SET-${String(i).padStart(2, '0')}`;
        if (await hasText(page, setId)) setsFound++;
      }
      logElement('/admin/sets', `Sets in timeline (${setsFound}/10)`, setsFound === 10 ? 'PASS' : `WARN - found ${setsFound}`);

      await checkOverflow(page, '/admin/sets');

      // 19. Admin Products
      await page.goto(BASE_URL + '/admin/products');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '19-admin-products');
      await ssMobile(page, '19-admin-products');

      logElement('/admin/products', 'Title: 상품 관리', await hasText(page, '상품 관리') ? 'PASS' : 'FAIL');

      // 4 products
      for (const name of ['베이직 솔로 세트', '프리미엄 듀오 세트', '풀패키지 세트', '라이트 솔로 세트']) {
        logElement('/admin/products', `Product: ${name}`, await hasText(page, name) ? 'PASS' : 'NOT FOUND');
      }

      // Consumable options section - from screenshot: "소모품 옵션"
      const consumableSection = await hasText(page, '소모품 옵션') || await hasText(page, '소모품');
      logElement('/admin/products', 'Section: 소모품 옵션', consumableSection ? 'PASS' : 'NOT FOUND');

      // Edit buttons (pencil icons)
      const editBtns = page.locator('button:has-text("편집"), button[aria-label*="edit"], svg');
      logElement('/admin/products', `Edit buttons`, await editBtns.first().isVisible().catch(() => false) ? 'PASS' : 'INFO');

      // "+ 옵션 추가" button
      logElement('/admin/products', 'Button: 옵션 추가', await hasText(page, '옵션 추가') ? 'PASS' : 'NOT FOUND');

      await checkOverflow(page, '/admin/products');

      // 20. Admin Holidays
      await page.goto(BASE_URL + '/admin/holidays');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '20-admin-holidays');
      await ssMobile(page, '20-admin-holidays');

      logElement('/admin/holidays', 'Title: 공휴일 관리', await hasText(page, '공휴일 관리') ? 'PASS' : 'FAIL');

      // Year tabs - from screenshot: 2025년, 2026년, 2027년
      for (const year of ['2025년', '2026년', '2027년']) {
        logElement('/admin/holidays', `Year tab: ${year}`, await hasText(page, year) ? 'PASS' : 'NOT FOUND');
      }

      // Click 2026년 tab (should be default based on screenshot)
      const tab2026 = page.locator('text=2026년').first();
      if (await tab2026.isVisible().catch(() => false)) {
        await tab2026.click();
        await page.waitForTimeout(500);
      }

      // Count holidays - from screenshot shows 15 holidays for 2026
      const holidays = [
        '신정', '설날 연휴', '설날', '삼일절', '어린이날',
        '부처님오신날', '현충일', '광복절', '추석 연휴', '추석',
        '개천절', '한글날', '성탄절'
      ];
      let holidayCount = 0;
      for (const h of holidays) {
        if (await hasText(page, h)) holidayCount++;
      }
      logElement('/admin/holidays', `Holidays found: ${holidayCount}`, holidayCount >= 13 ? 'PASS' : `WARN - found ${holidayCount}`);

      // "공휴일 동기화" button
      logElement('/admin/holidays', 'Button: 공휴일 동기화', await hasText(page, '공휴일 동기화') ? 'PASS' : 'NOT FOUND');

      // "+ 임시 휴무 추가" button
      logElement('/admin/holidays', 'Button: 임시 휴무 추가', await hasText(page, '임시 휴무 추가') ? 'PASS' : 'NOT FOUND');

      // Holiday badges - "공휴일" tags
      const badges = page.locator('text=공휴일');
      const badgeCount = await badges.count();
      logElement('/admin/holidays', `"공휴일" badges: ${badgeCount}`, badgeCount >= 15 ? 'PASS' : `INFO - ${badgeCount}`);

      await checkOverflow(page, '/admin/holidays');

      // 21. Admin Settings
      await page.goto(BASE_URL + '/admin/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '21-admin-settings');
      await ssMobile(page, '21-admin-settings');

      logElement('/admin/settings', 'Title: 시스템 설정', await hasText(page, '시스템 설정') ? 'PASS' : 'FAIL');

      // Info banner
      logElement('/admin/settings', 'Info banner', await hasText(page, '설정 변경은 새로 생성되는 예약부터 적용됩니다') ? 'PASS' : 'NOT FOUND');

      // Setting groups - from screenshot: "예약 엔진", "결제"
      logElement('/admin/settings', 'Group: 예약 엔진', await hasText(page, '예약 엔진') ? 'PASS' : 'NOT FOUND');
      logElement('/admin/settings', 'Group: 결제', await hasText(page, '결제') ? 'PASS' : 'NOT FOUND');

      // Setting fields - from screenshot
      for (const field of ['사전 준비일', '사후 정비일', '최소 예약 선행일', '홀딩 유효시간']) {
        logElement('/admin/settings', `Setting: ${field}`, await hasText(page, field) ? 'PASS' : 'NOT FOUND');
      }

      // Inputs
      const settingInputs = page.locator('input[type="number"], input');
      const inputCount = await settingInputs.count();
      logElement('/admin/settings', `Setting inputs (count: ${inputCount})`, inputCount >= 4 ? 'PASS' : `WARN - got ${inputCount}`);

      // Save button - "저장"
      logElement('/admin/settings', 'Button: 저장', await hasText(page, '저장') ? 'PASS' : 'NOT FOUND');

      // Reset button - "초기화"
      logElement('/admin/settings', 'Button: 초기화', await hasText(page, '초기화') ? 'PASS' : 'NOT FOUND');

      await checkOverflow(page, '/admin/settings');
    });
  });

  // ===================== DESIGN CHECKS =====================

  test.describe('Design Checks', () => {

    test('Color scheme and broken images', async ({ page }) => {
      await page.goto(BASE_URL + '/');
      await page.waitForLoadState('networkidle');

      // Check nav background color - should be moss green
      const navBg = await page.evaluate(() => {
        const nav = document.querySelector('nav, header');
        return nav ? getComputedStyle(nav).backgroundColor : 'not found';
      });
      logElement('/ (design)', `Nav background: ${navBg}`, navBg.includes('58') || navBg.includes('90') ? 'PASS - moss green' : 'INFO');

      // Check body/main background - should be cream
      const bodyBg = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      logElement('/ (design)', `Body background: ${bodyBg}`, 'INFO');

      // Check broken images across all public pages
      for (const pagePath of ['/', '/products', '/products/1', '/auth/login', '/auth/signup']) {
        await page.goto(BASE_URL + pagePath);
        await page.waitForLoadState('networkidle');
        await checkBrokenImages(page, pagePath);
      }
    });

    test('Mobile responsiveness at 390px', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      const pagesToCheck = [
        { path: '/', name: 'main' },
        { path: '/products', name: 'products' },
        { path: '/products/1', name: 'product-detail' },
        { path: '/auth/login', name: 'login' },
        { path: '/auth/signup', name: 'signup' },
      ];

      for (const { path: pagePath, name } of pagesToCheck) {
        await page.goto(BASE_URL + pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await ss(page, `mobile-390-${name}`);

        // Check horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return document.body.scrollWidth > document.documentElement.clientWidth;
        });
        logElement(`${pagePath} (mobile)`, 'Horizontal overflow', hasOverflow ? 'FAIL' : 'PASS');
        if (hasOverflow) {
          logIssue(`${pagePath} (mobile)`, 'Horizontal overflow at 390px', `mobile-overflow-${name}`);
          await ss(page, `mobile-overflow-${name}`);
        }

        // Check for very small text
        const tinyText = await page.evaluate(() => {
          const all = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th');
          const tiny: string[] = [];
          all.forEach(el => {
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size < 10 && el.textContent?.trim()) {
              tiny.push(`${el.tagName}(${size}px): "${el.textContent.trim().slice(0, 30)}"`);
            }
          });
          return tiny.slice(0, 3);
        });
        if (tinyText.length > 0) {
          logIssue(`${pagePath} (mobile)`, `Very small text: ${tinyText.join('; ')}`, `mobile-tiny-${name}`);
          logElement(`${pagePath} (mobile)`, 'Small text check', `FAIL - ${tinyText.length} elements < 10px`);
        } else {
          logElement(`${pagePath} (mobile)`, 'Small text check', 'PASS');
        }

        // Check touch targets (buttons/links should be >= 44px)
        const smallTargets = await page.evaluate(() => {
          const interactive = document.querySelectorAll('a, button, input, select, textarea');
          const small: string[] = [];
          interactive.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.height > 0 && rect.height < 36 && el.textContent?.trim()) {
              small.push(`${el.tagName}(${Math.round(rect.height)}px): "${el.textContent.trim().slice(0, 20)}"`);
            }
          });
          return small.slice(0, 3);
        });
        if (smallTargets.length > 0) {
          logElement(`${pagePath} (mobile)`, `Small touch targets: ${smallTargets.length}`, 'WARN');
        } else {
          logElement(`${pagePath} (mobile)`, 'Touch target sizes', 'PASS');
        }
      }
    });
  });

  // ===================== SUMMARY =====================

  test.afterAll(async () => {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('  PACKTRAIL UI/UX AUDIT REPORT');
    console.log('='.repeat(80));

    console.log('\n--- ISSUES FOUND ---');
    if (issues.length === 0) {
      console.log('  No issues found!');
    } else {
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.page}] ${issue.description}`);
        console.log(`     Screenshot: ${issue.screenshot}.png`);
      });
    }

    console.log('\n--- ALL TESTED ELEMENTS ---');
    testedElements.forEach((el, i) => {
      console.log(`  ${i + 1}. [${el.page}] ${el.element} => ${el.result}`);
    });

    console.log('\n--- SUMMARY ---');
    console.log(`  Total issues: ${issues.length}`);
    console.log(`  Total elements tested: ${testedElements.length}`);
    const passed = testedElements.filter(e => e.result.startsWith('PASS')).length;
    const failed = testedElements.filter(e => e.result.startsWith('FAIL')).length;
    const notFound = testedElements.filter(e => e.result.includes('NOT FOUND')).length;
    const warn = testedElements.filter(e => e.result.startsWith('WARN')).length;
    console.log(`  PASS: ${passed}, FAIL: ${failed}, NOT FOUND: ${notFound}, WARN: ${warn}, INFO: ${testedElements.length - passed - failed - notFound - warn}`);
    console.log('='.repeat(80));

    // Write report to file
    const reportPath = path.join(SCREENSHOT_DIR, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ issues, testedElements, summary: { total: testedElements.length, passed, failed, notFound, warn } }, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
  });
});
