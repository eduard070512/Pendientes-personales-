import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getUser()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
