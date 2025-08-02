"use client";

import { useState, useEffect } from "react";
import { SchoolConfig, getSchoolFromHostname } from "@/config/themes";
import { ClassData } from "@/types/classes/classTypes";
import { processClassAttributes } from "../utils/attributeProcessor";
import BadgeRenderer from "./BadgeRenderer";

type ClassAttributeBadgesProps = {
  classData: ClassData;
};

const ClassAttributeBadges = ({ classData }: ClassAttributeBadgesProps) => {
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    setSchoolConfig(school);
    setIsLoading(false);
  }, []);

  if (!schoolConfig || !classData) {
    if (isLoading) {
      return (
        <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-3xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={`skeleton-${i}`} 
              className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"
            />
          ))}
        </div>
      );
    }
    return null;
  }

  const attributes = processClassAttributes(classData, schoolConfig);
  
  return (
    <div className="relative mb-4">
      <BadgeRenderer attributes={attributes} />
    </div>
  );
};

export default ClassAttributeBadges; 