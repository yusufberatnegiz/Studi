/**
 * Server-side Paddle configuration.
 * All secrets stay here — never imported by client code.
 */

export type PaddleEnv = "sandbox" | "production";

export interface PaddleServerConfig {
  apiKey: string;
  webhookSecret: string;
  priceIdCourse: string;
  priceIdPremium: string;
  env: PaddleEnv;
}

/**
 * Returns validated Paddle server config from environment variables.
 * Throws at runtime if any required var is missing, so misconfiguration
 * surfaces immediately rather than silently.
 */
export function getPaddleServerConfig(): PaddleServerConfig {
  const apiKey = process.env.PADDLE_API_KEY;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  const priceIdCourse = process.env.PADDLE_PRICE_ID_COURSE;
  const priceIdPremium = process.env.PADDLE_PRICE_ID_PREMIUM;
  const env = (process.env.PADDLE_ENV ?? "sandbox") as PaddleEnv;

  if (!apiKey) throw new Error("Missing env: PADDLE_API_KEY");
  if (!webhookSecret) throw new Error("Missing env: PADDLE_WEBHOOK_SECRET");
  if (!priceIdCourse) throw new Error("Missing env: PADDLE_PRICE_ID_COURSE");
  if (!priceIdPremium) throw new Error("Missing env: PADDLE_PRICE_ID_PREMIUM");
  if (env !== "sandbox" && env !== "production") {
    throw new Error('PADDLE_ENV must be "sandbox" or "production"');
  }

  return { apiKey, webhookSecret, priceIdCourse, priceIdPremium, env };
}
