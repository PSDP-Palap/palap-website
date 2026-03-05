import { createFileRoute } from "@tanstack/react-router";
import PlaceholderTab from "@/components/admin/shared/PlaceholderTab";

export const Route = createFileRoute("/_admin/management/payment")({
  component: () => <PlaceholderTab label="Payment" />
});
