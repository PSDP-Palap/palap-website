import { createFileRoute } from "@tanstack/react-router";
import RegisterPage from "../../components/authentication/RegisterPage";

export const Route = createFileRoute("/_authentication/register")({
  component: RegisterPage
});
