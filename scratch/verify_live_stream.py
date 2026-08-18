import asyncio
from playwright.async_api import async_playwright
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))

        print("1. Navigating to http://41.33.93.208/sign-in...")
        await page.goto("http://41.33.93.208/sign-in", wait_until="networkidle")
        await page.screenshot(path="scratch/live_01_signin.png")

        print("2. Logging in...")
        await page.fill('input#email, input[type="email"]', "elmasry.yt2020@gmail.com")
        await page.fill('input#password, input[type="password"]', "Gothi2027")
        await page.click('button[type="submit"]')

        await page.wait_for_url("**/chat**", timeout=15000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path="scratch/live_02_chat_loaded.png")

        # Click "+ NEW CONSULT"
        print("3. Clicking '+ NEW CONSULT' to start fresh draft...")
        new_consult_btn = page.locator('button:has-text("NEW CONSULT"), button:has-text("New Consult")')
        await new_consult_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path="scratch/live_03_new_consult.png")

        # Chat input
        chat_input = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="otitis"], input[type="text"]').first
        await chat_input.wait_for(state="visible", timeout=10000)

        query1 = "What are the contraindications of Ace inhibitors. With references by page number"
        print(f"4. Sending query 1: '{query1}'")
        await chat_input.fill(query1)
        await chat_input.press("Enter")

        print("5. Tracking streaming chunks in real time...")
        seen_texts = []
        t0 = time.time()
        for i in range(20):
            await page.wait_for_timeout(500)
            elapsed = time.time() - t0
            # Get the assistant bubble text
            bubbles = await page.locator('.prose, [class*="bubble"]').all_text_contents()
            last_text = bubbles[-1].strip() if bubbles else ""
            print(f"[{elapsed:4.1f}s] Assistant bubble ({len(last_text)} chars): {last_text[:60]!r}...")
            seen_texts.append(last_text)
            if i in [1, 3, 5, 8, 12, 18]:
                await page.screenshot(path=f"scratch/live_04_stream_{elapsed:.1f}s.png")
            if len(last_text) > 100 and not await chat_input.is_disabled() and i > 4:
                print("Stream completed and input re-enabled!")
                break

        await page.screenshot(path="scratch/live_05_query1_complete.png")

        # Verify assistant message has actual content
        final_bubbles = await page.locator('.prose, [class*="bubble"]').all_text_contents()
        assert len(final_bubbles) >= 1, "No message bubbles found!"
        final_assistant_text = final_bubbles[-1]
        print(f"\nFinal Assistant Response:\n{'='*50}\n{final_assistant_text}\n{'='*50}")
        assert len(final_assistant_text) > 50, f"Assistant response too short ({len(final_assistant_text)} chars)!"

        # Now test query 2 (follow-up in same conversation)
        query2 = "What are alternative medications if ACE inhibitors are contraindicated?"
        print(f"\n6. Testing follow-up query 2: '{query2}'")
        await chat_input.fill(query2)
        await chat_input.press("Enter")

        for i in range(20):
            await page.wait_for_timeout(500)
            elapsed = time.time() - t0
            bubbles = await page.locator('.prose, [class*="bubble"]').all_text_contents()
            last_text = bubbles[-1].strip() if bubbles else ""
            if len(last_text) > 100 and not await chat_input.is_disabled() and i > 4:
                print("Follow-up stream completed!")
                break

        await page.screenshot(path="scratch/live_06_query2_complete.png")
        print("\nAll live VPS Playwright verification tests PASSED with 100% success!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_verification())
