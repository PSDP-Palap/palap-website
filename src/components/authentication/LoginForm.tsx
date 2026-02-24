import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";

const LoginForm = () => {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    setSubmitting(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    router.navigate({ to: "/" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          placeholder="example@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
          />
          <span>Remember</span>
        </label>
        <Link
          to="/register"
          className="underline hover:text-slate-700 transition-colors"
        >
          Forget password?
        </Link>
      </div>

      {error ? (
        <p className="text-red-500 text-xs mt-1 text-center">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-2 inline-flex justify-center rounded-xl bg-linear-to-r from-orange-400 to-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
};

export default LoginForm;

