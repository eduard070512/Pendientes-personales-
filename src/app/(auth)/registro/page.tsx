import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { RegisterForm } from "../forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function Page() {
  if (await getUser()) redirect("/");
  return <RegisterForm />;
}
