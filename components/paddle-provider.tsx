"use client";

import { useEffect } from "react";
import { initializePaddle } from "@paddle/paddle-js";

/**
 * Initializes Paddle.js once on the client using the public client token.
 * Place this inside the root layout so it runs on every page.
 *
 * Checkout is NOT opened here — this only sets up the Paddle instance
 * so it is ready when billing is wired up.
 */
export default function PaddleProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production" | undefined;

    if (!token) return; // not configured yet — skip silently

    initializePaddle({
      token,
      environment: env === "production" ? "production" : "sandbox",
    }).catch((err) => {
      console.error("Paddle initialization error:", err);
    });
  }, []);

  return null;
}
