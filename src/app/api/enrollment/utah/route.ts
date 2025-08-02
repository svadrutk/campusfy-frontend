import { NextResponse } from 'next/server';
import { getCurrentTerm, getAvailableTerms } from '@/lib/termCodes';
import { EnrollmentDataSchema, EnrollmentSectionSchema } from '@/lib/schemas/enrollment';
import * as cheerio from 'cheerio';
import type { z } from 'zod';

// Define the section type based on our schema
type Section = z.infer<typeof EnrollmentSectionSchema>;

// Helper function to get Utah's term code
function getUtahTermCode(term: string | number): string {
  // Utah uses a different term code format
  // For example, 1262 (Fall 2025) should be "1258" in Utah's system
  // We need to subtract 4 from our term code
  return (parseInt(term.toString()) - 4).toString();
}

// Helper function to format days
function formatDays(daysText: string): string {
  console.log('=== FORMAT DAYS DEBUG ===');
  console.log('Raw days text:', daysText);
  
  // Map raw patterns directly to their proper format
  const dayMap: Record<string, string> = {
    'MoWeFr': 'MWF',
    'MoWe': 'MW',
    'TuTh': 'TR',
    'Mo': 'M',
    'Tu': 'T',
    'We': 'W',
    'Th': 'R',
    'Fr': 'F'
  };

  const result = dayMap[daysText] || daysText;
  console.log('Final formatted days:', result);
  return result;
}

// Helper function to extract building from URL
function extractBuilding(url?: string): string {
  if (!url) return 'TBA';
  
  const buildingMap: Record<string, string> = {
    'SFEBB': 'Spencer Fox Eccles Business Building',
    'CRCC': 'Carolyn and Kem Gardner Commons',
    'WEB': 'Warnock Engineering Building',
    'MEB': 'Merrill Engineering Building',
    'GC': 'Gardner Commons',
    'FASB': 'Frederick Albert Sutton Building',
    'JFB': 'James Fletcher Building',
    'JTB': 'John T. Browning Building',
    'LCB': 'LeRoy Cowles Building',
    'HEB': 'Henry Eyring Building',
    'CSC': 'Crocker Science Center',
    'OSH': 'Orson Spencer Hall',
    'BU': 'Business Classroom Building',
    'BEHS': 'Behavioral Sciences Building',
    'BEH S': 'Behavioral Sciences Building',
    'HPR': 'Health, Physical Education, and Recreation Building',
    'HPR N': 'HPER North Building',
    'HPR E': 'HPER East Building',
    'LNCO': 'Languages and Communication Building',
    'ASB': 'Aline Wilmot Skaggs Biology Building',
    'SW': 'Social Work Building',
    'ST': 'Student Services Building',
    'SAEC': 'Sutton Engineering and Computing Building',
    'WBB': 'William Browning Building'
  };

  try {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    return code ? (buildingMap[code] || code) : 'TBA';
  } catch {
    return 'TBA';
  }
}

// Helper function to format time
function formatTime(timeText: string): string {
  // Remove any extra characters and keep only the time part
  const timeParts = timeText.split(',').filter(part => part.match(/[0-9:APM]/));
  const timeStr = timeParts.join('');
  
  // Convert to proper format
  const match = timeStr.match(/(\d{1,2}):?(\d{2})(A|P)M?/);
  if (!match) return timeText;
  
  const [_, hours, minutes, ampm] = match;
  // Ensure minutes is two digits
  const paddedMinutes = minutes.padStart(2, '0');
  return `${hours}:${paddedMinutes} ${ampm}M`;
}

// Helper function to format days and times
function formatDaysAndTimes(daysTimesStr: string): string {
  console.log('=== FORMAT DAYS AND TIMES DEBUG ===');
  console.log('Raw days and times string:', daysTimesStr);

  if (daysTimesStr.toLowerCase() === 'to be arranged') {
    return 'TBA';
  }

  const [daysStr, timesStr] = daysTimesStr.split('/');
  console.log('Split result - Days:', daysStr, 'Times:', timesStr);
  if (!daysStr || !timesStr) return daysTimesStr;

  // Split times into start and end
  const [startTime, endTime] = timesStr.split('-').map(t => formatTime(t.trim()));
  const days = formatDays(daysStr.trim());
  
  const result = `${days} ${startTime}-${endTime}`;
  console.log('Final formatted result:', result);
  return result;
}

// Helper function to format instructor name
function formatInstructorName(name: string): string {
  if (!name) return 'TBA';
  
  // Remove duplicates by splitting on the comma and taking first part
  const parts = name.split(',');
  if (parts.length < 2) return name.trim();
  
  // Get last name and first name parts
  const lastName = parts[0].trim();
  const firstPart = parts[1].trim();
  
  // Remove any duplicates in the first name part
  const firstNameParts = firstPart.split(lastName).filter(Boolean);
  const firstName = firstNameParts[0]?.trim() || '';
  
  return `${firstName} ${lastName}`;
}

export async function GET(request: Request) {
  try {
    console.log('=== UTAH ENROLLMENT ROUTE START ===');
    console.log('Request URL:', request.url);
    
    const { searchParams } = new URL(request.url);
    const classCode = searchParams.get('class_code');
    const term = searchParams.get('term') || getCurrentTerm();

    console.log('=== REQUEST PARAMETERS ===');
    console.log('classCode:', classCode);
    console.log('term:', term);
    console.log('All params:', Object.fromEntries(searchParams.entries()));

    if (!classCode) {
      console.error('=== ERROR: Missing class_code parameter ===');
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 });
    }

    // Parse class code (e.g., "CS 1000" or "COMP SCI 400" or "CS1000")
    console.log('=== PARSING CLASS CODE ===');
    console.log('Raw class code:', classCode);
    
    // First try splitting by spaces
    let parts = classCode.trim().split(/\s+/);
    
    // If we only got one part, try to split it into department and number
    if (parts.length === 1) {
      // Find where the numbers start
      const numberMatch = parts[0].match(/\d+/);
      if (numberMatch) {
        const numberIndex = numberMatch.index;
        if (numberIndex !== undefined) {
          const dept = parts[0].substring(0, numberIndex);
          const courseNumber = parts[0].substring(numberIndex);
          parts = [dept, courseNumber];
        }
      }
    }
    
    console.log('Split parts:', parts);
    
    let dept: string;
    let courseNumber: string;

    if (parts.length === 2) {
      // Format: "CS 1000" or "CS1000"
      [dept, courseNumber] = parts;
      console.log('Two-part format:', { dept, courseNumber });
    } else if (parts.length === 3) {
      // Format: "COMP SCI 400"
      dept = `${parts[0]} ${parts[1]}`;
      courseNumber = parts[2];
      console.log('Three-part format:', { dept, courseNumber });
    } else {
      console.error('=== ERROR: Invalid class code format ===');
      console.error('classCode:', classCode);
      console.error('parts:', parts);
      console.error('parts length:', parts.length);
      return NextResponse.json({ 
        error: 'Invalid class code format. Expected format: "DEPT NUMBER" or "DEPT NAME NUMBER" (e.g., "CS 1000" or "COMP SCI 400" or "CS1000")'
      }, { status: 400 });
    }

    if (!dept || !courseNumber) {
      console.error('=== ERROR: Invalid class code format ===');
      console.error('classCode:', classCode);
      console.error('dept:', dept);
      console.error('courseNumber:', courseNumber);
      return NextResponse.json({ 
        error: 'Invalid class code format. Expected format: "DEPT NUMBER" or "DEPT NAME NUMBER" (e.g., "CS 1000" or "COMP SCI 400")'
      }, { status: 400 });
    }

    // Convert term code to Utah's format
    const utahTerm = getUtahTermCode(term);
    console.log('=== TERM AND DEPARTMENT ===');
    console.log('Term conversion:', { original: term, utah: utahTerm });
    console.log('Department:', { raw: dept, encoded: encodeURIComponent(dept) });
    console.log('Course number:', courseNumber);

    // URL encode the department
    const encodedDept = encodeURIComponent(dept);

    // Step 1: Get sections from the sections page
    const sectionsUrl = `https://class-schedule.app.utah.edu/main/${utahTerm}/sections.html?subj=${encodedDept}&catno=${courseNumber}`;
    console.log('Fetching sections from:', sectionsUrl);
    
    const sectionsRes = await fetch(sectionsUrl);
    if (!sectionsRes.ok) {
      console.error('Failed to fetch sections:', sectionsRes.status, sectionsRes.statusText);
      return NextResponse.json({ error: 'Failed to fetch sections' }, { status: sectionsRes.status });
    }

    const sectionsHtml = await sectionsRes.text();
    console.log('Sections HTML length:', sectionsHtml.length);
    
    const $sections = cheerio.load(sectionsHtml);
    const table = $sections('table.table');
    
    if (!table.length) {
      console.error('No table found in sections page');
      return NextResponse.json({ error: 'No sections found' }, { status: 404 });
    }

    // Build a mapping of class number to section row data
    const classSections: Array<{
      class_number: string;
      section_number: string;
      enrollment_cap: string;
      waitlist: string;
      current_enrolled: string;
    }> = [];

    table.find('tbody tr').each((_, row) => {
      const cols = $sections(row).find('td');
      if (cols.length >= 8) {
        classSections.push({
          class_number: $sections(cols[0]).text().trim(),
          section_number: $sections(cols[3]).text().trim(),
          enrollment_cap: $sections(cols[5]).text().trim(),
          waitlist: $sections(cols[6]).text().trim(),
          current_enrolled: $sections(cols[7]).text().trim()
        });
      }
    });

    console.log('Found sections:', classSections.length);

    // Step 2: Load full class listing
    const classListUrl = `https://class-schedule.app.utah.edu/main/${utahTerm}/class_list.html?subject=${encodedDept}`;
    console.log('Fetching class list from:', classListUrl);
    
    const classListRes = await fetch(classListUrl);
    if (!classListRes.ok) {
      console.error('Failed to fetch class list:', classListRes.status, classListRes.statusText);
      return NextResponse.json({ error: 'Failed to fetch class list' }, { status: classListRes.status });
    }

    const classListHtml = await classListRes.text();
    console.log('Class list HTML length:', classListHtml.length);
    
    const $classList = cheerio.load(classListHtml);
    const results: Section[] = [];

    // Process each section we found
    for (const classInfo of classSections) {
      const classNum = classInfo.class_number;
      const section = $classList(`div.class-info#${classNum}`);
      
      if (!section.length) {
        console.log('No class info found for:', classNum);
        continue;
      }

      // Get instructor info
      const instructorTag = section.find('li:has(a[href*="faculty.utah.edu"]) a');
      const instructor = instructorTag.length ? {
        name: formatInstructorName(instructorTag.text().trim()),
        link: instructorTag.attr('href') || undefined
      } : undefined;

      // Get prerequisite note
      const prereqSpan = section.find('span').filter((_, el) => 
        $classList(el).text().toLowerCase().includes('reserved for')
      );
      const prerequisiteNote = prereqSpan.length ? prereqSpan.text().trim() : undefined;

      // Get time table entries
      const timeTableEntries: Array<{ days_times: string; location?: string }> = [];
      const footer = section.find('div.card-footer');
      
      if (footer.length) {
        const timeTable = footer.find('table.time-table');
        const arrangedSpan = footer.find('span').filter((_, el) => 
          $classList(el).text().toLowerCase().includes('to be arranged')
        );

        if (timeTable.length) {
          timeTable.find('tr').each((_, row) => {
            const days = $classList(row).find('span[data-day]');
            const times = $classList(row).find('span[data-time]');
            const locationLink = $classList(row).find('a[href]');
            
            if (days.length && times.length) {
              timeTableEntries.push({
                days_times: formatDaysAndTimes(`${days.text()}/${times.text()}`),
                location: extractBuilding(locationLink.attr('href'))
              });
            }
          });
        }
        
        // Handle arranged classes
        if (arrangedSpan.length) {
          timeTableEntries.push({
            days_times: 'TBA',
            location: 'TBA'
          });
        }

        // If no time table entries were found, add a TBA entry
        if (timeTableEntries.length === 0) {
          timeTableEntries.push({
            days_times: 'TBA',
            location: 'TBA'
          });
        }
      }

      // Create the section object
      const sectionObj: Section = {
        classNumber: classNum,
        sectionNumber: classInfo.section_number,
        instructor,
        timeTable: timeTableEntries,
        prerequisiteNote,
        enrollmentCap: parseInt(classInfo.enrollment_cap) || 0,
        currentlyEnrolled: parseInt(classInfo.current_enrolled) || 0,
        waitlistCurrentSize: parseInt(classInfo.waitlist) || 0
      };

      results.push(sectionObj);
    }

    // Calculate totals
    const totals = results.reduce((acc, section) => ({
      currentlyEnrolled: acc.currentlyEnrolled + section.currentlyEnrolled,
      enrollmentCap: acc.enrollmentCap + section.enrollmentCap,
      waitlistCurrentSize: acc.waitlistCurrentSize + section.waitlistCurrentSize
    }), { currentlyEnrolled: 0, enrollmentCap: 0, waitlistCurrentSize: 0 });

    // Create the final response object
    const response = {
      sections: results,
      totals,
      term,
      currentTerm: getCurrentTerm(),
      availableTerms: getAvailableTerms()
    };

    // Validate the response against our schema
    const validatedResponse = EnrollmentDataSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
