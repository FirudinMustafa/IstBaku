'use client';

import * as React from 'react';
import { Label, Select } from './Input';
import { citiesOf, districtsOf, defaultCity, defaultDistrict } from '@/lib/data/locations';

interface Props {
  country: string;
  city: string;
  district: string;
  onCityChange: (city: string) => void;
  onDistrictChange: (d: string) => void;
  /** Ülke değiştiğinde otomatik şehir/ilçe set'lenir mi? Default true. */
  autoReset?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function LocationSelector({
  country, city, district, onCityChange, onDistrictChange, autoReset = true,
}: Props) {
  const cities = citiesOf(country);
  const districts = districtsOf(country, city);

  // Ülke değişince şehir/ilçe seçimini sıfırla (geçerli ülke için)
  React.useEffect(() => {
    if (!autoReset) return;
    const valid = cities.some((c) => c.name === city);
    if (!valid) {
      const nextCity = defaultCity(country);
      onCityChange(nextCity);
      onDistrictChange(defaultDistrict(country, nextCity));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // Şehir değişince ilçeyi resetle (mevcut ilçe yeni şehirde yoksa)
  React.useEffect(() => {
    if (!autoReset) return;
    if (!districts.includes(district)) {
      onDistrictChange(districts[0] ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  return (
    <>
      <div>
        <Label>Şehir</Label>
        <Select value={city} onChange={(e) => onCityChange(e.target.value)}>
          {cities.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>İlçe / Rayon</Label>
        <Select
          value={district}
          onChange={(e) => onDistrictChange(e.target.value)}
          disabled={districts.length === 0}
        >
          {districts.length === 0 ? (
            <option value="">— Şehir seç —</option>
          ) : (
            districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))
          )}
        </Select>
      </div>
    </>
  );
}
