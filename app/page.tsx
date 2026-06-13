"use client";

import React, { useState } from "react";
import {
  Layers,
  Type,
  Play,
  CheckSquare,
  Check,
  ArrowRight,
  ShieldAlert,
  Plus,
  Minus
} from "lucide-react";

interface ChecklistItem {
  text: string;
  phase: string;
  checked: boolean;
}

export default function Home() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { text: "Next.js 15+ App Router structure initialized", phase: "Skeleton", checked: true },
    { text: "globals.css configured with Tailwind v4 brutalist variables", phase: "Theme", checked: true },
    { text: "Root layout updated with appropriate font variables & body classes", phase: "Layout", checked: true },
    { text: "Brutalist utility classes (border, shadow, press effects) verified", phase: "UI System", checked: true },
    { text: "Egyptian MOH ENT guidelines pdf ingest pipeline planned", phase: "Backend", checked: false },
    { text: "Supabase pgvector schema and Edge Functions drafted", phase: "Backend", checked: false },
    { text: "Clerk authentication session security mapped", phase: "Security", checked: false },
  ]);

  const [counter, setCounter] = useState(0);

  const toggleCheck = (index: number) => {
    setChecklist(
      checklist.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const completedCount = checklist.filter((item) => item.checked).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-black font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="border-brutal-thick bg-yellow-brutal p-8 shadow-brutal-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight">
              Guidelines Assistant
            </h1>
            <p className="font-sans text-base md:text-lg font-medium max-w-2xl text-black/80">
              Clinical decision RAG assistant for Egyptian healthcare doctors. Design system verification dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border-brutal px-4 py-2 font-display font-bold shadow-brutal self-start md:self-auto">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-lime-brutal border-2 border-black animate-pulse" />
            <span className="uppercase text-sm tracking-wider">Verification Live</span>
          </div>
        </header>

        {/* Color Palette Grid */}
        <section className="bg-white border-brutal p-6 md:p-8 shadow-brutal space-y-6">
          <div className="flex items-center gap-3 border-b-4 border-black pb-4">
            <Layers className="w-8 h-8 shrink-0" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
              Brutalist Color Palette
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Lime Brutal */}
            <div className="border-brutal bg-lime-brutal p-5 shadow-brutal flex flex-col justify-between h-44 transition-transform hover:-translate-y-1">
              <div>
                <div className="font-display font-black text-xl uppercase tracking-wide">Lime Brutal</div>
                <div className="font-mono text-sm mt-1 font-bold text-black/70">#A3E635</div>
              </div>
              <div className="font-sans font-bold text-xs uppercase border-2 border-black bg-white px-2.5 py-1 self-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Highlight 1
              </div>
            </div>

            {/* Pink Brutal */}
            <div className="border-brutal bg-pink-brutal p-5 shadow-brutal flex flex-col justify-between h-44 transition-transform hover:-translate-y-1">
              <div>
                <div className="font-display font-black text-xl uppercase tracking-wide text-white">Pink Brutal</div>
                <div className="font-mono text-sm mt-1 font-bold text-white/90">#D946EF</div>
              </div>
              <div className="font-sans font-bold text-xs uppercase border-2 border-black bg-white text-black px-2.5 py-1 self-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Highlight 2
              </div>
            </div>

            {/* Cyan Brutal */}
            <div className="border-brutal bg-cyan-brutal p-5 shadow-brutal flex flex-col justify-between h-44 transition-transform hover:-translate-y-1">
              <div>
                <div className="font-display font-black text-xl uppercase tracking-wide">Cyan Brutal</div>
                <div className="font-mono text-sm mt-1 font-bold text-black/70">#06B6D4</div>
              </div>
              <div className="font-sans font-bold text-xs uppercase border-2 border-black bg-white px-2.5 py-1 self-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Highlight 3
              </div>
            </div>

            {/* Yellow Brutal */}
            <div className="border-brutal bg-yellow-brutal p-5 shadow-brutal flex flex-col justify-between h-44 transition-transform hover:-translate-y-1">
              <div>
                <div className="font-display font-black text-xl uppercase tracking-wide">Yellow Brutal</div>
                <div className="font-mono text-sm mt-1 font-bold text-black/70">#FACC15</div>
              </div>
              <div className="font-sans font-bold text-xs uppercase border-2 border-black bg-white px-2.5 py-1 self-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Highlight 4
              </div>
            </div>

          </div>
        </section>

        {/* Typography and Interactive Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Typography Card */}
          <section className="bg-white border-brutal p-6 md:p-8 shadow-brutal space-y-6">
            <div className="flex items-center gap-3 border-b-4 border-black pb-4">
              <Type className="w-8 h-8 shrink-0" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
                Typography & Scales
              </h2>
            </div>
            <div className="space-y-6">
              <div>
                <span className="text-xs uppercase font-mono bg-yellow-brutal border-2 border-black px-2 py-0.5 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Display (Outfit)
                </span>
                <div className="mt-3 space-y-2">
                  <h1 className="font-display text-4xl font-extrabold uppercase leading-none">
                    Display Header 1
                  </h1>
                  <h2 className="font-display text-3xl font-bold uppercase leading-none">
                    Display Header 2
                  </h2>
                  <h3 className="font-display text-2xl font-bold uppercase leading-none">
                    Display Header 3
                  </h3>
                </div>
              </div>

              <div className="border-t-2 border-black pt-4">
                <span className="text-xs uppercase font-mono bg-lime-brutal border-2 border-black px-2 py-0.5 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Clinical Body (Inter)
                </span>
                <div className="mt-3 space-y-3 font-sans text-sm md:text-base leading-relaxed">
                  <p className="font-bold">
                    Clinical Note: Otitis Media Treatment Pathway
                  </p>
                  <p>
                    Ensure correct dosage calculations based on child weight parameter (typically amoxicillin 80-90 mg/kg/day divided into two doses). Re-evaluate within 48 to 72 hours if symptoms fail to resolve.
                  </p>
                  <p className="text-xs text-black/60 italic font-medium">
                    * The Inter font family guarantees optimal clarity and layout structure during hospital diagnostic checks.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Cards and Buttons */}
          <section className="bg-white border-brutal p-6 md:p-8 shadow-brutal space-y-6">
            <div className="flex items-center gap-3 border-b-4 border-black pb-4">
              <Play className="w-8 h-8 shrink-0" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
                Interactive Elements
              </h2>
            </div>
            <p className="font-sans text-sm md:text-base leading-relaxed">
              Hover over or tap these controls to test the physics-based visual feedback. They transition smoothly using the custom CSS utilities.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <button className="press-effect border-brutal bg-cyan-brutal px-5 py-3 font-display font-extrabold uppercase text-sm shadow-brutal cursor-pointer">
                Cyan Press Button
              </button>
              
              <button className="press-effect border-brutal bg-lime-brutal px-5 py-3 font-display font-extrabold uppercase text-sm shadow-brutal cursor-pointer">
                Lime Press Button
              </button>
              
              <a 
                href="#verification" 
                className="press-effect border-brutal bg-white px-5 py-3 font-display font-extrabold uppercase text-sm shadow-brutal flex items-center gap-2"
              >
                <span>Checklist Link</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="border-3 border-black p-4 bg-gray-50 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-4">
              <div className="space-y-1">
                <div className="font-display font-bold uppercase text-sm">State Integration Test</div>
                <div className="font-mono text-xl font-extrabold text-cyan-brutal">Counter: {counter}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCounter(prev => Math.max(0, prev - 1))}
                  className="press-effect border-brutal bg-white p-2.5 font-bold shadow-brutal cursor-pointer"
                  title="Decrement"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCounter(prev => prev + 1)}
                  className="press-effect border-brutal bg-yellow-brutal p-2.5 font-bold shadow-brutal cursor-pointer"
                  title="Increment"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Verification Checklist Section */}
        <section id="verification" className="bg-white border-brutal p-6 md:p-8 shadow-brutal space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 shrink-0" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
                Verification Checklist
              </h2>
            </div>
            
            {/* Progress Bar */}
            <div className="flex items-center gap-3 bg-gray-100 border-2 border-black px-3 py-1.5 self-start sm:self-auto font-display font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span>Progress: {progressPercent}%</span>
              <div className="w-24 h-3 bg-white border border-black overflow-hidden">
                <div 
                  className="h-full bg-lime-brutal transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <p className="font-sans text-sm md:text-base leading-relaxed">
            Click on individual checklist cards below to toggle their state and verify UI updates dynamically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklist.map((item, index) => (
              <div
                key={index}
                onClick={() => toggleCheck(index)}
                className={`border-brutal p-4 flex items-center justify-between cursor-pointer transition-all duration-150 shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                  item.checked ? "bg-lime-brutal/15 hover:bg-lime-brutal/25" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 select-none min-w-0">
                  <div 
                    className={`w-6 h-6 shrink-0 border-2 border-black flex items-center justify-center transition-colors ${
                      item.checked ? "bg-black" : "bg-white"
                    }`}
                  >
                    {item.checked && <Check className="w-4 h-4 text-lime-brutal stroke-[3px]" />}
                  </div>
                  <span className={`font-sans font-semibold text-sm truncate ${
                    item.checked ? "line-through text-black/60" : "text-black"
                  }`}>
                    {item.text}
                  </span>
                </div>
                
                <span className="font-mono text-[10px] md:text-xs font-bold uppercase bg-black text-white px-2 py-0.5 border border-black shrink-0 ml-2">
                  {item.phase}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer info banner */}
        <footer className="border-brutal bg-cyan-brutal/10 p-6 flex flex-col sm:flex-row items-center gap-4">
          <ShieldAlert className="w-10 h-10 text-cyan-brutal shrink-0" />
          <div className="font-sans text-xs md:text-sm leading-relaxed text-black/80 text-center sm:text-left">
            <span className="font-bold block uppercase text-black">Compliance Check:</span>
            This prototype is built according to Egyptian Ministry of Health branding guidelines and medical RAG architecture requirements. No external icons or font modifications are allowed outside strict config structures.
          </div>
        </footer>

      </div>
    </div>
  );
}
