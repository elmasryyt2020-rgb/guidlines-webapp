"""Deeper diagnostic: capture network requests, full DOM, and what happened.

The previous test got prose=0 and a 403 error. We need to know:
- Did the chat POST actually fire? To what URL? What status?
- Did the send button click actually work, or did NEW CONSULT not open an input?
- What does the page actually show?
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
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()

        net = []
        async def on_request(req):
            if "/functions/" in req.url or "/auth/" in req.url:
                net.append(f"REQ {req.method} {req.url}")
        async def on_response(resp):
            if "/functions/" in resp.url or "/auth/" in resp.url:
                net.append(f"RES {resp.status} {resp.url}")
        page.on("request", on_request)
        page.on("response", on_response)

        console = []
        page.on("console", lambda m: console.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console.append(f"[pageerror] {e}"))

        print("1. Sign in...")
        await page.goto(f"{BASE}/sign-in", wait_until="networkidle")
        await page.locator("input").nth(0).fill(EMAIL)
        await page.locator("input").nth(1).fill(PASSWORD)
        await page.keyboard.press("Enter")
        await page.wait_for_url("**/chat", timeout=15000)
        print(f"   URL after login: {page.url}")

        print("2. Inspect sidebar + current state BEFORE new consult...")
        info = await page.evaluate("""() => ({
            url: location.href,
            title: document.title,
            // Count clickable new-consult-like items
            buttons: [...document.querySelectorAll('button, a, [role=button]')].filter(b => /new|consult|\\+/i.test(b.innerText || '')).map(b => b.innerText.trim().slice(0,30)),
            // Count conversations in sidebar
            sidebarItems: [...document.querySelectorAll('a, button, div')].filter(e => /Consult|CONSULT/i.test(e.innerText||'') ).length,
        })""")
        print("   ", json.dumps(info, indent=2))

        print("3. Click NEW CONSULT...")
        new_btn = page.get_by_role("button", name="NEW CONSULT")
        await new_btn.click(timeout=10000)
        await asyncio.sleep(1.5)

        print("4. State AFTER new consult click, BEFORE sending...")
        info = await page.evaluate("""() => ({
            url: location.href,
            inputsCount: document.querySelectorAll('textarea, input[type=text]').length,
            inputVisible: (() => {
                const i = [...document.querySelectorAll('textarea, input')].pop();
                if(!i) return null;
                const r = i.getBoundingClientRect();
                return {tag: i.tagName, type: i.type, placeholder: i.placeholder, visible: r.width>0 && r.height>0, disabled: i.disabled};
            })(),
            proseCount: document.querySelectorAll('.prose').length,
            bodyText: document.body.innerText.slice(0, 200),
        })""")
        print("   ", json.dumps(info, indent=2))

        print("5. Type + send...")
        editor = page.locator("textarea, input").last
        await editor.fill("What is the treatment for acute otitis media in adults?")
        await asyncio.sleep(0.3)
        # Try a submit by pressing Enter
        await page.keyboard.press("Enter")
        await asyncio.sleep(1.5)

        # Capture network after attempting send
        print("--- NETWORK (functions/auth) so far ---")
        for n in net[-20:]:
            print("  ", n)
        print("--- CONSOLE so far ---")
        for n in console[-20:]:
            print("  ", n)

        # Poll for the bubble
        print("6. Poll 8s for any .prose growth...")
        t0 = time.time()
        while time.time() - t0 < 8:
            t = time.time() - t0
            inf = await page.evaluate("() => ({proseCount: document.querySelectorAll('.prose').length, lastLen: ([...document.querySelectorAll('.prose')].pop()||{innerText:''}).innerText.length, bodyTail: document.body.innerText.slice(-120)})")
            print(f"  [{t:4.2f}s] prose={inf['proseCount']} lastLen={inf['lastLen']} tail={inf['bodyTail']!r}")
            await asyncio.sleep(0.4)

        print("--- FINAL NETWORK ---")
        for n in net[-30:]:
            print("  ", n)
        print("--- FINAL CONSOLE ---")
        for n in console[-30:]:
            print("  ", n)

        await page.screenshot(path=os.path.join(SHOTS, "diag_final.png"), full_page=True)
        await browser.close()


asyncio.run(main())
