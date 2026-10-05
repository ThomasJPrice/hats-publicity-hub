import { loginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-brand">HATS Publicity Hub</h1>
      <p className="mb-4 text-sm text-stone-500">Panto 2027: The Wizard of Oz</p>
      <form action={loginAction} className="card space-y-3">
        <div>
          <label className="label" htmlFor="password">
            Passcode
          </label>
          <input id="password" name="password" type="password" autoFocus required className="input" />
        </div>
        {error && <p className="text-sm text-red-700">That passcode wasn&apos;t right.</p>}
        <button className="btn btn-primary w-full">Sign in</button>
      </form>
    </main>
  );
}
