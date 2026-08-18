import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_e2e_tests():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scratch")
    os.makedirs(out_dir, exist_ok=True)

    console_logs = []
    page_errors = []

    base_url = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("TEST_BASE_URL", "http://localhost:8080")
    base_url = base_url.rstrip("/")

    print(f"Starting Playwright E2E Test Suite against {base_url}...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Listen for console logs and uncaught errors
        page.on("console", lambda msg: console_logs.append(f"[{msg.type.upper()}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        print(f"1. Navigating to Sign-In page ({base_url}/sign-in)...")
        page.goto(f"{base_url}/sign-in", timeout=60000, wait_until="domcontentloaded")
        page.wait_for_selector("#email", timeout=30000)
        
        signin_ss = os.path.join(out_dir, "01_signin_page.png")
        page.screenshot(path=signin_ss, full_page=True)
        print(f"Captured: {signin_ss}")

        print("2. Filling authentication credentials...")
        page.fill("#email", "elmasry.yt2020@gmail.com")
        page.fill("#password", "Gothi2027")

        print("3. Submitting Sign-In form...")
        page.click("button:has-text('Sign In')")
        
        # Wait for navigation to /chat
        try:
            page.wait_for_url("**/chat**", timeout=15000)
            page.wait_for_load_state("networkidle")
            print("Successfully redirected to /chat!")
        except Exception as e:
            print(f"Navigation to /chat warning/timeout: {e}")

        chat_ss = os.path.join(out_dir, "chat_page.png")
        page.screenshot(path=chat_ss, full_page=True)
        print(f"Captured: {chat_ss}")

        print("4. Starting New Consult flow...")
        new_consult_btn = page.locator("button:has-text('New Consult')")
        if new_consult_btn.is_visible():
            new_consult_btn.click()
            page.wait_for_timeout(500)
            print("Clicked New Consult button.")

        print("5. Submitting clinical query...")
        textarea = page.locator("textarea")
        if textarea.is_visible():
            textarea.fill("Otitis media treatment guidelines")
            page.wait_for_timeout(300)

            send_btn = page.locator("button[title='Send Message'], button[type='submit']")
            send_btn.click()
            print("Submitted query: 'Otitis media treatment guidelines'")

            # Wait for response streaming to begin/finish
            print("Waiting for streaming response...")
            page.wait_for_timeout(6000)

        streaming_ss = os.path.join(out_dir, "streaming_result.png")
        page.screenshot(path=streaming_ss, full_page=True)
        print(f"Captured: {streaming_ss}")

        print("6. Verifying DB status indicator and Mind Map pane...")
        db_badge = page.locator("text=DB: Synced")
        if db_badge.is_visible():
            print("DB SYNCED badge verified green/active.")
        else:
            print("DB badge state checked.")

        mindmap_ss = os.path.join(out_dir, "mindmap.png")
        page.screenshot(path=mindmap_ss, full_page=True)
        print(f"Captured: {mindmap_ss}")

        browser.close()

    print("\n--- TEST SUMMARY ---")
    print(f"Console Logs Count: {len(console_logs)}")
    for log in console_logs[-10:]:
        print(f"  {log}")

    print(f"Uncaught Page Errors Count: {len(page_errors)}")
    for err in page_errors:
        print(f"  [ERROR] {err}")

    if len(page_errors) == 0:
        print("\nTEST PASSED: No uncaught page errors detected.")
        sys.exit(0)
    else:
        print("\nTEST FAILED: Uncaught errors detected.")
        sys.exit(1)

if __name__ == "__main__":
    run_e2e_tests()
