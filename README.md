# Campusfy Frontend

A modern web application for browsing and searching university courses.

## Overview

Campusfy is a web application designed to enhance the campus experience for students and faculty. This repository contains the frontend codebase for the Campusfy platform, providing tools for course discovery, reviews, and academic planning.

## Features

- **Course Search**: Advanced search functionality with filters for departments, course levels, credits, and more
- **Course Details**: Comprehensive view of course information, including descriptions, requisites, GPA distribution, and reviews
- **User Authentication**: Secure login and registration system integrated with Supabase
- **Responsive Design**: Optimized for all device sizes with mobile-specific layouts
- **Real-time Updates**: Dynamic data fetching for up-to-date course information
- **Modern UI**: Clean, intuitive interface with consistent branding

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Authentication**: NextAuth.js 5 with Supabase adapter
- **State Management**: Zustand, React Query
- **Styling**: Tailwind CSS 4, Framer Motion
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide Icons, Heroicons
- **Database**: Supabase (PostgreSQL)
- **Search**: Fuse.js for client-side search
- **Analytics**: Vercel Analytics
- **Development**: TypeScript, ESLint

## Branding

Campusfy uses a specific color palette to maintain consistent branding across the platform.

### Overall Campusfy Branding
- Primary Light: `#F5F5F5`
- Secondary Light Blue: `#B2CBF2`
- Primary Dark Blue: `#000053`
- Accent Teal: `#44C6AC`
- Primary Red: `#C5050C`

### School-Specific Branding
The platform supports school-specific theming with the following color options:
- Red: `#C5050C`
- Orange: `#E74A27`
- Yellow: `#FFCD00`
- Green: `#18453B`

All school-specific themes use `#FFFFFF` for white and `#E3E3E3` for light gray backgrounds.

## Project Structure

```
campusfy-frontend/
├── src/
│   ├── app/                # Next.js app directory (pages and routes)
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── class/          # Course detail pages
│   │   └── search/         # Search pages
│   ├── components/         # React components
│   │   ├── common/         # Shared UI elements
│   │   ├── features/       # Feature-specific components
│   │   ├── layout/         # Layout components (headers, navbars)
│   │   └── ui/             # Base UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── auth.ts             # NextAuth configuration
│   └── middleware.ts       # Next.js middleware
├── public/                 # Static assets
├── supabase/               # Supabase configuration
└── tailwind.config.js      # Tailwind CSS configuration
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/campusfy-frontend.git
cd campusfy-frontend
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local` with your configuration values.

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## API Documentation

### Classes API

The application uses a single, unified API endpoint for both browsing and searching classes with filters.

#### GET `/api/classes`

Used for browsing all classes or fetching a specific class.

**Query Parameters:**
- `class_code` (optional): Fetch a specific class by its code
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Example:**
```
GET /api/classes?page=1&limit=20
GET /api/classes?class_code=CS%20101
```

#### POST `/api/classes`

Used for searching classes with filters.

**Request Body:**
```json
{
  "searchQuery": "computer science",
  "page": 1,
  "course_breadth": ["Physical Science", "Biological Science"],
  "gen_ed": [1, 3],
  "ethnic": true,
  "course_level": [1, 2],
  "credits_min": 3,
  "credits_max": 5,
  "honors": [1, 2],
  "foreign_lang": [3, 4],
  "departments": ["Computer Science"],
  "professors": ["Smith"],
  "no_prerequisites": true,
  "minGpa": 3.0,
  "courseLevel": "elementary",
  "sortBy": "gpa"
}
```

**Response:**
```json
{
  "classes": [
    {
      "class_code": "CS 101",
      "course_name": "Introduction to Computer Science",
      "course_desc": "An introductory course to computer science and programming.",
      "credits": "3",
      "requisites": "",
      "repeatable": "No",
      "last_taught": "Fall 2023",
      "course_level": 1,
      "course_breadth": "Physical Science",
      "grad_req": false,
      "lands_credit": false,
      "honors": 0,
      "gen_ed": 3,
      "workplace": 0,
      "foreign_lang": 0,
      "gpa": 3.5,
      "ethnic": false,
      "grade_count": 120,
      "preliminary_difficulty": 2.5,
      "indexed_difficulty": 2.7,
      "preliminary_fun": 3.8,
      "indexed_fun": 3.9,
      "preliminary_workload": 3.2,
      "indexed_workload": 3.0,
      "review_count": 45,
      "overall_rating": 4.2,
      "gradeData": {
        "class_code": "CS 101",
        "students": 120,
        "GPA": 3.5,
        "A": 45,
        "AB": 30,
        "B": 25,
        "BC": "10",
        "C": 5,
        "D": "3",
        "F": "2"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

## Filter Parameters

The application supports the following filter parameters:

### Breadth
- Biological Science
- Humanities
- Literature
- Natural Science
- Physical Science
- Social Science

### General Education
- Communication A (gen_ed: 1)
- Communication B (gen_ed: 2)
- Quantitative Reasoning A (gen_ed: 3)
- Quantitative Reasoning B (gen_ed: 4)
- Ethnic Studies (ethnic: true)

### Level
- Elementary (course_level: 1)
- Intermediate (course_level: 2)
- Advanced (course_level: 3)

### Credits
- 1 Credit
- 2 Credits
- 3 Credits
- 4 Credits
- 5+ Credits

### Honors
- Honors only (honors: 1)
- Accelerated honors (honors: 2)
- Honors optional (honors: 3)

### Foreign Language
- 1st semester (foreign_lang: 1)
- 2nd semester (foreign_lang: 2)
- 3rd semester (foreign_lang: 3)
- 4th semester (foreign_lang: 4)
- 5th semester (foreign_lang: 5)

## Authentication

The application uses Auth.js (formerly NextAuth.js) with Supabase as the database adapter.

### Authentication Flow

1. New users can sign up at `/auth/register` with their @wisc.edu email
2. Existing users can log in at `/auth/login`
3. Auth.js validates the credentials using the Credentials provider
4. If valid, the user is authenticated and redirected to the home page
5. User session data is stored in Supabase

### Setup

1. Configure environment variables:
```bash
# Auth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production

# Supabase Configuration (Server-side)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Supabase Configuration (Client-side)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## User Authentication and Synchronization

The application maintains a custom `users` table in the `wisco` schema that stays in sync with Supabase Auth through PostgreSQL database triggers:

1. **Database Triggers**: The SQL configuration automatically syncs changes between `auth.users` and `wisco.users`
2. **How It Works**:
   - When a user signs up via Supabase Auth, the trigger automatically creates a corresponding record in the `wisco.users` table
   - When a user is updated in Supabase Auth (e.g., verifies their email), the trigger updates the `wisco.users` record
   - When a user is deleted from Supabase Auth, the trigger removes the corresponding record from `wisco.users`

## Development

### Using Turbopack

The project uses Turbopack for faster development builds:

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm run start
```

## Deployment

The application can be deployed using Vercel, Netlify, or any other platform that supports Next.js applications.

### Deploying to Vercel
1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Configure build settings if necessary
4. Deploy

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## AI Advisor Implementation Steps

To implement an AI advisor that takes user prompts and applies filters to the search results, follow these steps:

### 1. Create AI Advisor Page
1. Create a new page at `src/app/advisor/page.tsx`
2. Implement a chat interface with:
   - Text input for user prompts
   - Message history display
   - Loading states for AI responses
   - Integration with GPT-4-mini API

### 2. Add AI Processing Service
1. Create `src/services/aiAdvisor.ts` to handle:
   - GPT-4-mini API integration
   - Prompt processing and filter extraction
   - Response formatting

### 3. Extend Filter System
1. Add new filter types in `src/types/search.ts`:
   ```typescript
   interface AIAdvisorFilters {
     topics?: string[];
     experience_filters?: string[];
     // Add other filter types as needed
   }
   ```

2. Create filter conversion utilities in `src/utils/aiFilterUtils.ts`:
   - Convert AI responses to filter format
   - Map AI suggestions to existing filter types
   - Handle edge cases and invalid suggestions

### 4. Integrate with Existing Components
1. Modify `FilterSidebar.tsx` to:
   - Accept AI-generated filters
   - Display AI suggestions
   - Allow manual override of AI suggestions

2. Update `ClassSearch.tsx` to:
   - Handle AI-generated filter updates
   - Display AI-specific UI elements
   - Maintain search state with AI filters

### 5. Add State Management
1. Extend `useSearchStore` in `src/store/useSearchStore.ts`:
   ```typescript
   interface SearchStore {
     // ... existing store properties
     aiFilters: AIAdvisorFilters | null;
     setAIFilters: (filters: AIAdvisorFilters) => void;
   }
   ```

### 6. Implement Navigation
1. Add navigation between search and advisor pages
2. Preserve filter state when switching between pages
3. Add ability to apply AI suggestions to current search

### 7. Add Error Handling
1. Implement graceful fallbacks for:
   - API failures
   - Invalid AI responses
   - Filter conversion errors
2. Add user feedback for AI processing status

### 8. Testing
1. Add unit tests for:
   - AI response processing
   - Filter conversion
   - State management
2. Add integration tests for:
   - Page navigation
   - Filter application
   - Search results updates

### 9. Performance Optimization
1. Implement caching for:
   - AI responses
   - Filter conversions
   - Search results
2. Add debouncing for:
   - User input
   - Filter updates
   - Search requests

### 10. Documentation
1. Update API documentation
2. Add usage examples
3. Document filter mapping rules
4. Add troubleshooting guide

## AI Advisor API Interaction Flow

### 1. User Input Processing
```typescript
interface AdvisorPrompt {
  text: string;
  context?: {
    currentFilters?: ClassSearchQuery;
    school?: {
      name: string;
      config: SchoolConfig;
      filterGroups: FilterGroup[];
      filterOperations: Record<string, FilterOperation>;
      filterHandlers: Record<string, FilterHandler>;
      apiFields: Record<string, ApiFieldMapping>;
    };
  };
}

interface AdvisorResponse {
  filters: Record<string, unknown>;
  followUpQuestion: string;
}
```

### 2. API Endpoint Structure
```typescript
// POST /api/advisor/analyze
{
  "prompt": string;
  "context": {
    "currentFilters": ClassSearchQuery | null;
    "school": {
      "name": string;
      "config": SchoolConfig;
      "filterGroups": FilterGroup[];
      "filterOperations": Record<string, FilterOperation>;
      "filterHandlers": Record<string, FilterHandler>;
      "apiFields": Record<string, ApiFieldMapping>;
    };
  };
}

// Response
{
  "filters": Record<string, unknown>;
  "followUpQuestion": string;
}
```

### 3. Prompt Processing Flow
1. **Input Validation**
   - Sanitize user input
   - Extract key terms and preferences
   - Validate against school's `filterGroups` and `filterOperations`

2. **Context Enrichment**
   - Add current filter state
   - Include school's filter configuration

3. **AI Processing**
   - Send enriched prompt to GPT-4-mini
   - Process response for filter extraction
   - Validate extracted filters using `filterOperations`

4. **Response Generation**
   - Format filters for direct use with `FilterSidebar`
   - Generate a follow-up question to guide the user

### 4. Schema Validation
```typescript
// src/types/aiAdvisor.ts
import { z } from 'zod';
import { SchoolConfig } from '@/config/filterConfigs';

// Create a function to generate filter schema based on school config
function createFilterSchema(schoolConfig: SchoolConfig) {
  const schemaFields: Record<string, z.ZodTypeAny> = {
    // Common fields for all schools
    topics: z.array(z.string()).optional(),
    experience_filters: z.array(z.string()).optional(),
    minGpa: z.number().optional(),
    no_prerequisites: z.boolean().optional(),
  };

  // Add school-specific fields based on filter groups
  schoolConfig.filters.groups.forEach(group => {
    switch (group.key) {
      case 'breadth':
        schemaFields.course_breadth = z.array(z.string()).optional();
        break;
      case 'gen_ed':
        schemaFields.gen_ed = z.array(z.number()).optional();
        break;
      case 'level':
        schemaFields.course_level = z.array(z.number()).optional();
        break;
      case 'credits':
        schemaFields.credits_min = z.number().optional();
        schemaFields.credits_max = z.number().optional();
        break;
      case 'honors':
        schemaFields.honors = z.array(z.number()).optional();
        break;
      case 'foreign_lang':
        schemaFields.foreign_lang = z.array(z.number()).optional();
        break;
      // Add other school-specific fields as needed
    }
  });

  return z.object(schemaFields);
}

// Create a function to generate the complete response schema
export function createAdvisorResponseSchema(schoolConfig: SchoolConfig) {
  return z.object({
    filters: createFilterSchema(schoolConfig),
    followUpQuestion: z.string().min(1).max(200),
  });
}

// Usage in the API route
export async function POST(req: Request) {
  try {
    const { prompt, school } = await req.json();
    
    // Get the school config
    const schoolConfig = getSchoolFromHostname(school);
    
    // Create schema specific to this school
    const advisorResponseSchema = createAdvisorResponseSchema(schoolConfig);
    
    // Process the AI response
    const response = await processAIResponse(prompt, schoolConfig);
    
    // Validate the AI response against the school-specific schema
    const validatedResponse = advisorResponseSchema.parse(response);
    
    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'AI response did not match expected format for this school',
          details: error.errors
        }
      }, 400);
    }
    // Handle other errors...
  }
}

// Example usage with different schools
const wisconsinSchema = createAdvisorResponseSchema(schoolConfigs.wisco);
const utahSchema = createAdvisorResponseSchema(schoolConfigs.utah);

// Example responses for different schools
const wisconsinResponse = {
  filters: {
    course_breadth: ["Physical Science"],
    gen_ed: [3],
    ethnic: true
  },
  followUpQuestion: "Would you like to see classes with no prerequisites?"
};

const utahResponse = {
  filters: {
    ge_core: ["Lower Division Writing"],
    breadth: ["Fine Arts"],
    bacc_requirements: ["Communication & Writing"]
  },
  followUpQuestion: "Would you prefer classes with a higher GPA or a lighter workload?"
};

// Both responses will be validated against their respective school schemas
const validatedWisconsin = wisconsinSchema.parse(wisconsinResponse);
const validatedUtah = utahSchema.parse(utahResponse);
```

This approach:
1. Creates school-specific schemas based on each school's filter configuration
2. Maintains common fields across all schools (topics, experience_filters, etc.)
3. Dynamically adds school-specific fields based on the school's filter groups
4. Validates responses against the correct schema for each school
5. Provides type safety and runtime validation
6. Makes it easy to add new schools without modifying the validation logic

## TODOs 
- [ ] Use environment variables for all the colors
- [ ] Make sure authentication works on production domain 
- [ ] Add filters based on design specifications
- [ ] Implement mobile-optimized search experience
- [ ] Add dark mode support
- [ ] Improve accessibility compliance

## Adding a New School

To add support for a new university, you need to configure several components:

### 1. School Configuration
In `src/config/themes.ts`, add a new school configuration:

```typescript
// Add school theme colors
const schoolThemes = {
  newSchool: {
    primary: "#YOUR_PRIMARY_COLOR",
    primaryHover: "#YOUR_PRIMARY_HOVER_COLOR",
    primaryLight: "#YOUR_PRIMARY_LIGHT_COLOR",
    primaryBorder: "#YOUR_PRIMARY_BORDER_COLOR",
    primaryText: "#YOUR_PRIMARY_TEXT_COLOR"
  }
};

// Add filter groups specific to the school
const newSchoolFilterGroups: FilterGroup[] = [
  {
    key: "breadth",
    name: "Breadth Requirements",
    filters: ["HUMANITIES", "SOCIAL_SCIENCE", "NATURAL_SCIENCE"]
  },
  // Add other filter groups...
];

// Add API field mappings
const newSchoolApiFields: Record<string, ApiFieldMapping> = {
  breadth: {
    uiName: "Breadth",
    apiName: "course_breadth",
    type: "array"
  },
  // Add other field mappings...
};

// Add filter operations
const newSchoolFilterOperations: Record<string, FilterOperation> = {
  breadth: {
    uiName: "Breadth",
    apiName: "course_breadth",
    type: "array",
    apply: (item: Record<string, unknown>, value: unknown) => {
      if (!Array.isArray(value)) return false;
      const breadth = item.course_breadth as string;
      return value.includes(breadth);
    }
  },
  // Add other operations...
};

// Add the school configuration
export const schoolConfigs: Record<string, SchoolConfig> = {
  // ... existing schools ...
  newSchool: {
    name: "New University Name",
    shortName: "newSchool",
    domain: "newschool.campusfy.app",
    emailDomain: "newschool.edu",
    subdomainPrefix: "newschool",
    colors: schoolThemes.newSchool,
    filters: {
      groups: newSchoolFilterGroups,
      mappings: newSchoolMappings,
      apiFields: newSchoolApiFields,
      operations: newSchoolFilterOperations,
      handlers: {
        breadth: createDirectHandler('breadth', 'course_breadth'),
        // Add other handlers...
      }
    }
  }
};
```

### 2. Database Configuration
In `src/config/database.ts`, add the school's database configuration:

```typescript
export const databaseConfigs: Record<string, DatabaseConfig> = {
  // ... existing schools ...
  newSchool: {
    schema: 'newschool',
    tables: {
      classes: 'classes_undergrad',
      grades: 'grades-test',
      users: 'users'
    },
    apiEndpoints: {
      enrollment: 'https://enroll.newschool.edu/api/search/v1',
      search: 'https://enroll.newschool.edu/api/search/v1'
    }
  }
};
```

### 3. Database Schema
Create the necessary database tables in your Supabase instance:

```sql
-- Create schema for the new school
CREATE SCHEMA IF NOT EXISTS newschool;

-- Create classes table
CREATE TABLE newschool.classes_undergrad (
  class_code TEXT PRIMARY KEY,
  course_name TEXT,
  course_desc TEXT,
  credits TEXT,
  requisites TEXT,
  gpa NUMERIC,
  grade_count INTEGER,
  indexed_difficulty NUMERIC,
  indexed_fun NUMERIC,
  indexed_workload NUMERIC,
  review_count INTEGER,
  overall_rating NUMERIC,
  course_breadth TEXT,
  gen_ed TEXT,
  level TEXT,
  honors TEXT,
  foreign_lang TEXT,
  ethnic BOOLEAN
);

-- Create grades table
CREATE TABLE newschool.grades-test (
  class_code TEXT REFERENCES newschool.classes_undergrad(class_code),
  term TEXT,
  year INTEGER,
  grade_distribution JSONB,
  GPA NUMERIC,
  PRIMARY KEY (class_code, term, year)
);

-- Create users table
CREATE TABLE newschool.users (
  user_id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status TEXT DEFAULT 'pending'
);

-- Add necessary indexes
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON newschool.classes_undergrad (class_code);
CREATE INDEX IF NOT EXISTS idx_classes_course_name ON newschool.classes_undergrad (course_name);
CREATE INDEX IF NOT EXISTS idx_classes_course_desc ON newschool.classes_undergrad (course_desc);
CREATE INDEX IF NOT EXISTS idx_classes_filters ON newschool.classes_undergrad (course_level, course_breadth, gen_ed, ethnic);
CREATE INDEX IF NOT EXISTS idx_grades_class_code ON newschool.grades-test (class_code);
```

### 4. DNS Configuration
Add the following DNS records for your new school:
- `newschool.campusfy.app` - Main domain
- `*.newschool.campusfy.app` - Wildcard subdomain for development

### 5. Environment Variables
Add the following environment variables to your `.env` file:
```
NEXT_PUBLIC_NEWSCHOOL_DOMAIN=newschool.campusfy.app
NEXT_PUBLIC_NEWSCHOOL_EMAIL_DOMAIN=newschool.edu
```

### 6. Testing
After adding a new school:
1. Test the school-specific filters and search functionality
2. Verify that the database queries work correctly
3. Test the authentication flow with the new email domain
4. Verify that the theme colors are applied correctly
5. Test the enrollment API integration
