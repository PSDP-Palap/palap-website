import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "../../components/authentication/LoginPage";

export const Route = createFileRoute("/_authentication/login")({
  component: LoginPage
});
