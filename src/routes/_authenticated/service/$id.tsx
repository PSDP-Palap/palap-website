import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/service/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/service" });
  },
});
