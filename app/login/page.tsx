import { signIn } from "./actions";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-10">
      <form
        action={signIn}
        className="w-full max-w-sm border-[1.5px] border-line bg-paper p-6"
        style={{ boxShadow: "5px 5px 0 var(--color-blue)" }}
      >
        <h1 className="font-display italic text-[28px] leading-none">
          Admin sign in
          <span className="mt-1 block font-mono text-[10px] not-italic uppercase tracking-[0.2em] text-mute-500">
            CD Smart Campus · เข้าสู่ระบบ
          </span>
        </h1>

        <input type="hidden" name="next" value={next ?? "/admin"} />

        <label className="mt-5 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute-500">
            Email · อีเมล
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 block w-full border-[1.2px] border-ink bg-cream px-2.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue"
          />
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute-500">
            Password · รหัสผ่าน
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full border-[1.2px] border-ink bg-cream px-2.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 border border-house-pink bg-house-pink/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-house-pink"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-5 w-full border-[1.5px] border-line bg-blue px-4 py-2.5 font-display italic text-[19px] text-white [box-shadow:4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:5px_5px_0_var(--color-ink)]"
        >
          Sign in →
        </button>
      </form>
    </main>
  );
}
