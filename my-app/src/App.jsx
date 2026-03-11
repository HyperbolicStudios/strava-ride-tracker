import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import stravaLogo from './assets/images/api_logo_pwrdBy_strava_horiz_orange.png';

import ProgressBar from './components/ProgressBar';

mapboxgl.accessToken = import.meta.env.VITE_STRAVA_MAPBOX_TOKEN;

const geojsonLayers = [
  {
    path: '/geojson/activities.geojson',
    color: '#ff6600',
    opacity: 0.3,
    width: 1
  },
  {
    path: '/geojson/mv_regional_greenway_network_2050.geojson',
    colorByVisited: true,
    visitedColor: '#00ff00',
    unvisitedColor: '#ff0000',
    opacity: 0.6,
    width: 3
  }
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
          data: layer.path
        });

        map.addLayer({
          id: `${id}-line`,
          type: 'line',
          source: id,
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
    });

    return () => map.remove();
  }, []);

  return (

    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <header>
        <a href="https://github.com/HyperbolicStudios">
          <i class="fa-brands fa-github"></i>
        </a>
        <h1 class='centred-cell'>Mark's Bike Ride Tracker</h1>
        <img class='centred-cell' src={stravaLogo} alt="Powered by Strava Logo" />
      </header>
      
      <section id="progress-bars">
        <ProgressBar label="Metro Van Regional Greenway" progressColor="#074F57" percent={25}></ProgressBar>
        <ProgressBar label="Vancouver Major Bikeway Network" progressColor="#44BA52" percent={50}></ProgressBar>
        <ProgressBar label="CoV AAA Network" progressColor="#fae1df" percent={75}></ProgressBar>
        <ProgressBar label="CRD Trail Network" progressColor="#A3E7FC" percent={90}></ProgressBar>
      </section>
      <div ref={mapContainer} class="mapContainer"/>

    </div>
  );
}