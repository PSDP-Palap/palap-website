import { createFileRoute } from "@tanstack/react-router";

import LoginForm from "@/components/auth/LoginForm";
import LoginHeader from "@/components/auth/LoginHeader";

export const Route = createFileRoute("/sign-in")({
  component: () => (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-100 via-rose-50 to-amber-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl rounded-3xl p-8 space-y-6 border border-orange-100">
        <LoginHeader />
        <LoginForm />
      </div>
    </div>
  )
});
