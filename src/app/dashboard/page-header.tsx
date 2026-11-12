/** แถบหัวหน้าแบบ breadcrumb ของทุกหน้าใน dashboard */
export function PageHeader({ title }: { title: string }) {
  return (
    <header
      data-testid="page-header"
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b bg-background/80 px-6 text-sm backdrop-blur"
    >
      <span className="text-muted-foreground">KORTANGNOI</span>
      <span className="mx-2 text-muted-foreground">/</span>
      <span>{title}</span>
    </header>
  );
}
