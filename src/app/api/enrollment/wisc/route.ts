import { NextResponse } from 'next/server';
import { getCurrentTerm, getAvailableTerms } from '@/lib/termCodes';
import { EnrollmentDataSchema, EnrollmentSectionSchema, type EnrollmentSection, type Totals } from '@/lib/schemas/enrollment';

// Subject code mapping
const getSubjectCode = (classCode: string): string | null => {
  // Extract the subject part (e.g., "COMP SCI" from "COMP SCI 400")
  const subject = classCode.split(' ').slice(0, -1).join(' ');
  
  // Map of subject names to their codes
  const subjectCodes: { [key: string]: string } = {
    'A F AERO': '102',
    'AFRICAN': '104',
    'AFROAMER': '106',
    'A A E': '108',
    'BSE': '112',
    'LSC': '120',
    'AGROECOL': '130',
    'AGRONOMY': '132',
    'AMER IND': '140',
    'ANATOMY': '144',
    'ANAT&PHY': '146',
    'ANESTHES': '148',
    'ANTHRO': '156',
    'BIOMDSCI': '209',
    'ART': '168',
    'ART ED': '176',
    'ART HIST': '180',
    'ASIAN AM': '184',
    'ASIAN': '185',
    'ASIALANG': '186',
    'ASTRON': '188',
    'MICROBIO': '192',
    'RP & SE': '194',
    'BIOCHEM': '200',
    'BIOLOGY': '205',
    'BIOCORE': '206',
    'B M E': '207',
    'BOTANY': '208',
    'B M I': '210',
    'CRB': '217',
    'CBE': '220',
    'CHEM': '224',
    'CHICLA': '228',
    'DERM': '229',
    'HDFS': '230',
    'GEN BUS': '231',
    'ACCT I S': '232',
    'FINANCE': '233',
    'INFO SYS': '234',
    'INTL BUS': '235',
    'M H R': '236',
    'MARKETNG': '237',
    'OTM': '238',
    'REAL EST': '239',
    'CIV ENGR': '240',
    'R M I': '241',
    'ACT SCI': '242',
    'CLASSICS': '244',
    'CSCS': '247',
    'COM ARTS': '250',
    'CS&D': '252',
    'COMP LIT': '260',
    'COMP SCI': '266',
    'COUN PSY': '270',
    'CNSR SCI': '271',
    'CURRIC': '272',
    'DY SCI': '292',
    'ECON': '296',
    'ELPA': '305',
    'ED POL': '310',
    'ED PSYCH': '315',
    'E C E': '320',
    'EMER MED': '330',
    'E M A': '346',
    'E P': '347',
    'E P D': '348',
    'ESL': '351',
    'ENGL': '352',
    'ENTOM': '355',
    'DS': '359',
    'ENVIR ST': '360',
    'M&ENVTOX': '362',
    'FAM MED': '370',
    'FISC': '375',
    'FOLKLORE': '380',
    'FOOD SCI': '390',
    'F&W ECOL': '396',
    'FRENCH': '400',
    'GENETICS': '412',
    'GEOG': '416',
    'G L E': '418',
    'GEOSCI': '420',
    'GERMAN': '424',
    'GNS': '425',
    'GREEK': '428',
    'OBS&GYN': '436',
    'HEBR-BIB': '441',
    'HEBR-MOD': '442',
    'HISTORY': '448',
    'MED HIST': '452',
    'HIST SCI': '456',
    'HORT': '476',
    'H ONCOL': '480',
    'I SY E': '490',
    'INTER-AG': '494',
    'INTEGART': '495',
    'INTEREGR': '496',
    'INTER-HE': '498',
    'ILS': '500',
    'INTER-LS': '502',
    'INTEGSCI': '503',
    'INTL ST': '504',
    'ITALIAN': '508',
    'JEWISH': '510',
    'JOURN': '512',
    'LAND ARC': '520',
    'LATIN': '524',
    'LACIS': '525',
    'LAW': '528',
    'LEGAL ST': '535',
    'L I S': '544',
    'LINGUIS': '550',
    'LITTRANS': '551',
    'MATH': '600',
    'AN SCI': '604',
    'M E': '612',
    'MD GENET': '616',
    'M M & I': '620',
    'MED PHYS': '621',
    'MED SC-M': '622',
    'MED SC-V': '623',
    'MEDICINE': '632',
    'MEDIEVAL': '633',
    'M S & E': '636',
    'ATM OCN': '640',
    'MIL SCI': '644',
    'MOL BIOL': '650',
    'MUSIC': '660',
    'MUS PERF': '664',
    'NAV SCI': '672',
    'NEUROL': '676',
    'NEURSURG': '678',
    'NEURODPT': '681',
    'NTP': '682',
    'N E': '684',
    'CNP': '691',
    'NURSING': '692',
    'NUTR SCI': '694',
    'OCC THER': '695',
    'ONCOLOGY': '700',
    'OPHTHALM': '702',
    'PATH-BIO': '703',
    'PATH': '704',
    'PEDIAT': '708',
    'PHM SCI': '718',
    'PHMCOL-M': '724',
    'PHARMACY': '726',
    'PHM PRAC': '728',
    'S&A PHM': '732',
    'PHILOS': '736',
    'DANCE': '741',
    'KINES': '742',
    'PHY THER': '745',
    'PHY ASST': '750',
    'PHYSICS': '754',
    'BMOLCHEM': '758',
    'PLANTSCI': '760',
    'PHYSIOL': '762',
    'PL PATH': '766',
    'POLI SCI': '778',
    'PORTUG': '782',
    'POP HLTH': '810',
    'PSYCHIAT': '814',
    'PSYCH': '820',
    'PUB AFFR': '826',
    'PUBLHLTH': '828',
    'RADIOL': '832',
    'RHAB MED': '840',
    'RELIG ST': '856',
    'C&E SOC': '864',
    'SCAND ST': '872',
    'STS': '875',
    'SR MED': '882',
    'SLAVIC': '888',
    'SOC WORK': '896',
    'SOC': '900',
    'SOIL SCI': '908',
    'SPANISH': '912',
    'STAT': '932',
    'COMP BIO': '934',
    'SURGERY': '936',
    'SURG SCI': '938',
    'THEATRE': '942',
    'URB R PL': '944',
    'GEN&WS': '963',
    'ZOOLOGY': '970'
  };
  return subjectCodes[subject] || null;
};

// Helper function to format time from milliseconds
function formatTime(ms: number | null | "N/A"): string {
  if (ms === null || ms === "N/A") return "N/A";
  
  try {
    // Convert milliseconds to hours and minutes in Central Time
    const date = new Date(ms);
    // Adjust for Central Time (UTC-6 or UTC-5 depending on DST)
    const centralHours = date.getUTCHours() - 6; // Assuming CST (UTC-6)
    const adjustedHours = centralHours < 0 ? centralHours + 24 : centralHours;
    const minutes = date.getUTCMinutes();
    const ampm = adjustedHours >= 12 ? 'PM' : 'AM';
    const displayHours = adjustedHours % 12 || 12; // Convert 24h to 12h format
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error, 'Input:', ms);
    return 'TBA';
  }
}

// Helper function to format days
function formatDays(days: string | null | undefined): string {
  if (!days) return 'TBA';
  
  try {
    // Clean up the input string
    const cleanDays = days.replace(/[^MTWRFSU]/g, '');
    
    // Map of day codes to their display format
    const dayMap: { [key: string]: string } = {
      'M': 'M',
      'T': 'T',
      'W': 'W',
      'R': 'R',
      'F': 'F',
      'S': 'S',
      'U': 'U'
    };
    
    // Map each character and join
    return cleanDays.split('').map(day => dayMap[day] || day).join('');
  } catch (error) {
    console.error('Error formatting days:', error, 'Input:', days);
    return 'TBA';
  }
}

export async function GET(request: Request) {
  console.log('=== WISCONSIN ENROLLMENT ROUTE START ===');
  console.log('Request URL:', request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    const classCode = searchParams.get('class_code');
    const termParam = searchParams.get('term');
    
    // Log all search params for debugging
    console.log('=== REQUEST PARAMETERS ===');
    console.log('classCode:', classCode);
    console.log('termParam:', termParam);
    console.log('All params:', Object.fromEntries(searchParams.entries()));
    
    if (!classCode) {
      console.error('=== ERROR: Missing class_code parameter ===');
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 });
    }

    // If term is provided and valid, use it; otherwise use current term
    const term = termParam ? parseInt(termParam) : getCurrentTerm();
    
    // Log term validation
    console.log('=== TERM VALIDATION ===');
    console.log('Provided term:', termParam);
    console.log('Parsed term:', term);
    console.log('Current term:', getCurrentTerm());
    
    // Validate the term
    const availableTerms = getAvailableTerms();
    if (!availableTerms.some(t => t.value === term)) {
      console.error('=== ERROR: Invalid term ===');
      console.error('Term:', term);
      console.error('Available terms:', availableTerms);
      return NextResponse.json({ 
        error: 'Invalid term selected',
        availableTerms 
      }, { status: 400 });
    }

    const subjectCode = getSubjectCode(classCode);
    const courseNumber = classCode.split(' ').pop();
    
    // Log class code parsing
    console.log('=== CLASS CODE PARSING ===');
    console.log('Original class code:', classCode);
    console.log('Subject code:', subjectCode);
    console.log('Course number:', courseNumber);
    console.log('Split parts:', classCode.split(' '));
    
    if (!subjectCode || !courseNumber) {
      console.error('=== ERROR: Invalid class code format ===');
      console.error('Class code:', classCode);
      console.error('Subject code:', subjectCode);
      console.error('Course number:', courseNumber);
      return NextResponse.json({ 
        error: 'Invalid class code format',
        details: { subjectCode, courseNumber, classCode }
      }, { status: 400 });
    }

    // Construct search payload
    const searchPayload = {
      selectedTerm: term.toString(),
      queryString: classCode,
      filters: [{
        has_child: {
          type: "enrollmentPackage",
          query: {
            bool: {
              must: [
                { match: { "packageEnrollmentStatus.status": "OPEN WAITLISTED CLOSED" } },
                { match: { "published": true } }
              ]
            }
          }
        }
      }],
      page: 1,
      pageSize: 50,
      sortOrder: "SCORE"
    };

    const searchResponse = await fetch('https://public.enroll.wisc.edu/api/search/v1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(searchPayload)
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Search failed:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        body: errorText
      });
      return NextResponse.json({ 
        error: 'Failed to search for course',
        details: {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          errorText
        }
      }, { status: searchResponse.status });
    }

    // Parse the search results
    const searchData = await searchResponse.json();
    
    // Validate that we have search results
    if (!searchData.hits || searchData.hits.length === 0) {
      return NextResponse.json({
        error: 'No courses found matching the search criteria',
        details: { classCode, subjectCode, courseNumber }
      }, { status: 404 });
    }

    // Get all search results as an array
    const searchResults = searchData.hits;
    
    // Log the number of results for debugging
    console.log(`Found ${searchResults.length} course results for "${classCode}"`);
    
    // Extract subject and course number for exact matching
    const subjectName = classCode.split(' ').slice(0, -1).join(' ');
    const exactCourseNumber = classCode.split(' ').pop();
    
    // First try to find an exact match for both subject and course number
    const exactMatch = searchResults.find((c: {
      subject?: {
        subjectCode?: string;
        shortDescription?: string;
      };
      courseNumber?: string;
      catalogNumber?: string;
      courseId?: string;
      uuid?: string;
    }) => {
      // Check for existence of required properties
      if (!c.subject || !c.subject.shortDescription) return false;
      
      // Primary check: match subject shortDescription and catalogNumber
      if (c.catalogNumber && c.subject.shortDescription) {
        const matchesSubject = c.subject.shortDescription.toUpperCase() === subjectName.toUpperCase();
        const matchesCatalog = c.catalogNumber === courseNumber;
        if (matchesSubject && matchesCatalog) return true;
      }
      
      // Secondary check: match subject shortDescription and courseNumber
      if (c.courseNumber && c.subject.shortDescription) {
        const matchesSubject = c.subject.shortDescription.toUpperCase() === subjectName.toUpperCase();
        const matchesCourseNumber = c.courseNumber === exactCourseNumber;
        if (matchesSubject && matchesCourseNumber) return true;
      }
      
      return false;
    });
    
    // If we found an exact match, use it
    let course;
    if (exactMatch) {
      console.log(`Found exact match for "${classCode}": ${exactMatch.subject?.shortDescription} ${exactMatch.catalogNumber || exactMatch.courseNumber}`);
      course = exactMatch;
    } else {
      // Try to find a match based on subject code and catalog number
      const codeMatch = searchResults.find((c: {
        subject?: {
          subjectCode?: string;
          shortDescription?: string;
        };
        courseNumber?: string;
        catalogNumber?: string;
        courseId?: string;
        uuid?: string;
      }) => {
        if (!c.subject || !c.subject.subjectCode) return false;
        
        // Match based on subject code and catalog number
        if (c.catalogNumber) {
          return c.subject.subjectCode === subjectCode && c.catalogNumber === courseNumber;
        }
        
        // Fallback to courseNumber if catalogNumber doesn't exist
        return c.subject.subjectCode === subjectCode && c.courseNumber === courseNumber;
      });
      
      if (codeMatch) {
        console.log(`Found code match for "${classCode}": ${codeMatch.subject?.subjectCode} ${codeMatch.catalogNumber || codeMatch.courseNumber}`);
        course = codeMatch;
      } else {
        // If no exact match, log all potential matches for debugging
        console.log('Potential matches:');
        searchResults.slice(0, 5).forEach((c: {
          subject?: {
            subjectCode?: string;
            shortDescription?: string;
          };
          courseNumber?: string;
          catalogNumber?: string;
        }, index: number) => {
          console.log(`[${index}] ${c.subject?.shortDescription || 'N/A'} ${c.courseNumber || 'N/A'} (${c.subject?.subjectCode || 'N/A'} ${c.catalogNumber || 'N/A'})`);
        });
        
        // Return error instead of using first result
        return NextResponse.json({
          error: 'No exact match found for the requested course',
          details: {
            searchTerm: classCode,
            expectedSubject: subjectName,
            expectedCatalog: courseNumber,
            resultsFound: searchResults.length
          }
        }, { status: 404 });
      }
    }

    // Make sure we have a course before proceeding
    if (!course || !course.courseId || !course.subject) {
      return NextResponse.json({
        error: 'Could not find a matching course',
        details: {
          searchTerm: classCode,
          expectedSubject: subjectCode,
          expectedCatalog: courseNumber
        }
      }, { status: 404 });
    }

    // Get the enrollment data using the course ID
    const enrollmentUrl = `https://public.enroll.wisc.edu/api/search/v1/enrollmentPackages/${term}/${subjectCode}/${course.courseId}`;
    
    const enrollmentResponse = await fetch(enrollmentUrl);

    if (!enrollmentResponse.ok) {
      console.error('Enrollment fetch failed:', await enrollmentResponse.text());
      return NextResponse.json({ 
        error: 'Failed to fetch enrollment data',
        details: {
          status: enrollmentResponse.status,
          statusText: enrollmentResponse.statusText,
          url: enrollmentUrl,
          subjectCode: subjectCode,
          courseUuid: course.uuid
        }
      }, { status: enrollmentResponse.status });
    }

    const enrollmentData = await enrollmentResponse.json();

    // Process the enrollment data
    const processedData = enrollmentData.map((section: {
      sections: Array<{
        type?: string;
        sectionNumber?: string;
        classNumber?: string;
        instructor?: {
          name?: {
            first?: string;
            last?: string;
          }
        };
        classMeetings?: Array<{
          meetingOrExamNumber?: string;
          meetingType?: string;
          meetingTimeStart?: number | null;
          meetingTimeEnd?: number | null;
          meetingDays?: string | null;
          meetingDaysList?: string[];
          room?: string;
          building?: {
            buildingName?: string;
          }
        }>;
        enrollmentStatus?: {
          currentlyEnrolled?: number | null;
          capacity?: number | null;
          waitlistCurrentSize?: number | null;
        }
      }>
    }) => {
      // Find all CLASS meetings (not EXAM)
      const classMeetings = section.sections[0]?.classMeetings?.filter(m => m.meetingType === 'CLASS') || [];
      
      // Log raw section data for debugging
      console.log('Raw section data:', {
        sectionNumber: section.sections[0]?.sectionNumber,
        classNumber: section.sections[0]?.classNumber,
        allMeetings: section.sections[0]?.classMeetings,
        classMeetings: classMeetings.map(m => ({
          meetingType: m.meetingType,
          meetingDays: m.meetingDays,
          meetingDaysList: m.meetingDaysList,
          meetingTimeStart: m.meetingTimeStart,
          meetingTimeEnd: m.meetingTimeEnd,
          formattedDays: formatDays(m.meetingDays?.replace(/,/g, '').trim()),
          formattedTime: m.meetingTimeStart !== undefined && m.meetingTimeEnd !== undefined
            ? `${formatTime(m.meetingTimeStart)}-${formatTime(m.meetingTimeEnd)}`
            : 'TBA'
        })),
        room: classMeetings[0]?.room,
        building: classMeetings[0]?.building
      });

      const isOnline = 
        (classMeetings[0]?.meetingType === 'ONLINE') ||
        (classMeetings[0]?.building?.buildingName?.toUpperCase().includes('ONLINE') || false);
      
      // Debug enrollment status
      console.log("Section enrollment status:", {
        sectionNumber: section.sections[0]?.sectionNumber,
        classNumber: section.sections[0]?.classNumber,
        enrollmentStatus: section.sections[0]?.enrollmentStatus,
        currentlyEnrolled: section.sections[0]?.enrollmentStatus?.currentlyEnrolled,
        capacity: section.sections[0]?.enrollmentStatus?.capacity
      });
      
      const processedSection = {
        classNumber: section.sections[0]?.classNumber?.toString() || 'N/A',
        sectionNumber: section.sections[0]?.sectionNumber || 'N/A',
        instructor: section.sections[0]?.instructor?.name 
          ? {
              name: `${section.sections[0]?.instructor?.name?.first || ''} ${section.sections[0]?.instructor?.name?.last || ''}`.trim(),
              link: undefined
            }
          : undefined,
        timeTable: classMeetings.map(meeting => {
          // Clean up the raw data
          const cleanDays = meeting.meetingDays?.replace(/,/g, '').trim();
          
          return {
            days_times: cleanDays && meeting.meetingTimeStart !== undefined && meeting.meetingTimeEnd !== undefined
              ? `${formatDays(cleanDays)} ${formatTime(meeting.meetingTimeStart)}-${formatTime(meeting.meetingTimeEnd)}`
              : 'TBA',
            location: isOnline 
              ? 'ONLINE'
              : meeting.building?.buildingName && meeting.room
                ? `${meeting.building.buildingName} ${meeting.room}`
                : undefined
          };
        }),
        prerequisiteNote: undefined,
        currentlyEnrolled: section.sections[0]?.enrollmentStatus?.currentlyEnrolled !== undefined && 
                          section.sections[0]?.enrollmentStatus?.currentlyEnrolled !== null ? 
                          Number(section.sections[0]?.enrollmentStatus?.currentlyEnrolled) : 0,
        enrollmentCap: section.sections[0]?.enrollmentStatus?.capacity || 0,
        waitlistCurrentSize: section.sections[0]?.enrollmentStatus?.waitlistCurrentSize || 0
      };

      // Validate the processed section against the schema
      const validatedSection = EnrollmentSectionSchema.parse(processedSection);
      return validatedSection;
    });

    // Deduplicate sections based on type and section number
    const uniqueSections = processedData.reduce((acc: EnrollmentSection[], section: EnrollmentSection) => {
      // Create a unique key based on both section number and class number
      const key = `${section.sectionNumber}-${section.classNumber}`;
      const exists = acc.some((s: EnrollmentSection) => 
        `${s.sectionNumber}-${s.classNumber}` === key
      );
      if (!exists) {
        acc.push(section);
      }
      return acc;
    }, []);

    console.log(`Deduplicated sections: ${uniqueSections.length} (from ${processedData.length})`);
    console.log("Unique sections:", uniqueSections.map((s: EnrollmentSection) => ({
      sectionNumber: s.sectionNumber,
      classNumber: s.classNumber,
      timeTable: s.timeTable
    })));

    // Calculate totals from unique sections
    const totals: Totals = uniqueSections.reduce((acc: Totals, section: EnrollmentSection) => ({
      currentlyEnrolled: acc.currentlyEnrolled + section.currentlyEnrolled,
      enrollmentCap: acc.enrollmentCap + section.enrollmentCap,
      waitlistCurrentSize: acc.waitlistCurrentSize + (section.waitlistCurrentSize || 0)
    }), { currentlyEnrolled: 0, enrollmentCap: 0, waitlistCurrentSize: 0 });

    console.log("Final totals:", totals);
    
    // Create the final response object
    const response = {
      sections: uniqueSections,
      totals,
      currentTerm: term,
      availableTerms: getAvailableTerms()
    };

    // Validate the response against our schema
    const validatedResponse = EnrollmentDataSchema.parse(response);

    console.log("API response currentlyEnrolled values:", 
      validatedResponse.sections.map((s) => `Section ${s.sectionNumber}: ${s.currentlyEnrolled}/${s.enrollmentCap}`)
    );

    // Log final response
    console.log('Final API response:', {
      sections: validatedResponse.sections,
      totals: validatedResponse.totals
    });

    return NextResponse.json(validatedResponse);

  } catch (error) {
    console.error('Error fetching enrollment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment data' },
      { status: 500 }
    );
  }
} 