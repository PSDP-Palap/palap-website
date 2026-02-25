import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/service/$id")({
  component: RouteComponent
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <div>id: {id}</div>;
}
