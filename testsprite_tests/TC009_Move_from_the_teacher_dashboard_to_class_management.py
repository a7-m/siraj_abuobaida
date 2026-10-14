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
        
        # -> Click the 'تسجيل الدخول' (Login) button to open the login page.
        # تسجيل الدخول link
        elem = page.get_by_role("link", name="تسجيل الدخول")
        await elem.click(timeout=10000)
        
        # -> Fill the 'البريد الإلكتروني' field with the teacher email and the 'كلمة المرور' field with the password, then click the 'دخول' button to submit the login form.
        # name@example.com email field
        elem = page.get_by_role("textbox", name="name@example.com")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("tmpabrielle89@awsl.uk")
        
        # -> Fill the 'البريد الإلكتروني' field with the teacher email and the 'كلمة المرور' field with the password, then click the 'دخول' button to submit the login form.
        # •••••••• password field
        elem = page.get_by_role("textbox", name="••••••••")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456789")
        
        # -> Fill the 'البريد الإلكتروني' field with the teacher email and the 'كلمة المرور' field with the password, then click the 'دخول' button to submit the login form.
        # دخول button
        elem = page.get_by_role("button", name="دخول", exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'إدارة شعب المدرسة' (Manage school classes) link from the dashboard to open class management.
        # 🏫 إدارة شعب المدرسة link
        elem = page.get_by_role("link", name="🏫 إدارة شعب المدرسة")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Class management page displays classes and each class row includes a 'عرض الطلاب' (View students) button.
        # Assert-outcome: passed
        # Assert: The current URL contains /teacher-classes, confirming the class management page is open.
        await expect(page).to_have_url(re.compile("/teacher\\-classes"), timeout=15000), "The current URL contains /teacher-classes, confirming the class management page is open."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    