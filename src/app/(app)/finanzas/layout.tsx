import { Suspense } from "react";
import { FinanceTabs } from "./tabs";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="h1 mb-4">Finanzas</h1>
      <Suspense>
        <FinanceTabs />
      </Suspense>
      {children}
    </>
  );
}
