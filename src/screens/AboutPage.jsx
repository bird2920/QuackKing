import React from "react";
import { useNavigate } from "react-router-dom";
import QuackKingLogo from "../components/QuackKingLogo.jsx";

const Divider = () => (
  <div className="relative my-10 flex items-center justify-center">
    <span className="h-px w-full bg-white/10" />
    <span className="absolute bg-slate-900 px-3 text-2xl">⸻</span>
  </div>
);

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900 text-white">
      <div className="absolute inset-0 opacity-70 mix-blend-screen pointer-events-none">
        <div className="h-full w-full bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.14),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.16),transparent_26%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-purple-100/80 shadow-sm hover:border-amber-200 hover:text-amber-100 transition"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/game")}
            className="rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg hover:scale-[1.02] transition"
          >
            Start Playing
          </button>
        </div>

        <header className="mt-8 text-center space-y-4">
          <div className="flex justify-center">
            <QuackKingLogo className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight drop-shadow-[0_15px_45px_rgba(79,70,229,0.35)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">About QuackKing</h1>
          <p className="text-purple-100/80 max-w-2xl mx-auto">
            The origin story, what it is, and what I’m stress-testing right now.
          </p>
        </header>

        <main className="mt-10 space-y-10 text-slate-100">
          <section className="space-y-4 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_120px_-35px_rgba(124,58,237,0.8)]">
            <p className="text-lg leading-relaxed text-white/90">
              QuackKing started as a joke at work.
            </p>
            <p className="leading-relaxed text-purple-100/80">
              We were talking about how much tribal knowledge exists inside offices — things like “where do invoices live”
              or “which team actually manages user accounts.” Someone joked that it should be turned into a game. I built
              a quick one-page React proof of concept using Gemini just to see if it was even fun.
            </p>
            <p className="leading-relaxed text-purple-100/80">It was.</p>
            <p className="leading-relaxed text-purple-100/80">
              I kept iterating on it after work, taking feedback from coworkers and family, and at some point I got
              weirdly addicted to playing it myself. Along the way it evolved from an internal training idea into a
              general real-time multiplayer trivia game that works well for in-room group play.
            </p>
          </section>

          <Divider />

          <section className="space-y-4">
            <h2 className="text-2xl font-black">What it is</h2>
            <p className="leading-relaxed text-purple-100/80">
              QuackKing is a real-time multiplayer trivia game designed for groups in the same room.
            </p>
            <p className="leading-relaxed text-purple-100/80">
              One person hosts a game on a shared screen. Everyone else joins from their phones. Questions are revealed
              in real time, answers are time-scored, and the group plays together rather than in isolation.
            </p>
            <p className="leading-relaxed text-purple-100/80">
              No accounts are required. You can create a game and start playing immediately.
            </p>
          </section>

          <Divider />

          <section className="space-y-4">
            <h2 className="text-2xl font-black">Why build this instead of using something else?</h2>
            <p className="leading-relaxed text-purple-100/80">I wanted something that:</p>
            <ul className="list-disc list-inside space-y-2 text-purple-100/80">
              <li>works well for in-person groups</li>
              <li>doesn’t require accounts or setup friction</li>
              <li>tolerates refreshes, reconnects, and imperfect connections</li>
              <li>feels like a game, not a form with questions</li>
            </ul>
            <p className="leading-relaxed text-purple-100/80">
              Most existing tools optimized for trivia or training focus on content or administration first. QuackKing
              is intentionally format-first — the goal is to make group play feel fast, social, and forgiving.
            </p>
          </section>

          <Divider />

          <section className="space-y-4">
            <h2 className="text-2xl font-black">High-level architecture</h2>
            <p className="leading-relaxed text-purple-100/80">At a high level:</p>
            <ul className="list-disc list-inside space-y-2 text-purple-100/80">
              <li>Frontend: React</li>
              <li>Realtime state &amp; sync: Firebase</li>
              <li>Hosting / edge: Cloudflare</li>
            </ul>
            <p className="leading-relaxed text-purple-100/80">
              The design favors simplicity and fast iteration over theoretical purity. Game state is centralized enough
              to stay consistent, but flexible enough to recover from refreshes and reconnects without killing a session.
            </p>
          </section>

          <Divider />

          <section className="space-y-4">
            <h2 className="text-2xl font-black">Known limitations / things I’m testing</h2>
            <p className="leading-relaxed text-purple-100/80">
              This is still being actively stress-tested. Areas I’m watching closely:
            </p>
            <ul className="list-disc list-inside space-y-2 text-purple-100/80">
              <li>host disconnect and refresh edge cases</li>
              <li>state consistency under heavier load</li>
              <li>UX clarity for first-time hosts</li>
              <li>perceived fairness of time-based scoring under latency</li>
            </ul>
            <p className="leading-relaxed text-purple-100/80">
              If you find something brittle, there’s a good chance I’m already curious about it too.
            </p>
          </section>

          <Divider />

          <section className="space-y-4">
            <h2 className="text-2xl font-black">What this isn’t</h2>
            <p className="leading-relaxed text-purple-100/80">QuackKing is not:</p>
            <ul className="list-disc list-inside space-y-2 text-purple-100/80">
              <li>a learning management system</li>
              <li>a trivia content marketplace</li>
              <li>a polished commercial product (yet)</li>
            </ul>
            <p className="leading-relaxed text-purple-100/80">
              Right now the focus is on whether the core experience holds up under real use.
            </p>
          </section>

          <Divider />

          <section className="space-y-4">
            <h2 className="text-2xl font-black">Feedback</h2>
            <p className="leading-relaxed text-purple-100/80">
              If you’re poking at edge cases, questioning design decisions, or trying to break things, feedback is
              welcome. I’m happy to talk through tradeoffs or implementation choices.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
