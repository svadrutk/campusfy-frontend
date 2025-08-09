import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Paths that should only be accessible from school subdomains
 * These routes are restricted from the main domain for school-specific content
 */
const SUBDOMAIN_ONLY_PATHS: string[] = ['/search', '/classes', '/class'];

/**
 * Production domain for the application
 */
const MAIN_DOMAIN = 'campusfy-frontend.vercel.app';

/**
 * List of internal API paths that should be protected
 * These endpoints are meant to be called only by the application, not directly by users
 */
const INTERNAL_API_PATHS = [
  '/api/classes',
  '/api/embeddings',
  '/api/search',
  '/api/enrollment',
  '/api/reviews',
  '/api/advisor',
  '/api/vector-search',
];

/**
 * Checks if the hostname is the main domain without a subdomain
 * 
 * @param {string} hostname - The hostname to check
 * @returns {boolean} True if it's the main domain without subdomain
 */
function isMainDomain(hostname: string): boolean {
  // In development
  if (process.env.NODE_ENV === 'development') {
    return hostname === 'localhost:3000' || hostname === 'localhost';
  }
  
  // In production
  return hostname === MAIN_DOMAIN;
}

/**
 * Checks if a URL path starts with any of the protected paths
 * 
 * @param {string} path - The URL path to check
 * @returns {boolean} True if the path is protected
 */
function isProtectedPath(path: string): boolean {
  return SUBDOMAIN_ONLY_PATHS.some((protectedPath: string) => 
    path.startsWith(protectedPath)
  );
}

/**
 * Validates if a request is a legitimate app request and not a direct browser access
 * Used to prevent direct access to internal API endpoints
 * 
 * @param {NextRequest} request - The Next.js request object
 * @returns {boolean} True if the request is legitimate
 */
function isLegitimateAppRequest(request: NextRequest): boolean {
  // Check for the presence of specific headers that browsers typically include
  const acceptHeader = request.headers.get('accept') || '';
  const fetchMode = request.headers.get('sec-fetch-mode') || '';
  const fetchSite = request.headers.get('sec-fetch-site') || '';
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const internalRequest = request.headers.get('x-internal-request') || '';
  const originalReferer = request.headers.get('x-original-referrer') || '';
  
  // Special case: If this is an internal API request (e.g., from our main API routes)
  if (internalRequest === 'true') {
    console.log('Allowing internal API request with original referer:', originalReferer);
    return true;
  }
  
  // Get the URL path that made the request
  const refererPath = referer ? new URL(referer).pathname : '';
  
  // Allow requests coming from legitimate page loads
  // If the referer shows it's coming from a class page or search page, allow it
  if (referer && (
      refererPath.startsWith('/class/') ||
      refererPath.startsWith('/search')
    )) {
    return true;
  }

  // Check if this is an XHR/fetch request from our app
  const isXhrRequest = fetchMode === 'cors' || 
                       acceptHeader.includes('application/json') ||
                       request.headers.has('x-requested-with');
  
  // Check for trusted origins (localhost during development, our domains in production)
  const hasTrustedOrigin = process.env.NODE_ENV === 'development' 
    ? (origin.includes('localhost') || referer.includes('localhost'))
    : (origin.includes('campusfy-frontend.vercel.app') || referer.includes('campusfy-frontend.vercel.app'));
  
  // Check if the fetch is from the same site (our app)
  const isSameSite = fetchSite === 'same-origin' || fetchSite === 'same-site';
  
  // If it has the characteristics of a legitimate app request, allow it
  return (isXhrRequest && hasTrustedOrigin) || isSameSite;
}

/**
 * Next.js middleware function
 * Handles routing rules and API request validation
 * 
 * @param {NextRequest} request - The incoming request object
 * @returns {NextResponse} The response or routing decision
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Check if this is an internal API request
  if (INTERNAL_API_PATHS.some(path => pathname.startsWith(path))) {
    // Log headers for debugging
    const referer = request.headers.get('referer') || 'none';
    const origin = request.headers.get('origin') || 'none';
    const accept = request.headers.get('accept') || 'none';
    const fetchMode = request.headers.get('sec-fetch-mode') || 'none';
    const fetchSite = request.headers.get('sec-fetch-site') || 'none';
    
    console.log(`API request debug for ${pathname}:`, {
      referer,
      refererPath: referer !== 'none' ? new URL(referer).pathname : 'none',
      origin,
      accept,
      fetchMode,
      fetchSite,
      host: hostname,
      isLegitimate: isLegitimateAppRequest(request)
    });
    
    // Block direct browser access to internal API paths
    if (!isLegitimateAppRequest(request)) {
      console.log(`Blocking direct access to internal API: ${pathname}`);
      return new NextResponse(JSON.stringify({ error: 'Access denied' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // If we're on the main domain and trying to access a protected path
  if (isMainDomain(hostname) && isProtectedPath(pathname)) {
    // Create a URL for the 404 page
    const url = request.nextUrl.clone();
    url.pathname = '/not-found';
    
    console.log(`Redirecting to 404: ${hostname}${pathname} is not accessible from the main domain`);
    
    // Return a Next.js Response object to redirect to 404
    return NextResponse.rewrite(url);
  }
  
  // Otherwise, continue with the request
  return NextResponse.next();
}

/**
 * Configuration for the middleware
 * Specifies which paths the middleware should run on
 */
export const config = {
  matcher: [
    // Match all routes including API routes
    '/(.*)',
  ],
}; 