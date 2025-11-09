import { useEffect, useRef } from "react";
import maplibregl, { Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";


export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current, // ID of the element to append the map to
      style: {
        version: 8,
        sources: {
          "my-vector-source": {
            type: "vector",
            url: "http://game.crayfish-musical.ts.net:3000/southern-zone-shortbread-1.0", // Replace with your vector URL
          },
        },
        layers: [
          {
            id: "layer-id", // Unique ID for the layer
            type: "line", // Layer type can be 'fill', 'line', or 'symbol'
            source: "my-vector-source",
            "source-layer": "streets", // Replace with your source layer name
            layout: {},
          },
        ],
      },
      center: [77.5946, 12.9716], // Center of the map [longitude, latitude]
      zoom: 10, // Initial zoom level
    });

    let marker = new Marker()
      .setPopup(new Popup().setHTML("<p>Shishir<p/>"))
      .setLngLat([77.5946, 12.9716])
      .addTo(map);

    let marker2 = new Marker()
      .setPopup(new Popup().setHTML("<p>Sireesh<p/>"))
      .setLngLat([77.5946, 12.8716])
      .addTo(map);

    marker.togglePopup();

    // optional cleanup when component unmounts
    return () => map.remove();
  }, []);

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }}></div>
  );
}
