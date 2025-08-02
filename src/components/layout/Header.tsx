"use client";

import { LogIn, LogOut, GraduationCap, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/contexts/theme/ThemeContext";
import { useSearchStore } from "@/store/useSearchStore";
import { getSchoolFromHostname } from "@/config/themes";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { school } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setIsSearchFocused } = useSearchStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const pathname = usePathname();
  
  // Initialize isMainDomain to true to match server-side rendering
  const [isMainDomain, setIsMainDomain] = useState(true);
  const [authUrl, setAuthUrl] = useState('');

  // Reset loading state when pathname changes or component unmounts
  useEffect(() => {
    return () => {
      setIsSearchLoading(false);
    };
  }, [pathname]);

  // Set mounted state and update domain check
  useEffect(() => {
    setIsMounted(true);
    
    const hostname = window.location.hostname;
    const isDev = process.env.NODE_ENV === 'development';
    const productionDomain = 'campusfy.app';
    
    if (isDev) {
      setIsMainDomain(hostname === 'localhost' || hostname === 'localhost:3000');
    } else {
      setIsMainDomain(hostname === productionDomain || hostname === `www.${productionDomain}`);
    }

    // Set up auth URL
    const protocol = window.location.protocol;
    const domain = isDev ? `${school.subdomainPrefix}.localhost:3000` : school.domain;
    setAuthUrl(`${protocol}//${domain}/auth/register`);
  }, [school.subdomainPrefix, school.domain]);

  // Extract username from email or use the name if available
  const username = session?.user?.name || 
    (session?.user?.email ? session.user.email.split('@')[0] : null);

  const handleLogout = async () => {
    if (!isMounted) return;
    
    setIsLoggingOut(true);
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    const isDev = process.env.NODE_ENV === 'development';
    const protocol = isDev ? 'http' : 'https';
    const domain = isDev ? `${school.subdomainPrefix}.localhost:3000` : school.domain;
    
    // Create the callback URL using the correct domain
    const callbackUrl = `${protocol}://${domain}`;
    
    // Log the logout environment
    console.log("Logout environment:", {
      hostname,
      isDev,
      protocol,
      domain,
      school: school.shortName
    });
    
    await signOut({ redirect: true, callbackUrl });
  };

  // Handle logo click to unfocus the search input
  const handleLogoClick = () => {
    if (!isMounted) return;

    setIsSearchFocused(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isMounted) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMounted]);

  return (
    <header className="px-2 sm:px-4 py-3 sm:py-4 flex-row flex  justify-between items-center bg-[var(--color-primary-light)] border-b border-[var(--color-primary-border)] sticky top-0 z-50">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <Link 
          href="/" 
          className="flex items-center transition-all duration-300 hover:opacity-80"
          onClick={isMounted ? handleLogoClick : undefined}
        >
          <GraduationCap size={24} className="text-[var(--color-primary)] mr-0.5 mb-4.5 sm:size-[30px]" />
          <div className="flex flex-col">
            <h1 className="font-new-spirit-medium-condensed text-2xl sm:text-3xl text-[var(--color-primary-text)]">
              campusfy
            </h1>
            {/* Only show school name after client-side hydration */}
            {isMounted && !isMainDomain && (
              <span className="text-[10px] sm:text-xs text-[var(--color-primary)] -mt-1 font-new-spirit-medium">
                {school.shortName}
              </span>
            )}
          </div>
        </Link>
      </div>

      {pathname !== "/search" && !isMainDomain && (
        <div className="flex-1 flex justify-center md:justify-end md:mr-4">
          <Link
            href="/search"
            onClick={() => setIsSearchLoading(true)}
            className="bg-white border border-[var(--color-primary)] text-[var(--color-primary-text)] px-3 py-2 rounded-xl flex items-center font-sans transition-all duration-300 hover:shadow-md hover:bg-[var(--color-primary-light)]"
          >
            {isSearchLoading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-xl animate-spin" />
            ) : (
              <Search size={20} className="text-[var(--color-primary)]" />
            )}
          </Link>
        </div>
      )}

      {/* Only show login section after client-side hydration */}
      {isMounted && !isMainDomain && (
        <div className="flex items-center space-x-2 sm:space-x-4">
          {status === "authenticated" ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white border border-[var(--color-primary)] text-[var(--color-primary-text)] px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center font-sans transition-all duration-300 hover:shadow-md hover:bg-[var(--color-primary-light)]"
              >
                <span className="text-[var(--color-primary)] font-new-spirit-medium text-sm sm:text-base mr-1">{username}</span>
                <ChevronDown size={14} className={`text-[var(--color-primary)] transition-transform duration-200 sm:size-4 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-xl shadow-lg border border-[var(--color-primary-border)] z-10 overflow-hidden">
                  <div className="py-2 px-3 sm:px-4 bg-[var(--color-primary-light)] border-b border-[var(--color-primary-border)]">
                    <div className="text-xs sm:text-sm text-gray-500">Signed in as</div>
                    <div className="font-new-spirit-medium text-sm sm:text-base text-[var(--color-primary-text)]">{username}</div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-xl animate-spin mr-2"></div>
                          Logging out...
                        </>
                      ) : (
                        <>
                          <LogOut size={14} className="mr-2 text-[var(--color-primary)] sm:size-4" />
                          Log out
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={authUrl}
              className="bg-white border border-[var(--color-primary)] text-[var(--color-primary-text)] px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center font-sans transition-all duration-300 hover:shadow-md hover:bg-[var(--color-primary-light)]"
            >
              <LogIn size={16} className="mr-1 sm:mr-2 text-[var(--color-primary)] sm:size-[18px]" />
              <span className="text-sm sm:text-base">Sign up with<span className="text-[var(--color-primary)] ml-1 font-new-spirit-medium">@{school.emailDomain}</span></span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
} 