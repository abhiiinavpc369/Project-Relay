import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="panel w-full max-w-lg rounded-2xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-[#ffd447]">Project Relay</p>
        <h1 className="mt-3 text-5xl font-bold">404</h1>
        <p className="mt-3 text-slate-300">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="btn btn-blue mt-6 inline-flex items-center justify-center px-5 py-2 text-sm"
        >
          Go Home
        </Link>
      </section>
    </main>
  );
}
