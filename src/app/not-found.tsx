import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-new-spirit-medium-condensed text-[var(--color-primary-text)] mb-4">
          404 - Page Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          The page you are looking for does not exist.
        </p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-new-spirit-medium transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
} 