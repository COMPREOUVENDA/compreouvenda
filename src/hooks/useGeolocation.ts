'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const supabase = createClient();

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  error: string | null;
  loading: boolean;
  granted: boolean;
}

const STORAGE_KEY = 'compreouvenda_geo';

export function useGeolocation() {
  const { user } = useAuthStore();
  const [state, setState] = useState<GeolocationState>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { latitude: null, longitude: null, city: null, state: null, error: null, loading: false, granted: false };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (state.latitude && state.longitude) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Reverse geocoding (free API)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
        headers: { 'Accept-Language': 'pt-BR' }
      });
      const data = await resp.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || 'Cidade não identificada';
      const stateAbbr = addr.state || '';
      return { city, state: stateAbbr };
    } catch {
      return { city: null, state: null };
    }
  }, []);

  // Request location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocalização não suportada neste navegador' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geo = await reverseGeocode(latitude, longitude);

        const newState: GeolocationState = {
          latitude,
          longitude,
          city: geo.city,
          state: geo.state,
          error: null,
          loading: false,
          granted: true,
        };
        setState(newState);

        // Update user profile in Supabase
        if (user) {
          await supabase
            .from('users')
            .update({
              location_lat: latitude,
              location_lng: longitude,
              city: geo.city,
              state: geo.state,
            })
            .eq('id', user.id);
        }
      },
      (error) => {
        let msg = 'Erro ao obter localização';
        switch (error.code) {
          case 1: msg = 'Permissão de localização negada'; break;
          case 2: msg = 'Localização indisponível'; break;
          case 3: msg = 'Tempo esgotado ao obter localização'; break;
        }
        setState(s => ({ ...s, error: msg, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, [user, reverseGeocode]);

  // Watch position (continuous tracking)
  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) return null;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setState({
          latitude, longitude,
          city: geo.city, state: geo.state,
          error: null, loading: false, granted: true,
        });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 }
    );
    return watchId;
  }, [reverseGeocode]);

  // Calculate distance between two points (Haversine)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Get distance from user to a point
  const getDistanceTo = useCallback((lat: number, lng: number): number | null => {
    if (!state.latitude || !state.longitude) return null;
    return calculateDistance(state.latitude, state.longitude, lat, lng);
  }, [state.latitude, state.longitude, calculateDistance]);

  // Get location display string
  const locationLabel = state.city && state.state
    ? `${state.city}, ${state.state}`
    : state.latitude
      ? `${state.latitude.toFixed(4)}, ${state.longitude?.toFixed(4)}`
      : 'Localização não definida';

  return {
    ...state,
    locationLabel,
    requestLocation,
    watchLocation,
    getDistanceTo,
    calculateDistance,
  };
}
