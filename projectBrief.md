# CampusFy Frontend Project Brief

## Overview
CampusFy is a modern web application designed to enhance the campus experience for students by providing a comprehensive platform for browsing, searching, and reviewing university courses. The application allows students to search for courses using various filters, view course details including grade distributions, and read/write course reviews.

## Tech Stack
- **Frontend Framework**: Next.js 15.2.1
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 4.0
- **State Management**: React Query (Tanstack Query)
- **Authentication**: Auth.js (formerly NextAuth.js) with Supabase adapter
- **Database**: Supabase
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Form Validation**: Zod

## Key Features
1. **Course Search & Filtering**: Users can search for courses by keywords, course codes, or professors, and filter results by various criteria including:
   - Breadth requirements
   - General education requirements
   - Course level
   - Credits
   - Honors status
   - Foreign language requirements
   - Quick filters (No Finals, Open Seats, No Prerequisites, etc.)

2. **Authentication**: Users can register and log in with their @wisc.edu email addresses.

3. **Course Details**: Detailed information about each course including:
   - Course description
   - Credit information
   - Prerequisites
   - Grade distribution
   - GPA statistics
   - Course reviews

4. **Responsive Design**: The application is designed to work well on all device sizes.

5. **Theme Support**: The application supports school-specific theming with different color schemes.

## Architecture
- **API Architecture**: Unified API approach where all class-related operations (browsing, searching, and filtering) are handled by a single endpoint.
- **Component Structure**: Modular components for reusability and maintainability.
- **Authentication Flow**: Auth.js with Supabase adapter for secure authentication.
- **Theming System**: Dynamic theming based on hostname/subdomain.

## Key Components
- **FilterSidebar**: Component for selecting and applying filters
- **ClassSearch**: Component for displaying search results and handling search queries
- **SearchBar**: Component for inputting search queries
- **useClasses**: Custom hook for fetching and filtering classes
- **Header**: Component for navigation and authentication status

## Database Schema
The application uses Supabase with the 'wisco' schema, containing tables such as:
- classes_undergrad: Stores course information
- grades-test: Stores grade distribution data

## Current Status
The application is in active development with core functionality implemented. There are some TODOs noted in the README:
- Use environment variables for all colors
- Ensure authentication works on production domain
- Add filters based on Meredith's design

## Branding
CampusFy uses a specific color palette to maintain consistent branding:
- Primary Light: #F5F5F5
- Secondary Light Blue: #B2CBF2
- Primary Dark Blue: #000053
- Accent Teal: #44C6AC
- Primary Red: #C5050C

The platform also supports school-specific theming with different color options.

## Fonts
- New Spirit Medium Condensed: Used for the logo and main headings
- New Spirit Medium: Used for secondary headings
- Inter: Used for general text