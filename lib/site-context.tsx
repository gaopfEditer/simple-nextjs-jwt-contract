import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface SiteContextType {
  currentSiteId: string;
  setCurrentSiteId: (siteId: string) => void;
  sites: Array<{ siteId: string; totalVisits: number; uniqueVisitors: number; lastVisitAt: Date | null }>;
  loading: boolean;
  refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [currentSiteId, setCurrentSiteIdState] = useState<string>('local');
  const [sites, setSites] = useState<Array<{ siteId: string; totalVisits: number; uniqueVisitors: number; lastVisitAt: Date | null }>>([]);
  const [loading, setLoading] = useState(true);

  // 从 localStorage 恢复选中的站点
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedSiteId');
      if (saved) {
        setCurrentSiteIdState(saved);
      }
    }
  }, []);

  // 获取站点列表
  const refreshSites = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stats/sites');
      setSites(response.data.sites);
    } catch (error) {
      console.error('获取站点列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载站点列表
  useEffect(() => {
    refreshSites();
  }, []);

  // 保存选中的站点到 localStorage
  const setCurrentSiteId = (siteId: string) => {
    setCurrentSiteIdState(siteId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedSiteId', siteId);
    }
  };

  return (
    <SiteContext.Provider
      value={{
        currentSiteId,
        setCurrentSiteId,
        sites,
        loading,
        refreshSites,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}

