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
        
        # -> Navigate to the signup page by opening the URL '/signup.html' (page title or form will indicate registration).
        await page.goto("http://localhost:5173/signup.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Select the 'الصف الدراسي' (Grade) dropdown and choose the 'السابع' option so the form can reveal/update dependent fields.
        # اختر الصف الخامس السادس السابع الثامن التاسع... dropdown
        elem = page.locator("xpath=/html/body/main/div/form/div[3]/div/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Fill the 'الاسم المعرّف (ثلاثي)' field with a student name, enter a unique email into 'البريد الإلكتروني للإشعارات', set 'الشعبة' to '1', fill 'كلمة المرور' and 'تأكيد كلمة المرور' with 123456789 (then submit the form by clicking 'تسجيل ...
        # مثال: أحمد بن سعيد البلوشي text field
        elem = page.get_by_role("textbox", name="الاسم المعرّف (ثلاثي)")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("\u0637\u0627\u0644\u0628 \u0627\u062e\u062a\u0628\u0627\u0631 \u0645\u0624\u0642\u062a")
        
        # -> Fill the 'الاسم المعرّف (ثلاثي)' field with a student name, enter a unique email into 'البريد الإلكتروني للإشعارات', set 'الشعبة' to '1', fill 'كلمة المرور' and 'تأكيد كلمة المرور' with 123456789 (then submit the form by clicking 'تسجيل ...
        # student@example.com email field
        elem = page.get_by_role("textbox", name="البريد الإلكتروني للإشعارات")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("student_test_20261014_0001@example.com")
        
        # -> Fill the 'الاسم المعرّف (ثلاثي)' field with a student name, enter a unique email into 'البريد الإلكتروني للإشعارات', set 'الشعبة' to '1', fill 'كلمة المرور' and 'تأكيد كلمة المرور' with 123456789 (then submit the form by clicking 'تسجيل ...
        # اختر الشعبة 1 2 3 4 5 dropdown
        elem = page.locator("xpath=/html/body/main/div/form/div[3]/div[2]/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Fill the 'الاسم المعرّف (ثلاثي)' field with a student name, enter a unique email into 'البريد الإلكتروني للإشعارات', set 'الشعبة' to '1', fill 'كلمة المرور' and 'تأكيد كلمة المرور' with 123456789 (then submit the form by clicking 'تسجيل ...
        # •••••••• password field
        elem = page.get_by_role("textbox", name="كلمة المرور", exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456789")
        
        # -> Fill the 'الاسم المعرّف (ثلاثي)' field with a student name, enter a unique email into 'البريد الإلكتروني للإشعارات', set 'الشعبة' to '1', fill 'كلمة المرور' and 'تأكيد كلمة المرور' with 123456789 (then submit the form by clicking 'تسجيل ...
        # •••••••• password field
        elem = page.get_by_role("textbox", name="تأكيد كلمة المرور")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456789")
        
        # -> Click the 'تسجيل حساب جديد' button to submit the registration form and verify the profile completion screen or student dashboard appears.
        # تسجيل حساب جديد button
        elem = page.get_by_role("button", name="تسجيل حساب جديد")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The dashboard page opened after registration (URL contains '/dashboard').
        # Assert-outcome: passed
        # Assert: URL contains '/dashboard', indicating the dashboard is open.
        await expect(page).to_have_url(re.compile("/dashboard"), timeout=15000), "URL contains '/dashboard', indicating the dashboard is open."
        
        # --> The student profile section is visible on the dashboard.
        await page.get_by_text("👤").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: passed
        # Assert: Profile section header with the '👤' icon is visible on the page.
        await expect(page.get_by_text("👤").nth(0)).to_be_visible(timeout=15000), "Profile section header with the '\ud83d\udc64' icon is visible on the page."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    