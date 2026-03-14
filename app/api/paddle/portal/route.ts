import { NextResponse } from "next/server";

const PADDLE_CUSTOMER_PORTAL =
  process.env.PADDLE_ENV === "production"
    ? "https://customer.paddle.com/"
    : "https://sandbox-customer.paddle.com/";

export async function GET() {
  return NextResponse.redirect(PADDLE_CUSTOMER_PORTAL);
}
