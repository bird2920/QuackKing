# QuackKing Theme Settings Backup

This file contains the CSS configurations for the "Classic Purple" and "Muted Slate" themes for easy reference and restoration.

## Muted Slate (Current)

This version uses a more subdued palette with deep slates and subtle indigo/teal glows.

### Background & Gradients

```javascript
// Main Background
className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white"

// Animated Glows
<div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.08),transparent_25%),radial-gradient(circle_at_20%_80%,rgba(124,58,237,0.08),transparent_22%)] blur-3xl" />
```

### Cards & Accents

- **Card Background**: `bg-white/5 backdrop-blur-2xl border border-white/10`
- **Shadows**: `shadow-[0_25px_120px_-35px_rgba(99,102,241,0.4)]`
- **Primary Button**: `bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400`

---

## Classic Purple (Original)

This version features high-intensity purples, magentas, and vibrant glows for a "neon party" feel.

### Background & Gradients

```javascript
// Main Background
className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white"

// Animated Glows
<div className="h-full w-full bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.14),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.16),transparent_26%)] blur-3xl" />
```

### Cards & Accents

- **Card Shadows (Vibrant)**: `shadow-[0_25px_120px_-35px_rgba(124,58,237,0.8)]`
- **Secondary Accents**: `text-purple-200`, `border-purple-300/30`
- **Logo Drop Shadow**: `drop-shadow-[0_15px_45px_rgba(79,70,229,0.35)]`
