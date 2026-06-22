import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AppShellProps {
  children: React.ReactNode;
  user?: { email: string } | null;
  className?: string;
}

export function AppNavbar({ user }: { user?: { email: string } | null }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2 font-semibold">
          <span>JWT 认证系统</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          {user ? (
            <>
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

interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AppTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppTabs({ tabs, activeTab, onTabChange }: AppTabsProps) {
  return (
    <div className="border-b bg-muted/40">
      <div className="container max-w-screen-2xl">
        <nav className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function AppShell({ children, user, className }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
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
    <div className={cn('container max-w-screen-2xl py-6', className)}>
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
