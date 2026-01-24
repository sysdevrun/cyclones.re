import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { leafletLayer, LineSymbolizer, PolygonSymbolizer, PaintRule } from 'protomaps-leaflet';
import L from 'leaflet';

type LayerType = 'water' | 'earth' | 'boundaries';

interface PMTilesLayerProps {
  url: string;
  layers: LayerType[];
  pane: string;
  zIndex: number;
}

const layerStyles: Record<LayerType, () => PaintRule | PaintRule[]> = {
  water: () => ({
    dataLayer: 'water',
    symbolizer: new PolygonSymbolizer({
      fill: '#a4c8e0',
      stroke: 'transparent',
    }),
  }),
  earth: () => [
    // White outline (wider, rendered first)
    {
      dataLayer: 'earth',
      symbolizer: new PolygonSymbolizer({
        fill: 'transparent',
        stroke: 'rgba(255, 255, 255, 0.7)',
        width: 3,
        opacity: 1,
      }),
    },
    // Dark stroke on top (thinner)
    {
      dataLayer: 'earth',
      symbolizer: new PolygonSymbolizer({
        fill: 'transparent',
        stroke: '#333333',
        width: 1,
        opacity: 1,
      }),
    },
  ],
  boundaries: () => [
    // White outline (wider, rendered first)
    {
      dataLayer: 'boundaries',
      symbolizer: new LineSymbolizer({
        color: 'rgba(255, 255, 255, 0.7)',
        width: 3,
        opacity: 1,
      }),
    },
    // Dark stroke on top (thinner)
    {
      dataLayer: 'boundaries',
      symbolizer: new LineSymbolizer({
        color: '#333333',
        width: 1,
        opacity: 1,
      }),
    },
  ],
};

export function PMTilesLayer({ url, layers, pane, zIndex }: PMTilesLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map.getPane(pane)) {
      const customPane = map.createPane(pane);
      customPane.style.zIndex = String(zIndex);
    }

    const paintRules: PaintRule[] = layers.flatMap(layer => layerStyles[layer]());

    const layer = leafletLayer({
      url,
      paintRules,
      labelRules: [],
      pane,
      maxDataZoom: 5,
    }) as unknown as L.Layer;

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, url, layers, pane, zIndex]);

  return null;
}
