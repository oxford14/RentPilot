export const DEFAULT_VEHICLE_CATEGORIES = [
  'Sedan',
  'Hatchback',
  'SUV',
  'Crossover',
  'MPV',
  '7-Seater',
  'AUV',
  'Pickup',
  'Van',
  'Luxury',
] as const;

export type DefaultVehicleCategoryName = (typeof DEFAULT_VEHICLE_CATEGORIES)[number];

export const DEFAULT_VEHICLE_CATEGORY_SEED_KEY = 'vehicleCategoriesSeeded';
