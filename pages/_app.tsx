import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { SiteProvider } from '@/lib/site-context';
import { useTrackVisit } from '@/lib/use-stats';
import '../styles/globals.css';

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // 自动跟踪页面访问
  useTrackVisit(router.asPath);

  return <Component {...pageProps} />;
}

export default function App(props: AppProps) {
  return (
    <SiteProvider>
      <AppContent {...props} />
    </SiteProvider>
  );
}

