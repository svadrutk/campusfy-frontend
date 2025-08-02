import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getSchoolFromHostname } from '@/config/themes';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const school = getSchoolFromHostname(hostname);
  
  return {
    title: `Course Advisor | ${school.name}`,
    description: `Get personalized course recommendations at ${school.name}. Our AI-powered advisor helps you find the perfect classes based on your interests and academic goals.`,
    openGraph: {
      title: `AI Course Advisor at ${school.name}`,
      description: `Get personalized course recommendations at ${school.name}. Our AI-powered advisor helps you find the perfect classes based on your interests and academic goals.`,
      type: 'website',
    },
  };
}

export default function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 