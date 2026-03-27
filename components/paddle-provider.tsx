"use client";

import Script from "next/script";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (options: { token: string }) => void;
    };
  }
}

/**
 * Loads the Paddle.js v2 CDN script and initializes it.
 * - CDN script is required for Paddle Retain (payment recovery).
 * - Runs on every page via root layout, including the public homepage.
 * - Only sets sandbox mode when NEXT_PUBLIC_PADDLE_ENV === "sandbox".
 * - getPaddleInstance() from @paddle/paddle-js reads window.Paddle set here.
 */
export default function PaddleProvider() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const env = process.env.NEXT_PUBLIC_PADDLE_ENV;

  if (!token) return null;

  function handleLoad() {
    if (!window.Paddle) return;
    if (env === "sandbox") {
      window.Paddle.Environment.set("sandbox");
    }
    window.Paddle.Initialize({ token: token! });
  }

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      onLoad={handleLoad}
    />
  );
}
