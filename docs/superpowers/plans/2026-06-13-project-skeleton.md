# Project Skeleton and UI styling Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Next.js project skeleton with TypeScript, App Router, Tailwind CSS, and configure the core Neo-brutalist styling foundation.

**Architecture:** Initialize a standard Next.js 15 app router template in the root directory. Extract next/font/google configurations in layout.tsx. Customize Tailwind configuration (supporting v3 or v4 depending on what create-next-app installs) with variables reflecting the custom brutalist color palette, borders, zero-blur shadows, and micro-animations.

**Tech Stack:** Next.js (App Router, TS), Tailwind CSS, Lucide React.

---

### Task 1: Next.js Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- Modify: None (initial scaffolding)

- [ ] **Step 1: Bootstrap the project**
  Run: `npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --use-npm --import-alias "@/*" --yes`
  Expected: Success output showing Next.js project skeleton initialized.

- [ ] **Step 2: Commit initial skeleton**
  Run:
  ```bash
  git init
  git add .
  git commit -m "chore: initial Next.js skeleton from create-next-app"
  ```
  Expected: Git repository initialized (if not already) and files committed.

---

### Task 2: Configure Fonts & Layout

**Files:**
- Modify: `app/layout.tsx` (reference font loader next/font/google)

- [ ] **Step 1: Edit layout file to load Google Fonts**
  Modify: `app/layout.tsx`
  Code:
  ```tsx
  import type { Metadata } from "next";
  import { Inter, Outfit } from "next/font/google";
  import "./globals.css";

  const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
  });

  const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    display: "swap",
  });

  export const metadata: Metadata = {
    title: "Medical Guidelines Assistant",
    description: "Clinical assistant and mind-mapping system for Egyptian healthcare doctors.",
  };

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <body className="antialiased font-sans bg-[#FFFFFF] text-black min-h-[100dvh]">
          {children}
        </body>
      </html>
    );
  }
  ```

- [ ] **Step 2: Install lucide-react**
  Run: `npm install lucide-react`
  Expected: Packages installed.

---

### Task 3: Tailwind Config & Design Tokens

**Files:**
- Create/Modify: `tailwind.config.ts` (or `tailwind.config.js` if generated as JS)
- Modify: `app/globals.css`

- [ ] **Step 1: Detect Tailwind version**
  Check if `tailwind.config.ts` or `tailwind.config.js` exists. If not, check if `app/globals.css` uses Tailwind v4 syntax.

- [ ] **Step 2: Update configuration**
  * If Tailwind v3 (config file exists):
    Overwrite `tailwind.config.ts` or `tailwind.config.js`:
    ```ts
    import type { Config } from "tailwindcss";

    const config: Config = {
      content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
      ],
      theme: {
        extend: {
          fontFamily: {
            sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
            display: ["var(--font-outfit)", "sans-serif"],
          },
          colors: {
            limeBrutal: "#A3E635",
            pinkBrutal: "#D946EF",
            cyanBrutal: "#06B6D4",
            yellowBrutal: "#FACC15",
          },
          boxShadow: {
            brutal: "4px 4px 0px 0px rgba(0,0,0,1)",
            brutalLg: "6px 6px 0px 0px rgba(0,0,0,1)",
          },
          borderWidth: {
            '3': '3px',
          }
        },
      },
      plugins: [],
    };
    export default config;
    ```
  * If Tailwind v4 (configured in globals.css):
    Update `app/globals.css` to define the theme:
    ```css
    @import "tailwindcss";

    @theme {
      --font-sans: var(--font-inter), ui-sans-serif, system-ui;
      --font-display: var(--font-outfit), sans-serif;
      --color-lime-brutal: #A3E635;
      --color-pink-brutal: #D946EF;
      --color-cyan-brutal: #06B6D4;
      --color-yellow-brutal: #FACC15;
    }
    ```

- [ ] **Step 3: Add core brutalist styling utilities to app/globals.css**
  Modify: `app/globals.css` to add the custom utility classes:
  ```css
  /* For Tailwind v3, these will be normal CSS classes. For Tailwind v4, we append them. */
  @layer utilities {
    .border-brutal {
      border: 3px solid #000000;
    }
    .border-brutal-thick {
      border: 4px solid #000000;
    }
    .shadow-brutal {
      box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
    }
    .shadow-brutal-lg {
      box-shadow: 6px 6px 0px 0px rgba(0,0,0,1);
    }
    .press-effect {
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .press-effect:hover {
      transform: translate(-4px, -4px);
      box-shadow: 6px 6px 0px 0px rgba(0,0,0,1);
    }
    .press-effect:active {
      transform: translate(0px, 0px);
      box-shadow: none;
    }
  }
  ```

---

### Task 4: Showcase Page & Verification

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement showcase in app/page.tsx**
  Modify: `app/page.tsx`
  Code:
  ```tsx
  import { Shield, Sparkles, Activity, FileText, CheckCircle2 } from "lucide-react";

  export default function Home() {
    return (
      <main className="p-8 max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-brutal-thick bg-yellow-brutal p-8 shadow-brutal text-center space-y-4">
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight">
            Guidelines Assistant
          </h1>
          <p className="font-sans text-lg md:text-xl font-medium border-t-2 border-black pt-4 max-w-[60ch] mx-auto">
            Neo-Brutalist Design System & Foundation. Optimized for clinical utility, visual clarity, and responsiveness.
          </p>
        </header>

        {/* Color Palette Grid */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black uppercase">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-brutal bg-lime-brutal p-6 shadow-brutal flex flex-col justify-between h-32">
              <span className="font-sans font-bold text-sm">Highlight 1</span>
              <span className="font-display font-black text-xl">LIME GREEN</span>
            </div>
            <div className="border-brutal bg-pink-brutal p-6 shadow-brutal flex flex-col justify-between h-32 text-white">
              <span className="font-sans font-bold text-sm">Highlight 2</span>
              <span className="font-display font-black text-xl">MAGENTA</span>
            </div>
            <div className="border-brutal bg-cyan-brutal p-6 shadow-brutal flex flex-col justify-between h-32">
              <span className="font-sans font-bold text-sm">Highlight 3</span>
              <span className="font-display font-black text-xl">CYAN</span>
            </div>
            <div className="border-brutal bg-yellow-brutal p-6 shadow-brutal flex flex-col justify-between h-32">
              <span className="font-sans font-bold text-sm">Highlight 4</span>
              <span className="font-display font-black text-xl">SUN YELLOW</span>
            </div>
          </div>
        </section>

        {/* Typography and Interactive Components */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Typography */}
          <div className="border-brutal p-6 shadow-brutal bg-white space-y-4">
            <h2 className="font-display text-2xl font-black uppercase border-b-2 border-black pb-2">Typography</h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono text-gray-500 uppercase block mb-1">Display (Outfit / Plus Jakarta)</span>
                <p className="font-display text-3xl font-black uppercase">Heading 1</p>
              </div>
              <div>
                <span className="text-xs font-mono text-gray-500 uppercase block mb-1">Clinical Body (Inter)</span>
                <p className="font-sans text-base text-gray-700 leading-relaxed">
                  Clinical guidelines must be clean and highly legible. We use Inter for body text to ensure diagnoses, diagnostic tests, and treatment plans read clearly.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Elements */}
          <div className="border-brutal p-6 shadow-brutal bg-white space-y-6">
            <h2 className="font-display text-2xl font-black uppercase border-b-2 border-black pb-2">Interactive Elements</h2>
            <div className="space-y-4">
              <button className="w-full text-center py-3 px-6 bg-cyan-brutal font-display font-black uppercase border-brutal shadow-brutal press-effect flex items-center justify-center gap-2 cursor-pointer">
                <Activity className="w-5 h-5" />
                Active Button
              </button>
              <button className="w-full text-center py-3 px-6 bg-lime-brutal font-display font-black uppercase border-brutal shadow-brutal press-effect flex items-center justify-center gap-2 cursor-pointer">
                <Shield className="w-5 h-5" />
                Confirm Plan
              </button>
            </div>
          </div>
        </section>

        {/* Verification Checklist */}
        <footer className="border-brutal bg-[#F3F4F6] p-6 shadow-brutal space-y-4">
          <h3 className="font-display text-lg font-black uppercase flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Verification Checklist
          </h3>
          <ul className="font-sans text-sm space-y-2 text-gray-800">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-black rounded-full" /> No emojis used (only Lucide icons)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-black rounded-full" /> Zero-blur box shadows styled using custom tokens
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-black rounded-full" /> Solid borders (3px/4px black outlines)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-black rounded-full" /> Google Fonts configured via next/font/google
            </li>
          </ul>
        </footer>
      </main>
    );
  }
  ```

- [ ] **Step 2: Run verification and typechecking**
  Run commands:
  - `npm run lint`
  - `npx tsc --noEmit`
  Expected: No linting or typechecking errors.

- [ ] **Step 3: Run the dev server**
  Run: `npm run dev` in background, verify page load, stop.
