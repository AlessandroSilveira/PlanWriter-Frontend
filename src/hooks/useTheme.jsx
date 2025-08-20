import { useEffect, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function useTheme(ThemeContext) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "sepia";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-sepia", "theme-dark");
    root.classList.add(`theme-${theme}`);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "sepia" ? "dark" : "sepia"));
  };

  return { theme, toggle };
}
