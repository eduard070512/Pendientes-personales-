import type { Metadata } from "next";
import { RecoverForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Page() {
  return <RecoverForm />;
}
