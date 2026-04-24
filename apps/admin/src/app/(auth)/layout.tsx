export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      {children}
    </div>
  );
}
