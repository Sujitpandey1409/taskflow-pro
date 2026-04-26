import { Github } from "lucide-react";

export default function CreatorFollowBadge() {
  return (
    <a
      href="https://github.com/Sujitpandey1409/"
      target="_blank"
      rel="noreferrer"
      aria-label="Follow Sujit Pandey on GitHub"
      className="follow-me-badge fixed right-3 top-20 z-[90] inline-flex items-center gap-2 overflow-hidden rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.32em] text-slate-700 sm:right-4 sm:top-4 sm:px-3 sm:text-xs lg:right-5"
    >
      <span className="follow-me-badge__line" aria-hidden="true" />
      <span className="follow-me-badge__text relative inline-flex items-center gap-1.5 whitespace-nowrap">
        <Github className="h-3.5 w-3.5" />
        <span>Follow me</span>
      </span>
    </a>
  );
}
