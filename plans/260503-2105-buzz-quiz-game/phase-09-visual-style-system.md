# Phase 9 — Visual Style System

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-08-game-screens-and-flow.md](phase-08-game-screens-and-flow.md)
- Next: [phase-10-audio-system.md](phase-10-audio-system.md)

## Overview
- **Priority**: P2 (parallelizable with screens; "feel" critical)
- **Status**: pending
- **Effort**: ~3h
- Tailwind theme with neon palette + custom keyframes (glow pulse, scanlines, screen shake). Reusable components: NeonButton, NeonText, GlowCard, ScanlineOverlay. Particle burst utility.

## Key Insights
- Tailwind config carries the palette tokens — single source of truth
- Custom keyframes go in `client/src/styles.css` (Tailwind `@layer utilities` for new classes)
- Glow effect = layered `filter: drop-shadow()` with palette color, pulses via CSS animation
- Scanline overlay = repeating linear gradient pseudo-element fixed over viewport, toggleable via context
- Screen shake = brief CSS keyframes class added to `body` (via hook from phase 8)
- Bungee + Space Grotesk loaded from Google Fonts via `@import` in styles.css

## Requirements
**Functional**
- Tailwind theme exports `colors.neon.{pink, cyan, gold, black}`, `fontFamily.display` (Bungee), `fontFamily.body` (Space Grotesk)
- Custom utilities: `.text-glow-pink`, `.text-glow-cyan`, `.text-glow-gold`, `.bg-glow-pink`, etc.
- `<NeonButton>` — large pill button, glowing border, hover/press states, 3 variants (primary pink, secondary cyan, accent gold)
- `<NeonText>` — display heading with glow, configurable color
- `<GlowCard>` — card with neon border + subtle inset glow
- `<ScanlineOverlay>` — fixed-position overlay; toggleable via Settings context (default ON)
- `useScreenShake()` — hook returning `shake()` function
- `useParticleBurst()` — emits canvas particles at given coords (used for buzz reaction effects)

**Non-functional**
- All effects render on GPU (transforms + filters only, avoid box-shadow recalc on animation)
- Bundle additions <30KB

## Architecture

### Theme tokens (`tailwind.config.ts`)
```ts
colors: {
  neon: {
    pink: '#FF006E',
    cyan: '#00F5FF',
    gold: '#FFD700',
    black: '#0A0014',  // not pure black — slight purple
    dark: '#1A0A2E',
  }
},
fontFamily: {
  display: ['Bungee', 'system-ui', 'sans-serif'],
  body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
},
keyframes: {
  'glow-pulse': { '0%,100%': { filter: 'drop-shadow(0 0 8px currentColor)' }, '50%': { filter: 'drop-shadow(0 0 24px currentColor)' } },
  'screen-shake': { '0%,100%': { transform: 'translate3d(0,0,0)' }, '25%': { transform: 'translate3d(-4px,2px,0)' }, '50%': { transform: 'translate3d(3px,-3px,0)' }, '75%': { transform: 'translate3d(-2px,3px,0)' } },
  'scan': { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '0 4px' } },
},
animation: {
  'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  'screen-shake': 'screen-shake 0.4s ease-in-out',
  'scan': 'scan 0.2s linear infinite',
},
```

### Settings context
- `client/src/lib/settings-context.tsx` — toggles for scanlines, reduced-motion, audio volume (audio used in phase 10)
- Persisted to localStorage

## Related Code Files

**Create**
- `client/src/styles.css` — extend phase 1 stub: Google Fonts import, custom utilities for glow, scanline gradient, body bg
- `client/src/components/style/NeonButton.tsx`
- `client/src/components/style/NeonText.tsx`
- `client/src/components/style/GlowCard.tsx`
- `client/src/components/style/ScanlineOverlay.tsx`
- `client/src/components/style/NeonHeading.tsx` (uses NeonText with display font)
- `client/src/lib/settings-context.tsx`
- `client/src/lib/use-screen-shake.ts`
- `client/src/lib/use-particle-burst.ts` — small canvas-based particle emitter

**Modify**
- `tailwind.config.ts` — full theme as above
- `client/src/main.tsx` — wrap App in `<SettingsProvider>`, render `<ScanlineOverlay>` if enabled
- `client/index.html` — preload Google Fonts (`<link rel="preconnect">` + `<link rel="stylesheet">`)

## Implementation Steps
1. Update `tailwind.config.ts` with full theme (colors, fontFamily, keyframes, animation)
2. Update `client/src/styles.css`:
   - Import Bungee + Space Grotesk via `@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@400;500;700&display=swap');`
   - `body { background: theme('colors.neon.black'); color: theme('colors.neon.cyan'); font-family: theme('fontFamily.body'); }`
   - Custom utility `.text-glow-pink { color: #FF006E; filter: drop-shadow(0 0 8px #FF006E) drop-shadow(0 0 16px #FF006E); }` etc. (and animated version with `animation: glow-pulse infinite`)
   - `.scanlines::after { content:''; position:fixed; inset:0; pointer-events:none; background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px); z-index:9999; }`
3. Build `<NeonButton>` (~50 LOC): `<button>` with Tailwind classes + variant prop. Uses `border-2 border-current` + glow utility, `hover:scale-105 active:scale-95 transition-transform`.
4. Build `<NeonText>` (~30 LOC): `<span>` with glow utility, color prop
5. Build `<NeonHeading>` (~40 LOC): wraps NeonText with display font, size variants (h1/h2/h3), optional pulse animation
6. Build `<GlowCard>` (~40 LOC): `<div>` with neon border (pink/cyan/gold prop), backdrop blur, inset shadow
7. Build `<ScanlineOverlay>` (~30 LOC): conditionally renders div with `.scanlines` class, controlled by SettingsContext
8. Build `settings-context.tsx` (~80 LOC): React context with `{ scanlines, reducedMotion, musicVolume, sfxVolume }` + setters, localStorage persistence
9. Build `use-screen-shake.ts` (~30 LOC): hook returning `shake()` that adds `.animate-screen-shake` class to body for 400ms
10. Build `use-particle-burst.ts` (~80 LOC): hook returning `burst(x, y, color)` that creates a temporary canvas overlay, emits ~30 particles (small circles, randomized velocity), animates over 800ms via requestAnimationFrame, removes canvas. KISS — don't over-engineer.
11. Wire `<SettingsProvider>` + `<ScanlineOverlay>` into `main.tsx`
12. Smoke test: render NeonHeading "BUZZ NIGHT" on a black bg with glow + scanlines; perf check shows no jank

## Todo List
- [ ] Configure Tailwind theme (colors, fonts, keyframes, animations)
- [ ] Update styles.css (Google Fonts, utilities, scanlines)
- [ ] Build NeonButton component
- [ ] Build NeonText component
- [ ] Build NeonHeading component
- [ ] Build GlowCard component
- [ ] Build ScanlineOverlay
- [ ] Build SettingsContext + persistence
- [ ] Build useScreenShake hook
- [ ] Build useParticleBurst hook
- [ ] Wire providers into main.tsx
- [ ] Visual smoke test (render demo screen, check perf)

## Success Criteria
- Demo screen with NeonHeading + NeonButton + GlowCard + scanlines renders at 60fps
- Glow pulse animation runs smoothly without recalc
- Settings toggle hides/shows scanlines instantly
- Screen shake feels punchy (not too long, not too subtle)
- Particle burst pops nicely on click
- Bundle size impact ≤30KB

## Risk Assessment
- **R**: Heavy filter/drop-shadow stacks tank perf on integrated GPUs → **M**: glow utilities use `filter` instead of `box-shadow` (faster compositing); test on average laptop
- **R**: Google Fonts adds FOUT → **M**: `display=swap`, body font ranks higher; accept brief Bungee FOUT (not fatal)
- **R**: Scanlines hurt readability → **M**: settings toggle (default ON), but text always above the overlay (z-index)

## Security Considerations
- Google Fonts CDN call requires internet for first-load font cache; LAN-only use can pre-bake fonts into `/public/fonts/` if needed (defer until phase 11 if user reports issue)
- No user-supplied CSS or styles — all hard-coded
- ScanlineOverlay does not interfere with click events (`pointer-events: none`)

## Next Steps
- Phase 8 (screens) consumes these components
- Phase 10 (audio) uses SettingsContext for volume controls
