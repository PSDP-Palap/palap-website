import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import supabase from "@/utils/supabase";

const LoginForm = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error.message);
      return { error: error.message };
    }

    return {};
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError);
        return;
      }

      router.navigate({ to: "/" });
    } catch {
      setError("ไม่สามารถล็อกอินได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
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
          to="/sign-up"
          className="underline hover:text-slate-700 transition-colors"
        >
          Create account
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
