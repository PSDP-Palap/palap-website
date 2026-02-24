import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import RegisterForm from "@/components/authentication/RegisterForm";
import RegisterHeader from "@/components/authentication/RegisterHeader";

export const Route = createFileRoute("/_authentication/register")({
  component: RouteComponent
});

function RouteComponent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-100 via-rose-50 to-amber-100 px-4">
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm shadow-xl rounded-3xl p-8 border border-orange-100 space-y-6">
        <div className="flex items-start justify-between gap-6">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/login" })}
            className="text-lg text-slate-500 hover:text-slate-700 transition-colors"
          >
            ←
          </button>

          <div className="flex-1 space-y-5">
            <RegisterHeader />
            <RegisterForm />

            <p className="text-center text-xs text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-orange-700 hover:text-orange-800 underline-offset-2 underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
