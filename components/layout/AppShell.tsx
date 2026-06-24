import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AppShellProps {
  children: React.ReactNode;
  user?: { email: string } | null;
  className?: string;
}

export function AppNavbar({ user }: { user?: { email: string } | null }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-primary text-xs font-bold text-primary-foreground">
            J
          </span>
          <span>JWT 认证系统</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">仪表盘</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">登出</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">注册</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export interface SidebarNavItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AppSidebarProps {
  items: SidebarNavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppSidebar({ items, activeTab, onTabChange }: AppSidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-muted/20 md:block">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">导航</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onTabChange(item.value)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeTab === item.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

interface AppTabsProps {
  tabs: SidebarNavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

/** 移动端横向 Tab（shadcn TabsList 风格） */
export function AppTabs({ tabs, activeTab, onTabChange }: AppTabsProps) {
  return (
    <div className="border-b bg-muted/40 md:hidden">
      <div className="container max-w-screen-2xl overflow-x-auto py-2">
        <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
                activeTab === tab.value
                  ? 'bg-background text-foreground shadow'
                  : 'hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  user?: { email: string } | null;
  sidebarItems: SidebarNavItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

/** shadcn 风格：顶栏 + 左侧边栏 + 主内容 */
export function DashboardShell({
  children,
  user,
  sidebarItems,
  activeTab,
  onTabChange,
}: DashboardShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <AppNavbar user={user} />
      <AppTabs tabs={sidebarItems} activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex flex-1">
        <AppSidebar items={sidebarItems} activeTab={activeTab} onTabChange={onTabChange} />
        <main className="flex-1 overflow-auto">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children, user, className }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <AppNavbar user={user} />
      <main className={cn('flex-1', className)}>{children}</main>
    </div>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('container max-w-screen-2xl py-6 md:py-8', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground md:text-base">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function LoadingState({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function SectionDivider() {
  return <Separator className="my-6" />;
}
