import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AnnouncementBarData {
  id: string;
  content: string;
  custom_css: string;
  custom_js: string;
  is_enabled: boolean;
}

export function AnnouncementBar() {
  const [announcementBar, setAnnouncementBar] = useState<AnnouncementBarData | null>(null);

  useEffect(() => {
    loadAnnouncementBar();
  }, []);

  useEffect(() => {
    if (announcementBar?.custom_js) {
      try {
        const script = document.createElement('script');
        script.textContent = announcementBar.custom_js;
        script.id = 'announcement-bar-script';
        document.body.appendChild(script);

        return () => {
          const existingScript = document.getElementById('announcement-bar-script');
          if (existingScript) {
            existingScript.remove();
          }
        };
      } catch (error) {
        console.error('Error executing announcement bar JS:', error);
      }
    }
  }, [announcementBar?.custom_js]);

  const loadAnnouncementBar = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_bar')
        .select('*')
        .eq('is_enabled', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAnnouncementBar(data);
    } catch (error) {
      console.error('Error loading announcement bar:', error);
    }
  };

  if (!announcementBar || !announcementBar.is_enabled) {
    return null;
  }

  return (
    <>
      {announcementBar.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: announcementBar.custom_css }} />
      )}
      <div
        className="announcement-bar w-full"
        dangerouslySetInnerHTML={{ __html: announcementBar.content }}
      />
    </>
  );
}
