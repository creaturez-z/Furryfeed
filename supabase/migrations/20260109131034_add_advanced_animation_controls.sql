/*
  # Add Advanced Animation Controls to Hero Banners

  1. Changes to `hero_banners` table
    - Add `animation_type` (text) - Type of animation: 'slide', 'fade', 'zoom', 'none'
    - Add `slide_direction` (text) - Direction for slide animation: 'left', 'right', 'top', 'bottom'
  
  2. Notes
    - Default animation type is 'slide' for backward compatibility
    - Default slide direction is 'left' (left to right)
    - These settings work together with existing animation controls
    - Animation type 'none' disables all transitions
*/

-- Add animation_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hero_banners' AND column_name = 'animation_type'
  ) THEN
    ALTER TABLE hero_banners ADD COLUMN animation_type text DEFAULT 'slide';
  END IF;
END $$;

-- Add slide_direction column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hero_banners' AND column_name = 'slide_direction'
  ) THEN
    ALTER TABLE hero_banners ADD COLUMN slide_direction text DEFAULT 'left';
  END IF;
END $$;

-- Add check constraint for animation_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hero_banners_animation_type_check'
  ) THEN
    ALTER TABLE hero_banners 
    ADD CONSTRAINT hero_banners_animation_type_check 
    CHECK (animation_type IN ('slide', 'fade', 'zoom', 'none'));
  END IF;
END $$;

-- Add check constraint for slide_direction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hero_banners_slide_direction_check'
  ) THEN
    ALTER TABLE hero_banners 
    ADD CONSTRAINT hero_banners_slide_direction_check 
    CHECK (slide_direction IN ('left', 'right', 'top', 'bottom'));
  END IF;
END $$;
