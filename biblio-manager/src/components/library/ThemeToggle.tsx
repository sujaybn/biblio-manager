import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Toggles the .dark class already defined in styles.css (a warm,
 * amber-and-ink "reading lamp" palette, not a generic gray dark mode).
 * Persists the choice; an inline script in RootShell applies it before
 * first paint so there's no flash on load. */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // ignore (private browsing etc.)
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to reading-lamp dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to reading-lamp dark mode"}
      className="shrink-0 rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}