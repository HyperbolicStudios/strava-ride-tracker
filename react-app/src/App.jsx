import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import stravaLogo from './assets/images/api_logo_pwrdBy_strava_stack_orange.svg';
import ProgressBar from './components/ProgressBar';

//const BLOB_BASE = "https://storageaccountstrava.blob.core.windows.net";
mapboxgl.accessToken = import.meta.env.VITE_STRAVA_MAPBOX_TOKEN;
const BLOB_BASE = import.meta.env.VITE_BLOB_BASE;

console.log("BLOB_BASE:", BLOB_BASE);
console.log("Mapbox Access Token:", mapboxgl.accessToken);
const geojsonLayers = [
  {
    networkName: "Regional Greenway Network",
    path: 'mv_regional_greenway_network_2050.geojson',
    colorByVisited: true,
    visitedColor: '#44BA52',
    unvisitedColor: 'red',
    opacity: .8,
    width: 3,
    highlightOnHover: true
  },
  {
    networkName: "Translink MBN",
    path: 'BICCS_MBNTier1NearMediumTermCorridors_view.geojson',
    colorByVisited: true,
    visitedColor: '#4db9c5',
    unvisitedColor: 'red',
    opacity: 1,
    width: 3,
    highlightOnHover: true
  },
  {
    networkName: "City of Victoria Bike Network",
    path: 'victoria_bike_network.geojson',
    colorByVisited: true,
    visitedColor: '#A3E7FC',
    unvisitedColor: 'red',
    opacity: 1,
    width: 3,
    highlightOnHover: true
  },
  {
    networkName: "CRD Regional Trails",
    path: 'crd_regional_trails.geojson',
    colorByVisited: true,
    visitedColor: '#474dea',
    unvisitedColor: 'red',
    opacity: 1,
    width: 3,
    highlightOnHover: true
  },
    {
    networkName: 'activities',
    path: 'strava_activities_geojson.geojson',
    color: '#ff6600',
    opacity: 0.3,
    width: 1,
    highlightOnHover: false
  }
];

export default function App() {
  const mapContainer = useRef(null);
  const [summaryStats, setSummaryStats] = useState(null);

  useEffect(() => {
  const url = `${BLOB_BASE}/public/summary_stats.json`;

  fetch(`${BLOB_BASE}/public/summary_stats.json`)
    .then(res => res.json())
    .then(data => {
      setSummaryStats(data);
    });
}, []);

  useEffect(() => {
    if (!summaryStats) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-123, 49],
      zoom: 10
    });

    map.on('load', () => {
      geojsonLayers.forEach((layer) => {
        const id = layer.path.replace('.geojson', '');

        map.addSource(id, {
          type: 'geojson',
          data: `${BLOB_BASE}/public/${layer.path}`
        });

        map.addLayer({
          id: `${id}-line`,
          type: 'line',
          source: id,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': layer.colorByVisited
              ? ['case',
                  ['==', ['get', 'visited'], true], layer.visitedColor,
                  ['==', ['get', 'visited'], false], layer.unvisitedColor,
                  '#888888'
                ]
              : layer.color,
            'line-opacity': layer.opacity,
            'line-width': layer.width
          }
        });
      });

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

      const layerMeta = {};
      geojsonLayers.forEach(layer => {
        const id = layer.path.replace('.geojson', '') + '-line';
        layerMeta[id] = { networkName: layer.networkName, visitedColor: layer.visitedColor, highlightOnHover: layer.highlightOnHover };
      });

      const interactiveLayers = Object.keys(layerMeta);

      map.on('mousemove', interactiveLayers, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const layerId = e.features[0].layer.id;
        const { networkName, highlightOnHover } = layerMeta[layerId];
        const visited = e.features[0].properties.visited === true
          || e.features[0].properties.visited === 'true';

        if (highlightOnHover) {
          map.setPaintProperty(layerId, 'line-width', 6);
          map.setPaintProperty(layerId, 'line-opacity', 1);
          popup
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${networkName}</strong><br/>${visited ? '✅ Visited' : '❌ Not visited'}`)
            .addTo(map);
        }
      });

      map.on('mouseleave', interactiveLayers, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
        geojsonLayers.forEach(layer => {
          const id = layer.path.replace('.geojson', '') + '-line';
          map.setPaintProperty(id, 'line-width', layer.width);
          map.setPaintProperty(id, 'line-opacity', layer.opacity);
        });
      });
    });

    return () => map.remove();
  }, [summaryStats]);

  if (!summaryStats) return null;
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <header>
        <a href="https://github.com/HyperbolicStudios/strava-ride-tracker">
          <i class="fa-brands fa-github"></i>
        </a>
        <h1 class='centred-cell'>Mark's Bike Ride Tracker</h1>
        <img class='centred-cell' src={stravaLogo} alt="Powered by Strava Logo" type="image/svg+xml" />
      </header>

      <section id="progress-bars">
        <ProgressBar label="Metro Van Regional Greenway (Complete + Future)" progressColor="#44BA52" percent={summaryStats.mv_regional_greenway_network_2050.visited_percentage}></ProgressBar>
        <ProgressBar label="Translink Major Bikeway Network" progressColor="#074F57" percent={summaryStats.BICCS_MBNTier1NearMediumTermCorridors_view.visited_percentage}></ProgressBar>
        <ProgressBar label="City of Victoria Bike Network" progressColor="#A3E7FC" percent={summaryStats.victoria_bike_network.visited_percentage}></ProgressBar>
        <ProgressBar label="CRD Trail Network" progressColor="#474dea" percent={summaryStats.crd_regional_trails.visited_percentage}></ProgressBar>
      </section>

      <div ref={mapContainer} class="mapContainer" />

      <section id="info">
        <p>Data credits: <a href="https://open-data-portal-metrovancouver.hub.arcgis.com/datasets/64dae354287e41b5a5f5b97b2d0e5e3d_2/explore?location=49.138504%2C-122.873263%2C13">Metro Vancouver</a>, <a href="https://regionalroads.com/biccswitteligibility">Translink</a>, <a href="https://developers.strava.com/">Strava</a>, <a href="https://www.crd.ca/government-administration/data-documents/maps-geospatial-data">Capital Regional District</a>, <a href="https://opendata.victoria.ca/datasets/34632d5ee89d40ffa0462e717ae49d0b_23/explore?location=48.428000%2C-123.358300%2C13">City of Victoria</a></p>
        <p>Built by <a href="https://markedwardson.com">Mark Edwardson</a> (my <a class="link-orange" href="https://www.strava.com/athletes/117817092">Strava</a>)</p>
      </section>
    </div>
  );
}
