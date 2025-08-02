import { MetadataRoute } from 'next';
import supabase from '@/lib/supabase';
import { databaseConfigs } from '@/config/database';
import { headers } from 'next/headers';
import { schoolConfigs } from '@/config/themes';

// Force dynamic rendering and disable cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to determine if a hostname is a root domain or localhost
function isRootDomainOrLocalhost(hostname: string): boolean {
  return hostname === 'campusfy.app' || 
         hostname === 'www.campusfy.app' ||
         hostname === 'localhost:3000' ||
         hostname === 'localhost';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get the current hostname to determine which university's sitemap to generate
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  console.log(`Generating sitemap for hostname: ${hostname}`);
  
  // Check if this is the root domain or localhost
  if (isRootDomainOrLocalhost(hostname)) {
    console.log('Generating root domain or localhost sitemap with all universities');
    // For root domain, include sitemap entries linking to all university subdomains
    const allUniversitiesSitemaps = await Promise.all(
      Object.entries(schoolConfigs).map(async ([_key, school]) => {
        const university = school.shortName.toLowerCase();
        if (!databaseConfigs[university]) {
          console.warn(`No database config found for university: ${university}`);
          return [];
        }

        // Always use the school's domain for URLs, even in localhost
        // This ensures URLs in the sitemap point to the correct subdomains
        const baseUrl = `https://${school.domain}`;
        console.log(`Adding entries for university: ${university} with baseUrl: ${baseUrl}`);

        // Static pages
        const staticPages = [
          {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
          },
          {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
          },
        ];

        // Fetch courses for this university
        const { data: courses } = await supabase
          .schema(databaseConfigs[university].schema)
          .from(databaseConfigs[university].tables.classes)
          .select('class_code')

        if (!courses) return staticPages;

        // Add course pages for this university using the correct subdomain
        const courseEntries = courses.map((course) => ({
          url: `${baseUrl}/class/${encodeURIComponent(course.class_code)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));

        return [...staticPages, ...courseEntries];
      })
    );

    // Flatten all university sitemaps and add the root entry
    const rootEntry = {
      url: hostname.includes('localhost') ? `http://${hostname}` : 'https://campusfy.app',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    };

    return [rootEntry, ...allUniversitiesSitemaps.flat()];
  }
  
  // Extract subdomain from hostname - this is more reliable than getSchoolFromHostname
  // which might default to a certain school if it can't determine the correct one
  const subdomain = hostname.split('.')[0];
  
  // Find the matching school config directly by subdomain
  const matchingSchool = Object.values(schoolConfigs).find(
    (school) => school.subdomainPrefix === subdomain
  );
  
  if (!matchingSchool) {
    console.warn(`No school config found for subdomain: ${subdomain}`);
    return [];
  }
  
  const university = matchingSchool.shortName.toLowerCase();
  console.log(`Generating subdomain-specific sitemap for university: ${university}`);
  
  // Check if we have a database config for this university
  if (!databaseConfigs[university]) {
    console.warn(`No database config found for university: ${university}`);
    return [];
  }
  
  const baseUrl = `https://${matchingSchool.domain}`;
  
  // Static pages for this university
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ];

  // Fetch courses for this university
  const { data: courses } = await supabase
    .schema(databaseConfigs[university].schema)
    .from(databaseConfigs[university].tables.classes)
    .select('class_code');

  if (!courses) return staticPages;

  // Add course pages for this university
  const courseEntries = courses.map((course) => ({
    url: `${baseUrl}/class/${encodeURIComponent(course.class_code)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...courseEntries];
} 