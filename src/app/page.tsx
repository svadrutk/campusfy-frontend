import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { schoolConfigs } from '@/config/themes';
import { Metadata } from 'next';
import {  } from '@/config/themes';

export async function generateMetadata(): Promise<Metadata> {
  
  return {
    title: `Campusfy`,
    description: `Find and review courses at multiple universities. Get detailed information about classes, including grade distributions, prerequisites, and student reviews.`,
    openGraph: {
      title: `Campusfy`,
      description: `Find and review courses at multiple universities. Get detailed information about classes, including grade distributions, prerequisites, and student reviews.`,
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Campusfy Course Guide',
        },
      ],
    },
  };
}

export default async function Home() {
  // Get the host from headers
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isDev = process.env.NODE_ENV === 'development';
  
  // Check if it's a school subdomain
  const isSchoolSubdomain = Object.values(schoolConfigs).some(config => {
    if (isDev) {
      return host.startsWith(`${config.subdomainPrefix}.`);
    } else {
      // In production, check against the full domain
      return host === config.domain;
    }
  });

  if (isSchoolSubdomain) {
    redirect('/search');
  }
  
  // Otherwise, show the landing page for campusfy.app
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block bg-red-50 px-4 py-2 rounded-full mb-6">
            <span className="text-red-600 font-inter font-medium">Join 1000+ students discovering their perfect courses</span>
          </div>
          <h1 className="text-6xl font-new-spirit-medium-condensed font-bold text-gray-900 mb-6">
            College has never been this easy. 
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Your personalized course discovery platform. Find the perfect classes, read reviews, and make informed decisions about your academic journey.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <a
              href={`https://${schoolConfigs.wisco.domain}`}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg shadow-lg text-white bg-[#C5050C] hover:bg-[#A50000] transition-all duration-200 transform hover:scale-105"
            >
              UW-Madison
            </a>
            <a
              href={`https://${schoolConfigs.utah.domain}`}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg shadow-lg text-white bg-[#BE0000] hover:bg-[#9A0000] transition-all duration-200 transform hover:scale-105"
            >
              Utah
            </a>
          </div>
          
          {/* Social Proof Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-new-spirit-medium text-red-600 mb-2">1000+</div>
              <div className="text-gray-600 font-inter">Active Students</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-new-spirit-medium text-red-600 mb-2">3000+</div>
              <div className="text-gray-600 font-inter">Course Pages Viewed</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-new-spirit-medium text-red-600 mb-2">16000+</div>
              <div className="text-gray-600 font-inter">Courses Available</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-red-100 group flex flex-col h-full">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors duration-200">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-new-spirit-medium text-gray-900 mb-4">Smart Course Discovery</h3>
            <p className="text-gray-600 font-inter mb-4 flex-grow">
              Find your perfect courses with our intelligent search system. Filter by department, difficulty, and student ratings.
            </p>
            <a 
              href="#cta" 
              className="text-sm text-red-600 font-inter font-medium hover:text-red-700 transition-colors duration-200"
            >
              Explore Courses →
            </a>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-red-100 group flex flex-col h-full">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors duration-200">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-new-spirit-medium text-gray-900 mb-4">Real Student Reviews</h3>
            <p className="text-gray-600 font-inter mb-4 flex-grow">
              Get honest feedback from students who&apos;ve taken the course. Learn about workload, teaching style, and course quality.
            </p>
            <a 
              href="#cta" 
              className="text-sm text-red-600 font-inter font-medium hover:text-red-700 transition-colors duration-200"
            >
              Read Reviews →
            </a>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-red-100 group flex flex-col h-full">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors duration-200">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-new-spirit-medium text-gray-900 mb-4">Grade Insights</h3>
            <p className="text-gray-600 font-inter mb-4 flex-grow">
              Make informed decisions with historical grade distributions. Understand course difficulty and grading patterns, as well as the elements that contribute to a good grade.
            </p>
            <a 
              href="#cta" 
              className="text-sm text-red-600 font-inter font-medium hover:text-red-700 transition-colors duration-200"
            >
              View Grades →
            </a>
          </div>
        </div>

        {/* Trust Section */}
        <div className="text-center bg-white p-12 rounded-xl shadow-sm border border-gray-100 mb-16">
          <h2 className="text-3xl font-new-spirit-medium text-gray-900 mb-8">Trusted by Students</h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-xl text-gray-600 font-inter italic mb-4">
              &ldquo;Campusfy helped me find the perfect courses for my major. The reviews and grade distributions were incredibly helpful in making my decisions.&rdquo;
            </p>
            <p className="text-gray-900 font-new-spirit-medium">- Student at UW-Madison</p>
          </div>
        </div>

        {/* Final CTA Section */}
        <div id="cta" className="text-center">
          <h2 className="text-3xl font-new-spirit-medium text-gray-900 mb-4">Ready to Find Your Perfect Course?</h2>
          <p className="text-gray-600 mb-8">
            Join thousands of students who are making informed decisions about their academic journey.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href={`https://${schoolConfigs.wisco.domain}`}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg shadow-lg text-white bg-[#C5050C] hover:bg-[#A50000] transition-all duration-200 transform hover:scale-105"
            >
              UW-Madison
            </a>
            <a
              href={`https://${schoolConfigs.utah.domain}`}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg shadow-lg text-white bg-[#BE0000] hover:bg-[#9A0000] transition-all duration-200 transform hover:scale-105"
            >
              Utah
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
