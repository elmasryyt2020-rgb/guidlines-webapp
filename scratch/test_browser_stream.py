import asyncio
from playwright.async_api import async_playwright
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))
        
        async def on_request(request):
            if not any(ext in request.url for ext in [".js", ".css", ".svg", ".png", ".ico", "_next/"]):
                print(f"[REQ] {request.method} {request.url}")
        page.on("request", on_request)

        async def on_response(response):
            if not any(ext in response.url for ext in [".js", ".css", ".svg", ".png", ".ico", "_next/"]):
                print(f"[RESP] {response.status} {response.url} (headers: {dict(response.headers)})")
        page.on("response", on_response)

        print("Navigating to http://41.33.93.208/sign-in...")
        await page.goto("http://41.33.93.208/sign-in", wait_until="networkidle")

        print("Logging in...")
        await page.fill('input#email, input[type="email"]', "elmasry.yt2020@gmail.com")
        await page.fill('input#password, input[type="password"]', "Gothi2027")
        await page.click('button[type="submit"]')

        print("Waiting for /chat...")
        await page.wait_for_url("**/chat**", timeout=15000)
        await page.wait_for_timeout(2000)

        # Click "+ NEW CONSULT"
        print("Clicking '+ NEW CONSULT' button...")
        new_consult_btn = page.locator('button:has-text("NEW CONSULT"), button:has-text("New Consult")')
        await new_consult_btn.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path="scratch/06_new_consult_state.png")

        print("Looking for chat input...")
        chat_input = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="otitis"], input[type="text"]').first
        await chat_input.wait_for(state="visible", timeout=10000)

        question = "What are the contraindications of Ace inhibitors. With references by page number"
        print(f"Typing question: {question}")
        await chat_input.fill(question)
        await page.screenshot(path="scratch/07_typed_in_new_consult.png")

        # Send question
        print("Sending message...")
        await chat_input.press("Enter")

        print("Monitoring stream for 15 seconds...")
        for i in range(15):
            await page.wait_for_timeout(1000)
            await page.screenshot(path=f"scratch/08_new_stream_sec_{i+1:02d}.png")
            bubbles = await page.locator('.font-sans, [class*="bubble"], [class*="message"]').all_text_contents()
            print(f"[{i+1}s] Bubble count: {len(bubbles)}")

        await page.screenshot(path="scratch/09_new_final_state.png")
        print("Done!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
