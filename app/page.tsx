"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-10 py-12">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Compot</h1>
        <div className="flex flex-col gap-3 text-sm">
          <Link
            href="/new"
            className="w-fit rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
          >
            Создать новое предложение
          </Link>
          <Link
            href="/all"
            className="w-fit rounded border border-zinc-200 bg-white px-4 py-2 text-zinc-900 hover:border-zinc-300"
          >
            Все предложения
          </Link>
        </div>
      </div>
    </div>
  );
}
