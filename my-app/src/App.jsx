import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import stravaLogo from './assets/images/api_logo_pwrdBy_strava_horiz_orange.svg';

import ProgressBar from './components/ProgressBar';

mapboxgl.accessToken = import.meta.env.VITE_STRAVA_MAPBOX_TOKEN;

//read summary_stats from json file
const res = await fetch(`${import.meta.env.BASE_URL}summary_stats.json`);
const summary_stats = await res.json();

function fadeColorMapbox(hex, percent) {
  const opacity = 1 - (percent / 100);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const geojsonLayers = [
    //activities layer, no associated progress bar
  {
    networkName: 'activities',
    path: '/geojson/activities.geojson',
    color: '#ff6600',
    opacity: 0.3,
    width: 1,
    highlightOnHover: false
  },

  {
    networkName: "Regional Greenway Network",
    path: '/geojson/mv_regional_greenway_network_2050.geojson',
    colorByVisited: true,
    visitedColor: '#44BA52',
    unvisitedColor: 'red',
    opacity: .8,
    width: 3,
    highlightOnHover: true
  },

  {
    networkName: "Translink MBN",
    path: '/geojson/BICCS_MBNTier1NearMediumTermCorridors_view.geojson',
    colorByVisited: true,
    visitedColor: '#4db9c5',
    unvisitedColor: 'red',
    opacity: 1,
    width: 3,
    highlightOnHover: true
  },

  {
    networkName: "City of Victoria Bike Network",
    path: '/geojson/victoria_bike_network.geojson',
    colorByVisited: true,
    visitedColor: '#A3E7FC',
    unvisitedColor: 'red',
    opacity: 1,
    width: 3,
    highlightOnHover: true
  },

  {
    networkName: "CRD Regional Trails",
    path: '/geojson/crd_regional_trails.geojson',
    colorByVisited: true,
    visitedColor: '#474dea',
    unvisitedColor: 'red',
    opacity: 1,
    width: 3,
    highlightOnHover: true
  },
  
];

export default function App() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-123, 49],
      zoom: 10
    });

    map.on('load', () => {
      geojsonLayers.forEach((layer) => {
        const id = layer.path.split('/').pop().replace('.geojson', '');

        map.addSource(id, {
          type: 'geojson',
          data: `${import.meta.env.BASE_URL}${layer.path.replace(/^\//, '')}`
        });

        map.addLayer({
          id: `${id}-line`,
          type: 'line',
          source: id,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': layer.colorByVisited
              ? ['case', 
                  ['==', ['get', 'visited'], true], layer.visitedColor, 
                  ['==', ['get', 'visited'], false], layer.unvisitedColor,
                  '#888888'  // fallback if visited is missing or unexpected
                ]
              : layer.color,
            'line-opacity': layer.opacity,
            'line-width': layer.width
          }
        });
      });

      //tooltips
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

// Build a lookup from layer id → network name
const layerMeta = {};
geojsonLayers.forEach(layer => {
  const id = layer.path.split('/').pop().replace('.geojson', '') + '-line';
  layerMeta[id] = { networkName: layer.networkName, visitedColor: layer.visitedColor, highlightOnHover: layer.highlightOnHover };
});

const interactiveLayers = Object.keys(layerMeta);

map.on('mousemove', interactiveLayers, (e) => {
  console.log(e.features[0].layer.id, layerMeta);

  map.getCanvas().style.cursor = 'pointer';
  const layerId = e.features[0].layer.id;
  const { networkName, highlightOnHover} = layerMeta[layerId];
  const visited = e.features[0].properties.visited === true 
    || e.features[0].properties.visited === 'true';

  // Highlight
  if (highlightOnHover) {
    map.setPaintProperty(layerId, 'line-width', 6);
    map.setPaintProperty(layerId, 'line-opacity', 1);
  }

  popup
    .setLngLat(e.lngLat)
    .setHTML(`<strong>${networkName}</strong><br/>${visited ? '✅ Visited' : '❌ Not visited'}`)
    .addTo(map);
});

map.on('mouseleave', interactiveLayers, (e) => {
  map.getCanvas().style.cursor = '';
  popup.remove();

  // Reset all layers to original widths/opacities
  geojsonLayers.forEach(layer => {
    const id = layer.path.split('/').pop().replace('.geojson', '') + '-line';
    map.setPaintProperty(id, 'line-width', layer.width);
    map.setPaintProperty(id, 'line-opacity', layer.opacity);
  });
});
    });

    return () => map.remove();
  }, []);

  return (

    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <header>
        <a href="https://github.com/HyperbolicStudios/strava-ride-tracker">
          <i class="fa-brands fa-github"></i>
        </a>
        <h1 class='centred-cell'>Mark's Bike Ride Tracker</h1>
        <div><img class='centred-cell' src={stravaLogo} alt="Powered by Strava Logo" type="image/svg+xml" /></div>
      </header>
      
      <section id="progress-bars">
        <ProgressBar label="Metro Van Regional Greenway (Complete + Future)" progressColor="#44BA52" percent={summary_stats.mv_regional_greenway_network_2050.visited_percentage}></ProgressBar>
        <ProgressBar label="Translink Major Bikeway Network" progressColor="#074F57" percent={summary_stats.BICCS_MBNTier1NearMediumTermCorridors_view.visited_percentage}></ProgressBar>
        <ProgressBar label="City of Victoria Bike Network" progressColor="#A3E7FC" percent={summary_stats.victoria_bike_network.visited_percentage}></ProgressBar>
        <ProgressBar label="CRD Trail Network" progressColor="#474dea" percent={summary_stats.crd_regional_trails.visited_percentage}></ProgressBar>
      </section>
      <div ref={mapContainer} class="mapContainer"/>

    </div>
  );
}