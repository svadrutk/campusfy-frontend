export interface TermOption {
  value: number;
  label: string;
}

// Helper function to get term label from term code
export function getTermLabel(termCode: number): string {
  const year = 2000 + Math.floor((termCode - 1000) / 10);
  const suffix = termCode % 10;
  
  let term: string;
  switch (suffix) {
    case 2:
      term = 'Fall';
      break;
    case 4:
      term = 'Spring';
      break;
    case 6:
      term = 'Summer';
      break;
    default:
      term = 'Unknown';
  }
  return `${term} ${year}`;
}

// Helper function to get current term code
export function getCurrentTerm(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-based
  
  // Calculate the base term code for the year
  // For 2024: base is 1240
  const base = 1240 + ((year - 2024) * 10);
  
  // Determine which term based on the month
  // Spring registration starts in November for next year
  // Fall registration starts in April
  // Summer registration starts in March
  if (month >= 11) {
    // November-December: Show next year's Spring term
    return base + 14; // Next year's spring
  } else if (month >= 4) {
    // April-October: Show Fall term
    return base + 12; // Current year's fall
  } else if (month >= 3) {
    // March: Show Summer term
    return base + 6; // Current year's summer
  } else {
    // January-February: Show Spring term
    return base + 4; // Current year's spring
  }
}

// Generate available terms based on current date
export function getAvailableTerms(): { value: number; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const terms: { value: number; label: string }[] = [];
  
  // Calculate base for current and next year
  const baseCurrentYear = 1240 + ((year - 2024) * 10);
  const baseNextYear = baseCurrentYear + 10;
  
  // Add terms based on the current month
  if (month >= 11) {  // November onwards
    // Show Spring of next year
    terms.push({
      value: baseNextYear + 4,
      label: `Spring ${year + 1}`
    });
  } else if (month >= 4) {  // April through October
    // Show Fall of current year
    terms.push({
      value: baseCurrentYear + 12,
      label: `Fall ${year}`
    });
    // Show Spring of next year
    terms.push({
      value: baseNextYear + 4,
      label: `Spring ${year + 1}`
    });
  } else if (month >= 3) {  // March
    // Show Summer of current year
    terms.push({
      value: baseCurrentYear + 6,
      label: `Summer ${year}`
    });
    // Show Fall of current year
    terms.push({
      value: baseCurrentYear + 12,
      label: `Fall ${year}`
    });
  } else {  // January and February
    // Show Spring of current year
    terms.push({
      value: baseCurrentYear + 4,
      label: `Spring ${year}`
    });
    // Show Summer of current year
    terms.push({
      value: baseCurrentYear + 6,
      label: `Summer ${year}`
    });
  }
  
  return terms;
} 