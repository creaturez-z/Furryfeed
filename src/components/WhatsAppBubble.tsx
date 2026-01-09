import { useState, useEffect } from 'react';
import { MessageCircle, X, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WhatsAppConfig {
  enabled: boolean;
  phone_number: string;
  display_text: string;
  default_message: string;
  position: 'bottom-right' | 'bottom-left';
  show_on_customer: boolean;
  show_on_kitchen: boolean;
}

interface WhatsAppBubbleProps {
  pageType: 'customer' | 'kitchen';
}

export function WhatsAppBubble({ pageType }: WhatsAppBubbleProps) {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !config) return null;

  if (!config.enabled) return null;

  if (pageType === 'customer' && !config.show_on_customer) return null;
  if (pageType === 'kitchen' && !config.show_on_kitchen) return null;

  const handleClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const phoneNumber = config.phone_number.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(config.default_message);

    const url = isMobile
      ? `whatsapp://send?phone=${phoneNumber}&text=${message}`
      : `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    window.open(url, '_blank');
  };

  const positionClasses = config.position === 'bottom-right'
    ? 'right-4 sm:right-6'
    : 'left-4 sm:left-6';

  return (
    <>
      <div
        className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 flex flex-col items-end space-y-2`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {isExpanded && config.display_text && (
          <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs animate-fadeIn border border-gray-200">
            <div className="flex items-start justify-between space-x-2">
              <p className="text-sm text-gray-700">{config.display_text}</p>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {config.display_text && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all border-2 border-gray-100"
              aria-label="Toggle info"
            >
              <Info className="w-5 h-5 text-gray-600" />
            </button>
          )}

          <button
            onClick={handleClick}
            className="group relative bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 border-2 border-green-400"
            aria-label="Open WhatsApp chat"
          >
            <MessageCircle className="w-6 h-6" />

            {config.display_text && (
              <span className="hidden sm:block absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-200">
                {config.display_text}
              </span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        @supports (padding: env(safe-area-inset-bottom)) {
          .safe-area-padding {
            padding-bottom: calc(1rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </>
  );
}
