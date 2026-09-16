"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const LIBRARIES: "places"[] = ["places"];
const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }; // Cairo — just a sane default map center

export interface LocationValue {
  address: string;
  lat?: number;
  lng?: number;
}

/**
 * Falls back to a plain text address field when GOOGLE_MAPS_API_KEY
 * isn't configured — Maps is a real, billed third-party dependency a
 * buyer sets up separately, and a core booking flow shouldn't be fully
 * blocked until they do. Backend only requires the address string
 * either way (see bookings.ts); lat/lng are an enhancement, not a
 * requirement.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const t = useTranslations("booking");

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <input
        required
        placeholder={t("addressPlaceholder")}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
      />
    );
  }

  return <MapLocationPicker value={value} onChange={onChange} />;
}

function MapLocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const t = useTranslations("booking");
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const geocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ location: { lat, lng } });
    return result.results[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }, []);

  const handlePin = useCallback(
    async (lat: number, lng: number) => {
      setCenter({ lat, lng });
      const address = await geocode(lat, lng);
      onChange({ address, lat, lng });
    },
    [geocode, onChange],
  );

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat === undefined || lng === undefined) return;
    void handlePin(lat, lng);
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat === undefined || lng === undefined) return;
    void handlePin(lat, lng);
  };

  const handlePlaceChanged = () => {
    const place = autocomplete?.getPlace();
    const lat = place?.geometry?.location?.lat();
    const lng = place?.geometry?.location?.lng();
    if (lat === undefined || lng === undefined) return;
    setCenter({ lat, lng });
    onChange({ address: place?.formatted_address ?? value.address, lat, lng });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      void handlePin(pos.coords.latitude, pos.coords.longitude);
    });
  };

  if (!isLoaded) {
    return <div className="h-[220px] animate-pulse rounded-xl bg-line/20" />;
  }

  return (
    <div className="space-y-2">
      <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceChanged}>
        <input
          placeholder={t("searchAddressPlaceholder")}
          defaultValue={value.address}
          className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      </Autocomplete>
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="text-xs font-medium text-accent hover:underline"
      >
        {t("useCurrentLocation")}
      </button>
      <div className="overflow-hidden rounded-xl border border-line">
        <GoogleMap center={center} zoom={14} mapContainerStyle={{ width: "100%", height: "220px" }} onClick={handleMapClick}>
          {value.lat !== undefined && value.lng !== undefined && (
            <Marker position={{ lat: value.lat, lng: value.lng }} draggable onDragEnd={handleMarkerDragEnd} />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
