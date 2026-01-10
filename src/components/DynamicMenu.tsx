import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MenuItem } from '../types/database';
import { ChevronDown } from 'lucide-react';

interface DynamicMenuProps {
  isMobile?: boolean;
}

export function DynamicMenu({ isMobile = false }: DynamicMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('created_at');

      if (error) throw error;

      const filteredItems = (data || []).filter(item => {
        if (isMobile) {
          return item.device_visibility === 'mobile' || item.device_visibility === 'both';
        } else {
          return item.device_visibility === 'desktop' || item.device_visibility === 'both';
        }
      });

      setMenuItems(filteredItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const getMenuHierarchy = () => {
    const topLevel = menuItems.filter(item => !item.parent_id);
    return topLevel.map(parent => ({
      ...parent,
      children: menuItems.filter(item => item.parent_id === parent.id).map(child => ({
        ...child,
        children: menuItems.filter(item => item.parent_id === child.id)
      }))
    }));
  };

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const hierarchy = getMenuHierarchy();

  if (hierarchy.length === 0) return null;

  return (
    <nav className={isMobile ? 'flex flex-col space-y-2' : 'flex items-center space-x-6'}>
      {hierarchy.map((item) => {
        const hasChildren = 'children' in item && item.children.length > 0;

        return (
          <div key={item.id} className="relative group">
            {hasChildren ? (
              <button
                onClick={() => toggleMenu(item.id)}
                className="flex items-center space-x-1 text-gray-700 hover:text-orange-500 transition-colors"
              >
                <span>{item.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openMenus[item.id] ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <Link
                to={item.url}
                className="text-gray-700 hover:text-orange-500 transition-colors"
              >
                {item.label}
              </Link>
            )}

            {hasChildren && (openMenus[item.id] || !isMobile) && (
              <div className={isMobile
                ? 'ml-4 mt-2 space-y-2'
                : 'absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all'
              }>
                {'children' in item && item.children.map((child: MenuItem) => (
                  <div key={child.id}>
                    <Link
                      to={child.url}
                      className={isMobile
                        ? 'block text-gray-600 hover:text-orange-500 transition-colors'
                        : 'block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors'
                      }
                    >
                      {child.label}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
