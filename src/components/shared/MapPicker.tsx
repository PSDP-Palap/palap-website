import L from "leaflet";
// Fix Leaflet default icon issue in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents
} from "react-leaflet";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

interface MapPickerProps {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function LocationMarker({
  position,
  setPosition,
  onChange
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onChange(lat, lng);
    }
  });

  return position === null ? null : <Marker position={position} />;
}

const MapPicker = ({ lat, lng, onChange }: MapPickerProps) => {
  const [position, setPosition] = useState<[number, number]>(
    lat && lng ? [lat, lng] : DEFAULT_CENTER
  );

  useEffect(() => {
    if (!lat || !lng) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userPos: [number, number] = [
              pos.coords.latitude,
              pos.coords.longitude
            ];
            setPosition(userPos);
            onChange(userPos[0], userPos[1]);
          },
          (error) => {
            console.error("Error getting geolocation:", error);
          }
        );
      }
    }
  }, [lat, lng, onChange]);

  return (
    <div className="w-full h-75 rounded-2xl overflow-hidden border border-gray-100 shadow-inner z-0">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <ChangeView center={position} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={position}
          setPosition={setPosition}
          onChange={onChange}
        />
      </MapContainer>
    </div>
  );
};

export default MapPicker;
