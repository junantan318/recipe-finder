"use client";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {

  return (
    <>
      <main className="p-4 mt-20">{children}</main>
    </>
  );
}
