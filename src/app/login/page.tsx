"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setPending(false);

    if (!response.ok) {
      setError("密码不正确");
      return;
    }

    router.replace(searchParams.get("next") || "/overview");
    router.refresh();
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-icon">
          <LockKeyhole size={22} />
        </div>
        <h1>Bili Stats</h1>
        <p>输入站点密码查看个人观看统计。</p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="SITE_PASSWORD"
          autoFocus
          required
        />
        {error ? <span className="form-error">{error}</span> : null}
        <button type="submit" disabled={pending}>
          {pending ? "验证中..." : "进入仪表盘"}
        </button>
      </form>
    </main>
  );
}
