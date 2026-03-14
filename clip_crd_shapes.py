import geopandas as gpd

gdf = gpd.read_file("other shapefiles/rpk_RegionalTrails/rpk_RegionalTrails.shp")

print(gdf.Name.unique())

keywords = ['E&N Rail Trail', 'Galloping Goose Regional Trail', 'Lochside Regional Trail']

gdf = gdf[gdf['Name'].str.contains('|'.join(keywords))]

gdf = gdf.to_crs(epsg=4326)

print(gdf.Name.unique())

gdf.to_file("networks/crd_regional_trails.geojson", driver="GeoJSON")