import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeroBanner {
  id: string;
  title: string;
  type: 'image' | 'html' | 'video';
  content: string;
  is_active: boolean;
  display_order: number;
  auto_play: boolean;
  slide_duration: number;
  enable_animation: boolean;
  show_controls: boolean;
  show_indicators: boolean;
  animation_type: 'slide' | 'fade' | 'zoom' | 'none';
  slide_direction: 'left' | 'right' | 'top' | 'bottom';
}

export default function HeroSection() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setBanners(data || []);
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  };

  useEffect(() => {
    if (banners.length <= 1 || !isAutoPlaying) return;

    const currentBanner = banners[currentIndex];
    if (!currentBanner?.auto_play) return;

    const interval = setInterval(() => {
      handleTransition((prev) => (prev + 1) % banners.length);
    }, currentBanner.slide_duration || 5000);

    return () => clearInterval(interval);
  }, [banners, currentIndex, isAutoPlaying]);

  const handleTransition = (getNewIndex: (prev: number) => number) => {
    const currentBanner = banners[currentIndex];
    if (currentBanner?.enable_animation) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(getNewIndex);
        setIsTransitioning(false);
      }, 500);
    } else {
      setCurrentIndex(getNewIndex);
    }
  };

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    handleTransition((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    handleTransition((prev) => (prev + 1) % banners.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    handleTransition(() => index);
  };

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const getAnimationClasses = () => {
    if (!currentBanner.enable_animation || currentBanner.animation_type === 'none') {
      return '';
    }

    const baseTransition = 'transition-all duration-500';

    if (isTransitioning) {
      switch (currentBanner.animation_type) {
        case 'fade':
          return `${baseTransition} opacity-0`;
        case 'zoom':
          return `${baseTransition} opacity-0 scale-110`;
        case 'slide':
          switch (currentBanner.slide_direction) {
            case 'left':
              return `${baseTransition} -translate-x-full opacity-0`;
            case 'right':
              return `${baseTransition} translate-x-full opacity-0`;
            case 'top':
              return `${baseTransition} -translate-y-full opacity-0`;
            case 'bottom':
              return `${baseTransition} translate-y-full opacity-0`;
            default:
              return `${baseTransition} -translate-x-full opacity-0`;
          }
        default:
          return baseTransition;
      }
    }

    switch (currentBanner.animation_type) {
      case 'fade':
        return `${baseTransition} opacity-100`;
      case 'zoom':
        return `${baseTransition} opacity-100 scale-100`;
      case 'slide':
        return `${baseTransition} translate-x-0 translate-y-0 opacity-100`;
      default:
        return '';
    }
  };

  const renderBannerContent = () => {
    const animationClasses = getAnimationClasses();

    if (currentBanner.type === 'image') {
      return (
        <img
          key={currentBanner.id}
          src={currentBanner.content}
          alt={currentBanner.title}
          className={`w-full h-full object-cover ${animationClasses}`}
        />
      );
    }

    if (currentBanner.type === 'video') {
      return (
        <video
          key={currentBanner.id}
          src={currentBanner.content}
          className={`w-full h-full object-cover ${animationClasses}`}
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }

    if (currentBanner.type === 'html') {
      return (
        <iframe
          key={currentBanner.id}
          srcDoc={currentBanner.content}
          className={`w-full h-full border-0 ${animationClasses}`}
          title={currentBanner.title}
          sandbox="allow-scripts allow-same-origin"
        />
      );
    }

    return null;
  };

  return (
    <div className="relative w-full bg-gray-900 overflow-hidden">
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px]">
        {renderBannerContent()}

        {banners.length > 1 && currentBanner.show_controls && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all backdrop-blur-sm z-10"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all backdrop-blur-sm z-10"
              aria-label="Next banner"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {banners.length > 1 && currentBanner.show_indicators && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6 md:w-8'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
