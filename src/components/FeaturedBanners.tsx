import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface FeaturedBanner {
  id: string;
  title: string;
  content: string;
  custom_css: string;
  custom_js: string;
  position: 'below_header' | 'middle' | 'above_footer';
  display_order: number;
  is_enabled: boolean;
}

interface FeaturedBannersProps {
  position: 'below_header' | 'middle' | 'above_footer';
}

export function FeaturedBanners({ position }: FeaturedBannersProps) {
  const [banners, setBanners] = useState<FeaturedBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, [position]);

  useEffect(() => {
    banners.forEach((banner) => {
      if (banner.custom_js) {
        try {
          const script = document.createElement('script');
          script.textContent = banner.custom_js;
          script.id = `featured-banner-script-${banner.id}`;
          document.body.appendChild(script);
        } catch (error) {
          console.error('Error executing featured banner JS:', error);
        }
      }
    });

    return () => {
      banners.forEach((banner) => {
        const existingScript = document.getElementById(`featured-banner-script-${banner.id}`);
        if (existingScript) {
          existingScript.remove();
        }
      });
    };
  }, [banners]);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_banners')
        .select('*')
        .eq('position', position)
        .eq('is_enabled', true)
        .order('display_order');

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error loading featured banners:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <>
      {banners.map((banner) => (
        <div key={banner.id} className="featured-banner-wrapper">
          {banner.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: banner.custom_css }} />
          )}
          <div
            className="featured-banner"
            dangerouslySetInnerHTML={{ __html: banner.content }}
          />
        </div>
      ))}
    </>
  );
}
