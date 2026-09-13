"use client";

import { useAuth } from "@/lib/auth";
import { AccountGate } from "@/components/account/AccountGate";
import { TravelerProfile } from "@/components/account/TravelerProfile";
import { ProviderProfile } from "@/components/account/ProviderProfile";

function Inner() {
  const { user } = useAuth();
  if (!user) return null;
  // the two ecosystems get genuinely different profiles, not one shared form
  return user.role === "provider" ? <ProviderProfile /> : <TravelerProfile />;
}

export default function ProfilePage() {
  return (
    <div className="acc-page">
      <AccountGate>
        <Inner />
      </AccountGate>
    </div>
  );
}
