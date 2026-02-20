import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/home/Homepage";

export const Route = createFileRoute("/")({
  component: HomePage
});
