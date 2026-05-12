import { signIn } from "./actions";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="bg-cream grid min-h-screen place-items-center px-6 py-10">
      <form
        action={signIn}
        className="border-line bg-paper w-full max-w-sm border-[1.5px] p-6"
        style={{ boxShadow: "5px 5px 0 var(--color-blue)" }}
      >
        <h1 className="font-display text-[28px] leading-none italic">
          Admin sign in
          <span className="text-mute-500 mt-1 block font-mono text-[10px] tracking-[0.2em] uppercase not-italic">
            CD Smart Campus · เข้าสู่ระบบ
          </span>
        </h1>

        <input type="hidden" name="next" value={next ?? "/admin"} />

        <label className="mt-5 block">
          <span className="text-mute-500 font-mono text-[9px] tracking-[0.14em] uppercase">
            Email · อีเมล
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="border-ink bg-cream focus:outline-blue mt-1 block w-full border-[1.2px] px-2.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-mute-500 font-mono text-[9px] tracking-[0.14em] uppercase">
            Password · รหัสผ่าน
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="border-ink bg-cream focus:outline-blue mt-1 block w-full border-[1.2px] px-2.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="border-house-pink bg-house-pink/10 text-house-pink mt-3 border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="border-line bg-blue font-display mt-5 w-full border-[1.5px] px-4 py-2.5 text-[19px] text-white italic [box-shadow:4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:5px_5px_0_var(--color-ink)]"
        >
          Sign in →
        </button>
      </form>
    </main>
  );
}
