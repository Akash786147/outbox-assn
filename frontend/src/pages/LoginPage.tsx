import { useState, type FormEvent } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/api/client";
import { useGoogleAuth, usePasswordLogin } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const googleAuth = useGoogleAuth();
  const passwordLogin = usePasswordLogin();
  const onError = (err: unknown) => toast.error(getErrorMessage(err));

  // auth-code flow: Google returns a code and the backend exchanges + verifies it
  const startGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: ({ code }) => googleAuth.mutate(code, { onError }),
    onError: () => toast.error("Google login failed"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    passwordLogin.mutate({ email, password }, { onError });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[552px] rounded-2xl border border-line px-8 py-14 sm:px-16">
        <h1 className="mb-8 text-center text-[44px] font-semibold">Login</h1>

        <Button
          variant="soft"
          className="w-full py-3.5"
          loading={googleAuth.isPending}
          onClick={() => startGoogleLogin()}
        >
          <GoogleIcon />
          Login with Google
        </Button>

        <div className="my-8 flex items-center gap-5 text-sm text-muted">
          <span className="h-px flex-1 bg-line" />
          or sign up through email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <Input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <Button type="submit" className="mt-4 w-full py-3.5" loading={passwordLogin.isPending}>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
