import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, Users, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_NAME = 'Launch';
const TAGLINE = '从想法到上线，更简单';

const features = [
  {
    icon: Zap,
    title: '自动化工作流',
    desc: '配置一次，持续运行。构建、测试、部署自动串联，减少重复操作。',
  },
  {
    icon: Users,
    title: '实时协作',
    desc: '评论、任务与状态同步更新，团队信息一致，沟通成本更低。',
  },
  {
    icon: Rocket,
    title: '一键部署',
    desc: '连接仓库即可发布。支持预览与环境切换，发布更安全可控。',
  },
];

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{PRODUCT_NAME} — {TAGLINE}</title>
        <meta name="description" content={`${PRODUCT_NAME} 帮助团队更快交付产品。自动化工作流、实时协作、一键部署。`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all',
          navScrolled ? 'border-b bg-background/95 backdrop-blur' : 'bg-transparent'
        )}
      >
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/landing" className="text-lg font-semibold">{PRODUCT_NAME}</Link>
          <nav className="flex items-center gap-4">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">功能</Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">登录</Link>
            <Button size="sm" asChild>
              <Link href="/register">免费开始</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container max-w-screen-2xl py-20 md:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <Badge variant="secondary" className="px-3 py-1">现已开放注册</Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              为现代团队打造的{' '}
              <span className="text-muted-foreground">智能工作台</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              自动化流程、实时协作与一键部署，让交付更可控。无需复杂配置，几分钟即可上手。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  免费试用 <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">了解功能</Link>
              </Button>
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <CardContent className="space-y-3 p-6">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-16 rounded-lg bg-muted" />
                <div className="h-16 rounded-lg bg-muted" />
                <div className="h-16 rounded-lg bg-muted" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="features" className="border-t bg-muted/30 py-20">
        <div className="container max-w-screen-2xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">功能</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">你需要的，都在这里</h2>
            <p className="mt-2 text-muted-foreground">从协作到发布，一个平台覆盖完整工作流。</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-screen-2xl">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <h2 className="text-3xl font-bold">准备好加速交付了吗？</h2>
              <p className="max-w-lg text-primary-foreground/80">
                加入数千团队，用 {PRODUCT_NAME} 更高效地交付产品。无需信用卡即可开始。
              </p>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">
                  免费开始 <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex max-w-screen-2xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-semibold">{PRODUCT_NAME}</span>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">登录</Link>
            <Link href="/register" className="hover:text-foreground">注册</Link>
            <Link href="/" className="hover:text-foreground">控制台</Link>
          </div>
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
