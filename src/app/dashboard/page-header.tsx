/** แถบหัวหน้าแบบ breadcrumb ของทุกหน้าใน dashboard */
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center border-b px-6 text-sm">
      <span className="text-muted-foreground">KORTANGNOI</span>
      <span className="mx-2 text-muted-foreground">/</span>
      <span>{title}</span>
    </header>
  );
}
