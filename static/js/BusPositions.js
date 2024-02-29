// Bus Positions

let hasRanCreateMarkers = false;
let markers = [];
let previousBusData = {};
let currently_viewing = {
  busses: true,
  light_rail: true
};

var map = L.map('map').setView([33.448376, -112.074036], 13); // Set the initial view of the map

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

async function createMarkers(entity) {
  // Get bus data   
  const lat = entity.vehicle.position.latitude;
  const long = entity.vehicle.position.longitude;
  const isLightRail = entity.vehicle.trip && entity.vehicle.trip.routeId === 'RAIL';
  const routeId = entity.vehicle.trip ? entity.vehicle.trip.routeId : null;

  // Marker icon
  const iconUrl = isLightRail ? './svg/lightrail.svg' : './svg/bus.svg';
  const customIcon = L.icon({
    iconUrl: iconUrl,
    iconSize: [15, 15],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });

  const marker = L.marker([lat, long], { icon: customIcon }).addTo(map).on('click', function () {
    map.setView([lat, long], 16);
    // Get route data from 127.0.0.1:3000/route/:routeId
    if (routeId) {
      console.log(routeId);
      document.getElementById('info2').innerHTML = `
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      `;
      fetch(`http://127.0.0.1:3000/route/${routeId}`, { mode: 'no-cors' })
        .then(response => response.json())
        .then(data => {

          new L.GeoJSON(data).addTo(map);

          // hide all other buses not on the same route

          for (let i = 0; i < markers.length; i++) {
            if (markers[i].busID !== entity.vehicle.vehicle.id) {
              map.removeLayer(markers[i]);
            }
          }
        });

      // Get next stops of the bus (/bus/next_stops/:busid)
      fetch(`http://127.0.0.1:3000/bus/${entity.vehicle.vehicle.id}/upcoming_stops`, { mode: 'no-cors' })
        .then(response => response.json())
        .then(data => {
          // Update "info2" div with next stops
          let nextStops = document.getElementById('info2');
          nextStops.innerHTML = '';
          const h2 = document.createElement('h2');
          h2.innerHTML = 'Bus #' + entity.vehicle.vehicle.id;
          nextStops.appendChild(h2);
          // Add label
          const label = document.createElement('p');
          label.innerHTML = 'On route ' + entity.vehicle.vehicle.label;
          nextStops.appendChild(label);
          // Add stops
          const h3 = document.createElement('h3');
          h3.innerHTML = 'Next Stops';
          nextStops.appendChild(h3);
          const ul = document.createElement('ul');
          nextStops.appendChild(ul);
          for (let i = 0; i < data.length; i++) {
            const li = document.createElement('li');
            li.innerHTML = data[i].stop_name;
            ul.appendChild(li);
          }
        });
    }
  });
  // Popup
  const popupContent = 'Bus ID: ' + entity.vehicle.vehicle.id + '<br>Route: ' + entity.vehicle.vehicle.label + '<br>Speed: ' + entity.vehicle.position.speed + ' mph';
  const popup = L.popup().setContent(popupContent)

  marker.bindPopup(popup);

  marker.getPopup().on('remove', function () {
    // remove polyline and circles
    map.eachLayer(function (layer) {
      if (layer instanceof L.Polyline || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
      // show all other buses, respect view settings
      if (currently_viewing.busses) {
        for (let i = 0; i < markers.length; i++) {
          if (!markers[i].isLightRail) {
            map.addLayer(markers[i]);
          }
        }
      }
      if (currently_viewing.light_rail) {
        for (let i = 0; i < markers.length; i++) {
          if (markers[i].isLightRail) {
            map.addLayer(markers[i]);
          }
        }
      }
    });
    // clear info2 div
    let nextStops = document.getElementById('info2');
    nextStops.innerHTML = '';
    let p = document.createElement('p');
    p.innerHTML = 'Select a bus to view next stops';
    nextStops.appendChild(p);
  });

  // Extra info
  marker.busID = entity.vehicle.vehicle.id; // for our tracking purposes, to animate marker moving
  marker.isLightRail = isLightRail; // to enable/disable view of busses or light rail cars

  markers.push(marker);
  previousBusData[entity.vehicle.vehicle.id] = {
    lat: lat,
    long: long,
    timestamp: Date.now()
  };
}

// Request bus data from MBTA
async function getBusLocations() {
  const url = 'https://app.mecatran.com/utw/ws/gtfsfeed/vehicles/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true';
  const response = await fetch(url);
  const json = await response.json();
  return json;
}

async function moveMarkers(locations, duration = 1000) {
  // Get bus data
  for (let i = 0; i < locations.entity.length; i++) {
    // if locations.entity[i].vehicle doesn't exist, skip it
    if (locations.entity[i].vehicle) {
      const lat = locations.entity[i].vehicle.position.latitude;
      const long = locations.entity[i].vehicle.position.longitude;
      // Find the marker with the same busID as the current bus
      const marker = markers.find(marker => marker.busID === locations.entity[i].vehicle.vehicle.id);
      // Get the current marker position
      const currentPosition = marker.getLatLng();
      // Calculate the distance between current and new positions
      const distance = Math.sqrt(Math.pow(long - currentPosition.lng, 2) + Math.pow(lat - currentPosition.lat, 2));
      // Calculate the number of steps
      const steps = Math.ceil(duration / 16); // Assuming 60 frames per second
      // Calculate the incremental change in latitude and longitude
      const deltaLat = (lat - currentPosition.lat) / steps;
      const deltaLong = (long - currentPosition.lng) / steps;

      // Perform animation
      for (let j = 1; j <= steps; j++) {
        const newLat = currentPosition.lat + deltaLat * j;
        const newLong = currentPosition.lng + deltaLong * j;
        // Move the marker to the new coordinates
        marker.setLatLng([newLat, newLong]);
        await new Promise(resolve => setTimeout(resolve, duration / steps));
      }
    }
  }
  // Interpolate positions
  for (let i = 0; i < locations.entity.length; i++) {
    if (locations.entity[i].vehicle) {
      const busId = locations.entity[i].vehicle.vehicle.id;
      const lat = locations.entity[i].vehicle.position.latitude;
      const long = locations.entity[i].vehicle.position.longitude;

      const previousData = previousBusData[busId];
      if (previousData) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - previousData.timestamp;

        // Calculate velocity
        const velocityLat = (lat - previousData.lat) / timeElapsed;
        const velocityLong = (long - previousData.long) / timeElapsed;

        // Interpolate position
        const interpolatedLat = previousData.lat + velocityLat * duration;
        const interpolatedLong = previousData.long + velocityLong * duration;

        const marker = markers.find(marker => marker.busID === busId);
        marker.setLatLng([interpolatedLat, interpolatedLong]);

        // Update previous data
        previousBusData[busId] = {
          lat: interpolatedLat,
          long: interpolatedLong,
          timestamp: currentTime
        };
      }
    }
  }
}

async function disableView(view) {
  if (view === 'busses') {
    for (let i = 0; i < markers.length; i++) {
      if (!markers[i].isLightRail) {
        map.removeLayer(markers[i]);
      }
    }
    currently_viewing.busses = false;
  } else if (view === 'light_rail') {
    for (let i = 0; i < markers.length; i++) {
      if (markers[i].isLightRail) {
        map.removeLayer(markers[i]);
      }
      currently_viewing.light_rail = false;
    }
  }
}

async function enableView(view) {
  if (view === 'busses') {
    for (let i = 0; i < markers.length; i++) {
      if (!markers[i].isLightRail) {
        map.addLayer(markers[i]);
      }
    }
    currently_viewing.busses = true;
  } else if (view === 'light_rail') {
    for (let i = 0; i < markers.length; i++) {
      if (markers[i].isLightRail) {
        map.addLayer(markers[i]);
      }
    }
    currently_viewing.light_rail = true;
  }
}

async function refreshView() {
  let busses = document.getElementById('flex_busses');
  let light_rail = document.getElementById('flex_lightrail');
  if (!busses.checked) {
    disableView('busses');
  } else {
    enableView('busses');
  }
  if (!light_rail.checked) {
    disableView('light_rail');
  } else {
    enableView('light_rail');
  }
}

// call run() on each running bus
async function start() {
  const locations = await getBusLocations();
  if (!hasRanCreateMarkers) {
    for (let i = 0; i < locations.entity.length; i++) {
      // if locations.entity[i].vehicle doesn't exist, skip it
      if (locations.entity[i].vehicle) {
        createMarkers(locations.entity[i]);
      }
    }
    hasRanCreateMarkers = true;
  } else {
    moveMarkers(locations);
  }
}
document.addEventListener('DOMContentLoaded', start);
setInterval(start, 15000);
