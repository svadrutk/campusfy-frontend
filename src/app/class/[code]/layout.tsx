import { Metadata } from 'next';
import supabase from '@/lib/supabase';
import { databaseConfigs } from '@/config/database';
import { headers } from 'next/headers';
import { getSchoolFromHostname } from '@/config/themes';

interface ClassParams {
  code: string;
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<ClassParams> 
}): Promise<Metadata> {
  // Await the params which is now a Promise in Next.js 15
  const { code } = await params;
  const decodedClassCode = decodeURIComponent(code);
  
  // Get the hostname from headers
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const school = getSchoolFromHostname(hostname);
  const schema = school.shortName.toLowerCase();
  
  console.log('Generating metadata for:', {
    classCode: decodedClassCode,
    hostname,
    school: school.shortName,
    schema
  });
  
  // Get the correct table name from the database config
  const dbConfig = databaseConfigs[schema] || databaseConfigs.wisco;
  
  // Fetch course data
  const { data: classData } = await supabase
    .schema(schema)
    .from(dbConfig.tables.classes)
    .select('*')
    .eq('class_code', decodedClassCode)
    .single();

  console.log('Course data fetched:', classData);

  if (!classData) {
    console.log('No course data found, returning default metadata');
    return {
      title: `${decodedClassCode}`,
      description: `Course information for ${decodedClassCode} at Campusfy.`,
    };
  }

  const metadata = {
    title: `${decodedClassCode} - ${classData.course_name}`,
    description: `${classData.course_name}: ${classData.description?.substring(0, 160) || 'Course information and reviews at Campusfy.'}`,
    openGraph: {
      title: `${decodedClassCode} - ${classData.course_name}`,
      description: classData.description?.substring(0, 160) || 'Course information and reviews at Campusfy.',
      type: 'website',
    },
  };

  console.log('Generated metadata:', metadata);
  return metadata;
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<ClassParams>;
}

export default function CourseLayout({
  children,
  params: _params,
}: LayoutProps) {
  return children;
} 