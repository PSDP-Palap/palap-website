import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/service/")({
  component: RouteComponent
});

function RouteComponent() {
  return <div>Hello "/service/"!</div>;
}
