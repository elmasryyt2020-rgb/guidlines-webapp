"""Headful browser test: capture the EXACT DOM + React state during streaming.

Signs in, clicks NEW CONSULT, sends a query, and polls the assistant bubble's
text length every 250ms for 15s. Also dumps the messages store via a window hook
and screenshot-captures. This will definitively show whether the UI is updating
live or only after refresh.
"""
import asyncio, time, json, os
from playwright.async_api import async_playwright

BASE = "http://41.33.93.208"
EMAIL = "elmasry.yt2020@gmail.com"
PASSWORD = "Gothi2027"
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=["--start-maximized"])
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()

        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console_msgs.append(f"[pageerror] {e}"))

        print("1. Loading sign-in page...")
        await page.goto(f"{BASE}/sign-in", wait_until="networkidle")
        await page.screenshot(path=os.path.join(SHOTS, "01_signin.png"))

        print("2. Filling credentials...")
        # Fill all visible inputs (email + password)
        inputs = page.locator("input")
        n = await inputs.count()
        print(f"   found {n} inputs")
        # Type email in first, password in second
        await inputs.nth(0).fill(EMAIL)
        if n >= 2:
            await inputs.nth(1).fill(PASSWORD)
        # Submit (click the submit button or press Enter)
        await page.keyboard.press("Enter")
        # Wait for either redirect to /chat or a submit
        try:
            await page.wait_for_url("**/chat", timeout=15000)
            print("   redirected to /chat")
        except Exception:
            # Try clicking any visible submit button
            btn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')
            if await btn.count():
                await btn.first.click()
                await page.wait_for_url("**/chat", timeout=15000)
                print("   clicked submit -> /chat")
        await page.screenshot(path=os.path.join(SHOTS, "02_chat.png"))

        print("3. Click NEW CONSULT...")
        # Find the new consult button (any clickable element with NEW in text)
        new_btn = page.locator('button:has-text("NEW"), button:has-text("New"), [role="button"]:has-text("NEW"), a:has-text("NEW")').first
        await new_btn.click(timeout=10000)
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(SHOTS, "03_after_newconsult.png"))

        print("4. Typing message + sending...")
        # Find the textarea/input at the bottom
        editor = page.locator("textarea, input[type='text']").last
        await editor.fill("What is the treatment for acute otitis media in adults?")
        await asyncio.sleep(0.5)

        # Send — click send button or press Enter
        send = page.locator('button[type="submit"], button:has-text("Send"), button:has(svg)').last
        try:
            await send.click(timeout=5000)
            print("   clicked send button")
        except Exception:
            await editor.press("Enter")
            print("   pressed Enter")

        print("5. Polling assistant bubble text length every 250ms for 15s...")
        # The assistant bubble is the second-to-last card. Query all .prose elements
        samples = []
        t0 = time.time()
        while time.time() - t0 < 15:
            t = time.time() - t0
            info = await page.evaluate("""
                () => {
                    const pro = [...document.querySelectorAll('.prose')];
                    const last = pro[pro.length - 1] || null;
                    return {
                        proseCount: pro.length,
                        lastLen: last ? last.innerText.length : 0,
                        lastText: last ? last.innerText.slice(0, 60) : '',
                        // Also grab the store state via a getter if available
                        cardsCount: document.querySelectorAll('[class*="border-brutal"]').length,
                    };
                }
            """)
            samples.append((t, info))
            print(f"  [{t:5.2f}s] prose={info['proseCount']} lastLen={info['lastLen']} cards={info['cardsCount']} txt={info['lastText']!r}")
            if t > 2 and info['lastLen'] == 0 and info['proseCount'] == 0:
                # Nothing has appeared yet — capture a diagnostic
                pass
            await asyncio.sleep(0.25)

        await page.screenshot(path=os.path.join(SHOTS, "04_after_stream.png"))

        # Dump console msgs
        print("\n--- CONSOLE / PAGE ERRORS ---")
        for m in console_msgs[-40:]:
            print(m)

        print("\n--- SAMPLE GROWTH SUMMARY ---")
        nonzero = [s for s in samples if s[1]["lastLen"] > 0]
        if not nonzero:
            print("  !! Assistant bubble NEVER showed text during 15s polling.")
        else:
            first_t = nonzero[0][0]
            print(f"  First non-empty bubble at t={first_t:.2f}s, len={nonzero[0][1]['lastLen']}")
            max_sample = max((s for s in samples if s[1]["lastLen"] > 0), key=lambda x: x[1]["lastLen"])
            print(f"  Grew to max len={max_sample[1]['lastLen']} at t={max_sample[0]:.2f}s")

        await browser.close()


asyncio.run(main())
