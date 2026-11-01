import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ConfirmButton } from "@/components/client";
import { Badge, PageHeader, Section } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/dates";
import { logoutEverywhere, revokeToken } from "./actions";
import { DeleteAccountForm, PasswordForm, ProfileForm, TokenBox } from "./forms";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireUser();
  const [extra] = await db.select({ apiTokenHash: users.apiTokenHash, createdAt: users.createdAt }).from(users).where(eq(users.id, user.id));

  return (
    <>
      <PageHeader
        title="Mi cuenta"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {user.email}
            <Badge tone={user.plan === "free" ? "gray" : "violet"}>Plan {user.plan === "free" ? "gratis" : user.plan}</Badge>
            <span>· desde {fmtDate(extra.createdAt.toISOString().slice(0, 10), true)}</span>
          </span>
        }
      />

      <Section title="Perfil">
        <ProfileForm name={user.name} bio={user.bio} />
      </Section>

      <Section title="Contraseña">
        <PasswordForm />
      </Section>

      <Section title="Token para n8n">
        <div className="card space-y-3 text-sm">
          <p className="muted">
            Para que n8n mande tus correos de Classroom o sincronice tu cuenta, usa este token en el encabezado <code>Authorization: Bearer pp_…</code>.
          </p>
          <div>{extra.apiTokenHash ? <Badge tone="green">Token activo</Badge> : <Badge>Sin token</Badge>}</div>
          <TokenBox hasToken={Boolean(extra.apiTokenHash)} />
          {extra.apiTokenHash && (
            <form action={revokeToken}>
              <ConfirmButton message="¿Desactivar el token? n8n dejará de poder enviar datos.">Desactivar token</ConfirmButton>
            </form>
          )}
        </div>
      </Section>

      <Section title="Sesiones">
        <form action={logoutEverywhere} className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="muted">¿Dejaste la sesión abierta en otro lado? Ciérrala en todos tus dispositivos.</span>
          <ConfirmButton message="¿Cerrar sesión en todos los dispositivos, incluido este?" className="btn-secondary">
            Cerrar sesión en todos lados
          </ConfirmButton>
        </form>
      </Section>

      <Section title="Zona peligrosa">
        <div className="card border-red-200 dark:border-red-900">
          <DeleteAccountForm />
        </div>
      </Section>
    </>
  );
}
