import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";

const RegisterForm = () => {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!agree) {
      setError("Please agree to the terms of service and privacy policy.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error: signUpError } = await signUp(email, password);

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    setSuccess("Account created. Please check your email to confirm.");
    setTimeout(() => {
      router.navigate({ to: "/login" });
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
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

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-[11px] text-slate-600 underline underline-offset-2 cursor-pointer">
        <input
          type="checkbox"
          id="agree"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="h-3 w-3 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
        />
        <span>i agree to the terms of service and privacy policy</span>
      </label>

      {error ? <p className="text-red-500 text-xs mt-1">{error}</p> : null}
      {success ? (
        <p className="text-green-600 text-xs mt-1">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-1 inline-flex justify-center rounded-xl bg-linear-to-r from-orange-400 to-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
};

export default RegisterForm;
