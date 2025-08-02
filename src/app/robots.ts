import { MetadataRoute } from 'next';
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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  console.log(`Generating robots.txt for hostname: ${hostname}`);
  
  // For localhost, use http; for production use https
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  
  // Check if this is the root domain/localhost or a subdomain
  if (isRootDomainOrLocalhost(hostname)) {
    console.log('Generating root domain robots.txt');
    // Rules for the root domain or localhost
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/'],
      },
      // Always include the sitemap regardless of root or subdomain
      sitemap: `${protocol}://${hostname}/sitemap.xml`,
    };
  } else {
    // Extract subdomain from hostname
    const subdomain = hostname.split('.')[0];
    
    // Find the matching school config directly by subdomain
    const matchingSchool = Object.values(schoolConfigs).find(
      (school) => school.subdomainPrefix === subdomain
    );
    
    if (!matchingSchool) {
      console.warn(`No school config found for subdomain: ${subdomain}`);
      // Return a default robots.txt in case no matching school is found
      return {
        rules: {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/', '/auth/'],
        },
      };
    }
    
    console.log(`Generating subdomain robots.txt for: ${matchingSchool.name}`);
    const baseUrl = `${protocol}://${hostname}`;
    
    // Rules for university-specific subdomains
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/'],
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }
} 