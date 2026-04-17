import json
import os
import random
from pathlib import Path
import logging

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from shapely.geometry import LineString, box

from azure_blob_helper import BlobHelper
public_blob = BlobHelper('public')

APP_DIR = Path("my-app")
NETWORKS_DIR = Path("networks")
ACTIVITIES_JSON = Path("activities.json")

logging.basicConfig(level=logging.INFO)

def decode_polyline(encoded: str):
    coords = []
    index = 0
    lat, lng = 0, 0

    while index < len(encoded):
        # Decode latitude
        result, shift = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lat += ~(result >> 1) if result & 1 else result >> 1

        # Decode longitude
        result, shift = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += ~(result >> 1) if result & 1 else result >> 1

        coords.append((lat / 1e5, lng / 1e5))

    return coords


def split_linestring_into_segments(line, segment_length=50):
    segments = []
    total_length = line.length
    distance = 0

    while distance < total_length:
        start = line.interpolate(distance)
        end = line.interpolate(min(distance + segment_length, total_length))
        segments.append(LineString([start, end]))
        distance += segment_length

    return segments


def split_gdf_into_segments(gdf, segment_length=50):
    rows = []

    for _, row in gdf.iterrows():
        segments = split_linestring_into_segments(row.geometry, segment_length)
        for segment in segments:
            new_row = row.copy()
            new_row.geometry = segment
            new_row["color"] = "#{:06x}".format(random.randint(0, 0xFFFFFF))
            rows.append(new_row)

    return gpd.GeoDataFrame(rows, crs=gdf.crs)


def find_visited_segments(activity_gdf, network_gdf, buffer_distance=50):
    activity_points = []
    for geom in activity_gdf.geometry:
        distances = np.arange(0, geom.length, 5)  # sample every 5m
        activity_points.extend([geom.interpolate(d) for d in distances])

    coords = np.array([(p.x, p.y) for p in activity_points])
    tree = cKDTree(coords)

    midpoints = np.array(
        [
            (
                geom.interpolate(0.5, normalized=True).x,
                geom.interpolate(0.5, normalized=True).y,
            )
            for geom in network_gdf.geometry
        ]
    )

    distances, _ = tree.query(midpoints, k=1)
    network_gdf["visited"] = distances <= buffer_distance
    return network_gdf


def load_activities():
    activities = public_blob.load_data('strava_raw_data.json')

    activities = [a for a in activities if a.get("type") == "Ride"]
    polylines = [a["map"]["summary_polyline"] for a in activities if a.get("map", {}).get("summary_polyline")]
    all_coords = [decode_polyline(polyline) for polyline in polylines]

    all_routes = gpd.GeoDataFrame()
    for coords in all_coords:
        line = gpd.GeoSeries([LineString([(lon, lat) for lat, lon in coords])])
        all_routes = pd.concat([all_routes, gpd.GeoDataFrame(geometry=line)], ignore_index=True)

    all_routes = gpd.GeoDataFrame(all_routes, geometry="geometry")

    # Keep only routes fully inside regional bounding box
    bbox = box(-124.06261774909336, 47.96728205520181, -121.82124601966595, 49.80073837001835)
    activities_gdf = all_routes[all_routes.within(bbox)]

    return activities_gdf.set_crs(epsg=4326)


def process_networks(activities):
    activities = activities.to_crs(epsg=32610)
    summary_stats = {}

    for network_name in os.listdir(NETWORKS_DIR):
        logging.info("Processing network:", network_name)

        network_path = NETWORKS_DIR / network_name
        if "." not in network_name:
            gdf = gpd.read_file(network_path / f"{network_name}.shp")
        else:
            gdf = gpd.read_file(network_path)

        gdf = gdf.explode().reset_index(drop=True)
        gdf = gdf.set_crs(epsg=4326).to_crs(epsg=32610)

        network = split_gdf_into_segments(gdf, segment_length=50)

        activities_simplified = activities.copy()
        activities_simplified.geometry = activities.geometry.simplify(1)

        network = find_visited_segments(activities_simplified, network, buffer_distance=50)

        visited_length = network.loc[network["visited"]].geometry.length.sum()
        total_length = network.geometry.length.sum()
        visited_percentage = (visited_length / total_length * 100) if total_length else 0

        summary_stats[Path(network_name).stem] = {
            "visited_length": visited_length.round(0),
            "total_length": total_length.round(0),
            "visited_percentage": round(visited_percentage, 0),
        }

        network = network.to_crs(epsg=4326)[["visited", "geometry"]]
        network = network.dissolve(by="visited", as_index=False)

        network = network.to_crs(epsg=4326)
        
        public_blob.save_compressed(json.loads(network.to_json()), f"{Path(network_name).stem}.geojson")

    #write summary stats to blob
    public_blob.save_compressed(summary_stats, "summary_stats.json")

    return

def analyze_activities():
    logging.info("Starting activity analysis...")
    activities = load_activities()
    public_blob.save_compressed(json.loads(activities.to_json()), "strava_activities_geojson.geojson")
    process_networks(activities)
    logging.info("Activity analysis complete.")
    return

if __name__ == "__main__":
    analyze_activities()