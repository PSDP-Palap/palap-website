import { createFileRoute } from "@tanstack/react-router";
import { useUserStore } from "@/stores/useUserStore";
import AccountSettingTab from "@/components/freelance/tabs/AccountSettingTab";

export const Route = createFileRoute("/_freelance/freelance/account")({
  component: AccountRoute
});

function AccountRoute() {
  const { profile, session } = useUserStore();

  return (
    <AccountSettingTab
      profile={profile}
      session={session}
    />
  );
}
