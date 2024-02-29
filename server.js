const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const vehloc = 'https://app.mecatran.com/utw/ws/gtfsfeed/vehicles/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true';

let gtfs_realtime;

setInterval(() => {
  fetch(vehloc)
    .then(response => response.json())
    .then(data => {
      gtfs_realtime = data;
    });
}, 15000);

fetch(vehloc)
  .then(response => response.json())
  .then(data => {
    gtfs_realtime = data;
  });


app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/route/:route', (req, res) => {
  // From Route ID, get route of that bus, get stops on that route and convert to geojson and return to client
  // GTFS Static feeds have been converted to json and stored in json/*.json

  // Get route ID
  const routeID = req.params.route;

  // get trip
  const trips = JSON.parse(fs.readFileSync('./json/trips.json'));
  const trip = trips.filter(trip => trip.route_id === routeID);

  // Get shape of trip
  const shapes = JSON.parse(fs.readFileSync('./json/shapes.json'));
  const shape = shapes.filter(shape => shape.shape_id === trip[0].shape_id);

  // Get stops of trip
  const stop_times = JSON.parse(fs.readFileSync('./json/stop_times.json'));
  const stops = JSON.parse(fs.readFileSync('./json/stops.json'));
  const stop_ids = stop_times.filter(stop_time => stop_time.trip_id === trip[0].trip_id).map(stop_time => stop_time.stop_id);
  const trip_stops = stops.filter(stop => stop_ids.includes(stop.stop_id));
  const find_sequence = (stop_id) => stop_times.find(stop_time => stop_time.stop_id === stop_id).stop_sequence;
  const geojson = {
    type: 'FeatureCollection',
    features: []
  };

  trip_stops.forEach(stop => {
    let number_lon = parseFloat(stop.stop_lon);
    let number_lat = parseFloat(stop.stop_lat);
    geojson.features.push({
      type: 'Feature',
      properties: {
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        stop_sequence: find_sequence(stop.stop_id)
      },
      geometry: {
        type: 'Point',
        coordinates: [number_lon, number_lat]
      }
    });
  });

  // Convert above geojson to linestring
  const linestring = {
    type: 'Feature',
    properties: {
      route_id: routeID
    },
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  };
  shape.forEach(point => {
    let number_lon = parseFloat(point.shape_pt_lon);
    let number_lat = parseFloat(point.shape_pt_lat);
    linestring.geometry.coordinates.push([number_lon, number_lat]);
  });

  geojson.features.push(linestring);

  res.json(linestring);
});

app.get('/bus/:busid/upcoming_stops', (req, res) => {
  // Get next stops of the bus
  const busID = req.params.busid;
  const vehicle = gtfs_realtime.entity.filter(entity => entity.vehicle.vehicle.id === busID);
  const current_stop_sequence = vehicle[0].vehicle.currentStopSequence;
  const tripID = vehicle[0].vehicle.trip.tripId;
  const stop_times = JSON.parse(fs.readFileSync('./json/stop_times.json'));
  const stops = JSON.parse(fs.readFileSync('./json/stops.json'));
  const stop_ids = stop_times.filter(stop_time => stop_time.trip_id === tripID).map(stop_time => stop_time.stop_id);
  const trip_stops = stops.filter(stop => stop_ids.includes(stop.stop_id));
  const find_sequence = (stop_id) => stop_times.find(stop_time => stop_time.stop_id === stop_id).stop_sequence;
  const next_stops = trip_stops.filter(stop => find_sequence(stop.stop_id) > current_stop_sequence);
  res.json(next_stops);
});

app.get('/stop/:stopid/next_buses', (req, res) => {
  // Get next buses of the stop
  const stopID = req.params.stopid;
  const vehicles = JSON.parse(fs.readFileSync('./json/vehicles.json'));
  const stop_times = JSON.parse(fs.readFileSync('./json/stop_times.json'));
  const next_buses = vehicles.filter(vehicle => {
    const tripID = vehicle.vehicle.trip.tripId;
    const stop_ids = stop_times.filter(stop_time => stop_time.trip_id === tripID).map(stop_time => stop_time.stop_id);
    return stop_ids.includes(stopID);
  });
  res.json(next_buses);
});



app.listen(3000, () => {
  console.log('Server is running on port 3000');
});