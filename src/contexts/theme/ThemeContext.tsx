"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeColors, SchoolConfig, schoolConfigs, getSchoolFromHostname } from "@/config/themes";

// Create theme context
type ThemeContextType = {
  colors: ThemeColors;
  school: SchoolConfig;
  setSchool: (schoolKey: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  colors: schoolConfigs.wisco.colors,
  school: schoolConfigs.wisco,
  setSchool: () => {},
});

// Theme provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [school, setSchoolState] = useState<SchoolConfig>(schoolConfigs.wisco);

  // Set theme based on hostname on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const detectedSchool = getSchoolFromHostname(hostname);
      setSchoolState(detectedSchool);
      
      // For development environment, check for theme in localStorage
      if (process.env.NODE_ENV === "development") {
        const storedSchool = localStorage.getItem("campusfy-school");
        if (storedSchool && schoolConfigs[storedSchool]) {
          setSchoolState(schoolConfigs[storedSchool]);
        }
      }
    }
  }, []);

  // Function to manually set school (useful for testing)
  const setSchool = (schoolKey: string) => {
    if (schoolConfigs[schoolKey]) {
      setSchoolState(schoolConfigs[schoolKey]);
      
      // Store school in localStorage for development environment
      if (process.env.NODE_ENV === "development") {
        localStorage.setItem("campusfy-school", schoolKey);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ colors: school.colors, school, setSchool }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme() {
  return useContext(ThemeContext);
} 