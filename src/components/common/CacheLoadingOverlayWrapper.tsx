'use client';

import dynamic from "next/dynamic";

// Dynamically import the CacheLoadingOverlay component
const CacheLoadingOverlay = dynamic(
  () => import("./CacheLoadingOverlay")
);

export default function CacheLoadingOverlayWrapper() {
  return <CacheLoadingOverlay />;
} 