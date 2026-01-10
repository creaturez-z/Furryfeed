import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface SectionLayout {
  id: string;
  section_name: 'all_meals' | 'featured_collections';
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export function SectionOrderManagement() {
  const [sections, setSections] = useState<SectionLayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from('section_layout')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (section: SectionLayout) => {
    try {
      const { error } = await supabase
        .from('section_layout')
        .update({
          is_visible: !section.is_visible,
          updated_at: new Date().toISOString()
        })
        .eq('id', section.id);

      if (error) throw error;
      await loadSections();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to toggle section visibility');
    }
  };

  const handleMoveUp = async (section: SectionLayout) => {
    const currentIndex = sections.findIndex(s => s.id === section.id);
    if (currentIndex <= 0) return;

    const prevSection = sections[currentIndex - 1];

    try {
      await supabase
        .from('section_layout')
        .update({
          display_order: prevSection.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', section.id);

      await supabase
        .from('section_layout')
        .update({
          display_order: section.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', prevSection.id);

      await loadSections();
    } catch (error) {
      console.error('Error moving section:', error);
      alert('Failed to move section');
    }
  };

  const handleMoveDown = async (section: SectionLayout) => {
    const currentIndex = sections.findIndex(s => s.id === section.id);
    if (currentIndex >= sections.length - 1) return;

    const nextSection = sections[currentIndex + 1];

    try {
      await supabase
        .from('section_layout')
        .update({
          display_order: nextSection.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', section.id);

      await supabase
        .from('section_layout')
        .update({
          display_order: section.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', nextSection.id);

      await loadSections();
    } catch (error) {
      console.error('Error moving section:', error);
      alert('Failed to move section');
    }
  };

  const getSectionLabel = (sectionName: string) => {
    switch (sectionName) {
      case 'all_meals': return 'All Meals';
      case 'featured_collections': return 'Featured Collections';
      default: return sectionName;
    }
  };

  const getSectionDescription = (sectionName: string) => {
    switch (sectionName) {
      case 'all_meals': return 'Complete catalog of all available meals';
      case 'featured_collections': return 'Curated banners showcasing special meal collections';
      default: return '';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Section Order</h2>
        <p className="text-gray-600">
          Control the order of major sections on the landing page. Drag sections to reorder them.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="divide-y">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`p-6 ${!section.is_visible ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 w-8">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold flex items-center space-x-2">
                        <span>{getSectionLabel(section.section_name)}</span>
                        {!section.is_visible && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                            Hidden
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {getSectionDescription(section.section_name)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleVisibility(section)}
                    className="p-2 text-gray-600 hover:text-blue-600"
                    title={section.is_visible ? 'Hide Section' : 'Show Section'}
                  >
                    {section.is_visible ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleMoveUp(section)}
                    className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                    disabled={index === 0}
                    title="Move Up"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleMoveDown(section)}
                    className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                    disabled={index === sections.length - 1}
                    title="Move Down"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Section Ordering Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sections appear in the order shown above (top to bottom)</li>
          <li>• Use the up/down arrows to change section order</li>
          <li>• Hide sections to temporarily remove them from the landing page</li>
          <li>• Changes are immediately visible to customers</li>
        </ul>
      </div>
    </div>
  );
}
