import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FooterSettings } from '../types/database';

export function CustomFooter() {
  const [footer, setFooter] = useState<FooterSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFooter();
  }, []);

  useEffect(() => {
    if (footer?.custom_js && footer.is_enabled) {
      try {
        eval(footer.custom_js);
      } catch (error) {
        console.error('Error executing footer JS:', error);
      }
    }
  }, [footer]);

  const loadFooter = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .eq('is_enabled', true)
        .maybeSingle();

      if (error) throw error;

      setFooter(data);
    } catch (error) {
      console.error('Error loading footer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!footer || !footer.is_enabled) {
    return (
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">PetMeals</h3>
              <p className="text-gray-400">Nutritious meals for your beloved pets, delivered fresh daily.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/page/about-us" className="text-gray-400 hover:text-white">About Us</a></li>
                <li><a href="/page/privacy-policy" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="/page/terms-conditions" className="text-gray-400 hover:text-white">Terms & Conditions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">Email: info@petmeals.com</p>
              <p className="text-gray-400">Phone: +1 234 567 8900</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2026 PetMeals. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <>
      {footer.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: footer.custom_css }} />
      )}
      <div dangerouslySetInnerHTML={{ __html: footer.content }} />
    </>
  );
}
