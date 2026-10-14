import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5173")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'تسجيل الدخول' link to open the Login page.
        # تسجيل الدخول link
        elem = page.get_by_role("link", name="تسجيل الدخول")
        await elem.click(timeout=10000)
        
        # -> Fill the 'البريد الإلكتروني' field with tmpahmed1980@dreamhunter2333.xyz, fill the 'كلمة المرور' field with 123456789, then click the 'دخول' button to submit the login form.
        # name@example.com email field
        elem = page.get_by_role("textbox", name="name@example.com")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("tmpahmed1980@dreamhunter2333.xyz")
        
        # -> Fill the 'البريد الإلكتروني' field with tmpahmed1980@dreamhunter2333.xyz, fill the 'كلمة المرور' field with 123456789, then click the 'دخول' button to submit the login form.
        # •••••••• password field
        elem = page.get_by_role("textbox", name="••••••••")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456789")
        
        # -> Fill the 'البريد الإلكتروني' field with tmpahmed1980@dreamhunter2333.xyz, fill the 'كلمة المرور' field with 123456789, then click the 'دخول' button to submit the login form.
        # دخول button
        elem = page.get_by_role("button", name="دخول", exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the '✏️ تعديل بياناتي' (Edit my data) button to open the profile completion/edit form and observe the visible fields.
        # ✏️ تعديل بياناتي button
        elem = page.get_by_role("button", name="✏️ تعديل بياناتي")
        await elem.click(timeout=10000)
        
        # -> Open the 'الصف الدراسي' (grade) dropdown to reveal grade options.
        # اختر الصف العاشر الحادي عشر الثاني عشر dropdown
        elem = page.locator("#edit-ao-grade")
        await elem.click(timeout=10000)
        
        # -> Click the '💾 حفظ التغييرات' (Save changes) button to save the profile and return to the dashboard.
        # 💾 حفظ التغييرات button
        elem = page.get_by_role("button", name="💾 حفظ التغييرات")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The dashboard page is open and shows the student greeting 'مساء الخير، test-student 👋'.
        # Assert-outcome: passed
        # Assert: The URL contains '/dashboard', indicating the dashboard is open.
        await expect(page).to_have_url(re.compile("dashboard"), timeout=15000), "The URL contains '/dashboard', indicating the dashboard is open."
        
        # --> The dashboard profile section displays the student's email and profile label 'الشعبة'.
        # Assert-outcome: passed
        # Assert: The profile card contains the 'الشعبة' label, indicating profile fields are shown.
        await expect(page.locator("xpath=/html/body/main/div[2]/section[5]/div[2]/div/div[5]/span[1]").nth(0)).to_have_text("\u0627\u0644\u0634\u0639\u0628\u0629", timeout=15000), "The profile card contains the '\u0627\u0644\u0634\u0639\u0628\u0629' label, indicating profile fields are shown."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    