/** Common vehicle manufacturers for fleet entry (Philippines + global brands). */
export const VEHICLE_MAKES = [
  'Alfa Romeo',
  'Audi',
  'BMW',
  'BYD',
  'Cadillac',
  'Chery',
  'Chevrolet',
  'Chrysler',
  'DFSK',
  'Dodge',
  'Fiat',
  'Ford',
  'Foton',
  'GAC',
  'Geely',
  'Hino',
  'Honda',
  'Hyundai',
  'Isuzu',
  'JAC',
  'Jaguar',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Maserati',
  'Maxus',
  'Mazda',
  'Mercedes-Benz',
  'MG',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Peugeot',
  'Porsche',
  'Renault',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
] as const;

export type VehicleMakeName = (typeof VEHICLE_MAKES)[number];

export function isValidVehicleMake(value: string): value is VehicleMakeName {
  return VEHICLE_MAKES.some((make) => make.toLowerCase() === value.trim().toLowerCase());
}

export function normalizeVehicleMake(value: string): VehicleMakeName | undefined {
  return VEHICLE_MAKES.find((make) => make.toLowerCase() === value.trim().toLowerCase());
}
