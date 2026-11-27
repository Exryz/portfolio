import Link from "next/link";
import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
import { BentoFragments, HeroAppFrame } from "@/components/InteractiveWorkbench";
import { PROFILE, PROJECTS, getTotalAutomatedTests } from "@/data/portfolio";

export default function HomePage() {
  const totalTests = getTotalAutomatedTests();

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#f3f1ea]">
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-[#090a0d]/95">
        <div className="wrap flex h-[72px] items-center justify-between gap-4">
          <a
            href="#top"
            className="btn-press flex items-center gap-2.5 text-sm font-medium text-[#f3f1ea]"
          >
            <span className="mark-ring" aria-hidden="true" />
            <span className="font-display text-xl font-medium tracking-tight">{PROFILE.handle}</span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 text-[15px] font-medium text-[#9498a1] md:flex"
          >
            <a href="#hero-workbench" className="transition-colors hover:text-[#f3f1ea]">
              Workbench
            </a>
            <a href="#projects" className="transition-colors hover:text-[#f3f1ea]">
              Systems
            </a>
            <a href="#benchmarks" className="transition-colors hover:text-[#f3f1ea]">
              Benchmarks
            </a>
            <Link href="/sandboxes/rag" className="transition-colors text-[#7ab8d6] hover:text-[#f3f1ea]">
              RAG Sandbox
            </Link>
            <Link href="/sandboxes/docextract" className="transition-colors text-[#c9a66b] hover:text-[#f3f1ea]">
              DocExtract Sandbox
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={PROFILE.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 text-[14px] font-medium text-[#9498a1] transition-colors hover:text-[#f3f1ea]"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>GitHub</span>
            </a>
            <a
              href="#projects"
              className="btn-press inline-flex h-11 items-center rounded-lg bg-[#f3f1ea] px-5 text-[15px] font-medium text-[#090a0d] hover:bg-[#ffffff]"
            >
              Inspect systems
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Screen 1: Centred Hero + Lit Painterly App Frame */}
        <section className="screen-section pt-[88px] pb-8" aria-labelledby="hero-heading">
          <div className="wrap">
            <div className="mx-auto max-w-3xl text-center" data-enter>
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#14161c] px-3.5 py-1 text-[12px] sm:text-[13px] font-medium text-[#f3f1ea]">
                <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-[#c9a66b]" aria-hidden="true" />
                <span className="tabular-nums">
                  {totalTests} automated tests across RAG, MCP &amp; Document AI
                </span>
              </div>

              <h1
                id="hero-heading"
                className="font-display text-4xl font-normal leading-[1.06] text-[#f3f1ea] sm:text-5xl lg:text-[3.125rem]"
              >
                {PROFILE.headline}
              </h1>

              <p className="mx-auto mt-3.5 max-w-2xl text-base leading-relaxed text-[#9498a1]">
                {PROFILE.subheadline}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#projects"
                  className="btn-press inline-flex h-10 items-center rounded-lg bg-[#f3f1ea] px-5 text-[14px] font-medium text-[#090a0d] hover:bg-[#ffffff]"
                >
                  Inspect systems
                </a>
                <a
                  href={PROFILE.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-press inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-[#14161c] px-5 text-[14px] font-medium text-[#f3f1ea] hover:border-[#c9a66b]/60"
                >
                  <span>View on GitHub</span>
                  <ArrowUpRight className="h-4 w-4 text-[#c9a66b]" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div id="hero-workbench" className="mt-6">
              <HeroAppFrame />
            </div>
          </div>
        </section>

        {/* Screen 2: Asymmetric Bento with Lit Frieren Panels & Live UI Fragments */}
        <section id="projects" className="screen-section--compact pt-24 pb-12" aria-labelledby="projects-heading">
          <div className="wrap">
            <div className="max-w-3xl mb-8">
              <h2
                id="projects-heading"
                className="font-display text-3xl font-normal leading-[1.12] text-[#f3f1ea] sm:text-[2.75rem]"
              >
                Production AI systems.{" "}
                <span className="text-[#9498a1]">
                  Built with deterministic verification, strict typing, and offline evaluation suites.
                </span>
              </h2>
            </div>

            <BentoFragments />
          </div>
        </section>

        {/* Screen 3: Verified Benchmark & Architecture Specification Ledger */}
        <section
          id="benchmarks"
          className="screen-section--compact pt-24 pb-16 border-t border-white/[0.06]"
          aria-labelledby="benchmarks-heading"
        >
          <div className="wrap">
            <div className="max-w-3xl mb-8">
              <h2
                id="benchmarks-heading"
                className="font-display text-3xl font-normal leading-[1.12] text-[#f3f1ea] sm:text-[2.75rem]"
              >
                Verified benchmarks and repositories.{" "}
                <span className="text-[#9498a1]">
                  Every metric reproduced by offline evaluation scripts in CI.
                </span>
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {PROJECTS.map((project, idx) => (
                <article
                  key={project.id}
                  className="card card--linked justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-mono-code whitespace-nowrap text-lg font-semibold text-[#f3f1ea]">
                        {project.name}
                      </h3>
                      <span className="font-mono-code whitespace-nowrap text-[13px] text-[#c9a66b]">
                        0{idx + 1} · {project.evalCountLabel}
                      </span>
                    </div>

                    <p className="mt-2.5 text-[15px] leading-relaxed text-[#f3f1ea]/85">
                      {project.tagline}
                    </p>

                    <ul className="rows mt-5">
                      {project.metrics.map((metric) => (
                        <li key={metric.label}>
                          <span className="text-[14px] text-[#9498a1]">{metric.label}</span>
                          <span className="font-mono-code text-[14px] font-medium text-[#7ab8d6]">
                            {metric.value}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {project.architectureNodes ? (
                      <div className="mt-5">
                        <div className="font-mono-code text-[12px] text-[#9498a1] mb-2">
                          Pipeline Stages
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {project.architectureNodes.map((node) => (
                            <span
                              key={node}
                              className="rounded-md border border-white/10 bg-[#090a0d] px-2.5 py-1 font-mono-code text-[12px] text-[#f3f1ea]/85"
                            >
                              {node}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {project.validationRules ? (
                      <div className="mt-5">
                        <div className="font-mono-code text-[12px] text-[#9498a1] mb-2">
                          Deterministic Validation Rules
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {project.validationRules.map((rule) => (
                            <span
                              key={rule}
                              className="rounded-md border border-white/10 bg-[#090a0d] px-2.5 py-1 font-mono-code text-[12px] text-[#7ab8d6]"
                            >
                              {rule}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.08]">
                    <div className="text-[13px] font-mono-code leading-relaxed text-[#9498a1]">
                      {project.stack.join(" · ")}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-5">
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-press inline-flex items-center gap-1.5 text-[15px] font-medium text-[#f3f1ea] hover:text-[#7ab8d6]"
                      >
                        <span>Inspect repository</span>
                        <ArrowUpRight className="h-4 w-4 text-[#c9a66b]" aria-hidden="true" />
                      </a>
                      {project.id === "helpdesk-agent" ? (
                        <Link
                          href="/sandboxes/rag"
                          className="btn-press inline-flex items-center gap-1.5 text-[15px] font-medium text-[#7ab8d6] hover:text-[#f3f1ea]"
                        >
                          <span>Launch live RAG sandbox</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : project.id === "docextract" ? (
                        <Link
                          href="/sandboxes/docextract"
                          className="btn-press inline-flex items-center gap-1.5 text-[15px] font-medium text-[#c9a66b] hover:text-[#f3f1ea]"
                        >
                          <span>Launch live validator sandbox</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#060709] py-16">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-12 items-start pb-12 border-b border-white/[0.08]">
            <div className="md:col-span-6">
              <div className="flex items-center gap-3">
                <span className="mark-ring" aria-hidden="true" />
                <span className="font-display text-4xl font-normal text-[#f3f1ea]">
                  {PROFILE.handle}
                </span>
              </div>
              <p className="mt-4 max-w-md text-base text-[#9498a1]">
                Applied AI engineering portfolio — grounded RAG agents and verified Document AI extraction pipelines.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-[15px]">
              <h3 className="font-mono-code text-[13px] text-[#c9a66b]">Repositories</h3>
              <ul className="space-y-2 text-[#9498a1]">
                <li>
                  <a
                    href="https://github.com/Exryz/helpdesk-agent"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#f3f1ea] transition-colors"
                  >
                    helpdesk-agent
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Exryz/docextract"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#f3f1ea] transition-colors"
                  >
                    docextract
                  </a>
                </li>
                <li>
                  <a
                    href={PROFILE.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#f3f1ea] transition-colors"
                  >
                    GitHub Profile
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-[15px]">
              <h3 className="font-mono-code text-[13px] text-[#c9a66b]">Sections</h3>
              <ul className="space-y-2 text-[#9498a1]">
                <li>
                  <a href="#hero-workbench" className="hover:text-[#f3f1ea] transition-colors">
                    Interactive Workbench
                  </a>
                </li>
                <li>
                  <a href="#projects" className="hover:text-[#f3f1ea] transition-colors">
                    Production Systems
                  </a>
                </li>
                <li>
                  <a href="#benchmarks" className="hover:text-[#f3f1ea] transition-colors">
                    Verified Benchmarks
                  </a>
                </li>
                <li>
                  <Link href="/sandboxes/rag" className="hover:text-[#f3f1ea] transition-colors">
                    RAG + MCP Sandbox
                  </Link>
                </li>
                <li>
                  <Link href="/sandboxes/docextract" className="hover:text-[#f3f1ea] transition-colors">
                    DocExtract Validator Sandbox
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#9498a1]">
            <span>{PROFILE.handle} · AI/ML Engineer</span>
            <span>Built with Next.js, TypeScript &amp; Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
