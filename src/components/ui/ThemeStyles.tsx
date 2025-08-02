"use client";

import { useTheme } from "@/contexts/theme/ThemeContext";
import { useEffect } from "react";

// This component injects CSS variables into the document root
// to make theme colors available throughout the application
export function ThemeStyles() {
  const { colors, school } = useTheme();

  useEffect(() => {
    // Set CSS variables on document root
    document.documentElement.style.setProperty("--color-primary", colors.primary);
    document.documentElement.style.setProperty("--color-primary-hover", colors.primaryHover);
    document.documentElement.style.setProperty("--color-primary-light", colors.primaryLight);
    document.documentElement.style.setProperty("--color-primary-border", colors.primaryBorder);
    document.documentElement.style.setProperty("--color-primary-text", colors.primaryText);
    
    // Set school-specific attributes
    document.documentElement.setAttribute("data-school", school.shortName.toLowerCase());
    
    // Update page title to include school name
    document.title = `Campusfy - ${school.shortName}`;
  }, [colors, school]);

  // This component doesn't render anything visible
  return null;
}

// For development/testing purposes
export function ThemeSwitcher() {
  const { setSchool, school } = useTheme();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-3 rounded-xl shadow-md z-50 border border-gray-200">
      <div className="text-sm font-bold mb-2">School Switcher (Dev Only)</div>
      <div className="text-xs text-gray-500 mb-2">Current: {school.name}</div>
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setSchool("wisco")} 
          className={`px-2 py-1 text-white rounded-md text-xs ${school.shortName.toLowerCase() === "wisco" ? "ring-2 ring-black" : ""}`}
          style={{ backgroundColor: "#C5050C" }}
        >
          Wisconsin
        </button>
        <button 
          onClick={() => setSchool("utah")} 
          className={`px-2 py-1 text-white rounded-md text-xs ${school.shortName.toLowerCase() === "utah" ? "ring-2 ring-black" : ""}`}
          style={{ backgroundColor: "#BE0000" }}
        >
          Utah
        </button>
        <button 
          onClick={() => setSchool("michigan")} 
          className={`px-2 py-1 text-white rounded-md text-xs ${school.shortName.toLowerCase() === "michigan" ? "ring-2 ring-black" : ""}`}
          style={{ backgroundColor: "#00274C" }}
        >
          Michigan
        </button>
        <button 
          onClick={() => setSchool("osu")} 
          className={`px-2 py-1 text-white rounded-md text-xs ${school.shortName.toLowerCase() === "osu" ? "ring-2 ring-black" : ""}`}
          style={{ backgroundColor: "#BB0000" }}
        >
          OSU
        </button>
      </div>
    </div>
  );
} 