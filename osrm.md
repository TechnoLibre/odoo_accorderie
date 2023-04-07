# OSRM pour obtenir la distance entre les membres de l'Accorderie

Testé avec :

- osmium/1.8.0
- osrm-backend 5.26.0

GUIDE : https://github.com/Project-OSRM/osrm-backend

```bash
mkdir -p docker/osrm-backend
cd docker/osrm-backend
wget http://download.geofabrik.de/north-america-latest.osm.pbf
docker run --memory 128G -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/north-america-latest.osm.pbf;echo $?
```

Si erreur 137, manque de mémoire RAM (augmenter votre swap).

Environnement testé

- 40 go de swap
- 62 go de ram
- 63 go espace disque
- 1h15 d'exécution

```bash
docker run --memory 128G -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/north-america-latest.osm
echo $?

```

Environnement testé

- 1h15 d'exécution
- 52 go ram
- 3 go de disque

```bash
docker run --memory 128G -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/north-america-latest.osm;echo $?
```

Environnement testé

- 10 min d'exécution
- 24 go de disque

Au total 89 go de disque

exécuter le service

```bash
docker run --memory 128G -t -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/north-america-latest.osm
```

Tester avec frontend :

```bash
docker run -p 9966:9966 osrm/osrm-frontend
```

Tester avec frontend en changeant l'adresse du backend :

```bash
docker run -p 9966:9966 -e OSRM_BACKEND='http://localhost:5001' osrm/osrm-frontend
```

Ouvrir le lien et changer le layer pour OpenStreetMap :

- http://127.0.0.1:9966/?z=13&center=45.510618%2C-73.512011&loc=45.557798%2C-73.551646&loc=45.504587%2C-73.612996&hl=fr&alt=0
- http://127.0.0.1:5000/route/v1/driving/-73.58064992327455,45.556779399999996;-73.5495704,45.5596817

API :

- http://project-osrm.org/docs/v5.5.1/api/#requests

Trouver la géolocalisation selon l'adresse, avec nominatim.

- https://geopy.readthedocs.io/en/stable/
- https://github.com/osm-search/Nominatim
- https://nominatim.openstreetmap.org
- https://nominatim.openstreetmap.org/search/?q=stade%20olympique%20canada&limit=5&format=jsonv2&addressdetails=1&json_callback=_l_geocoder_3
- https://nominatim.openstreetmap.org/search/?q=stade%20olympique%20canada&limit=5&format=jsonv2&addressdetails=1

Avec adresse :

- https://nominatim.openstreetmap.org/search.php?q=stade+olympique+canada&format=jsonv2

À l'inverse :

- https://nominatim.openstreetmap.org/reverse/?lat=45.54435059752589&lon=-73.72049331665039&zoom=18&addressdetails=1&format=json