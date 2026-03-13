"use client";

import { useState } from "react";
import { getPaddleInstance } from "@paddle/paddle-js";

type Props = {
  userId: string;
  priceId: string;
};

export default function PlanUpgradeButton({ userId, priceId }: Props) {
  const [launched, setLaunched] = useState(false);

  function handleUpgrade() {
    const paddle = getPaddleInstance();
    if (!paddle) return;

    setLaunched(true);

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId,
        purchaseType: "premium",
      },
      settings: {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/app/settings?checkout=success`,
      },
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleUpgrade}
        disabled={launched}
        className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-40"
      >
        {launched ? "Opening checkout…" : "Upgrade to Premium - $8/mo"}
      </button>
    </div>
  );
}
