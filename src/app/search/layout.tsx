import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getSchoolFromHostname } from '@/config/themes';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const school = getSchoolFromHostname(hostname);
  
  return {
    title: `Search Courses | ${school.name}`,
    description: `Search and explore courses at ${school.name}. Find detailed information about classes, including prerequisites, grade distributions, and student reviews.`,
    openGraph: {
      title: `Course Search at ${school.name}`,
      description: `Search and explore courses at ${school.name}. Find detailed information about classes, including prerequisites, grade distributions, and student reviews.`,
      type: 'website',
    },
  };
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 