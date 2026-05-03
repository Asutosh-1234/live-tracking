const map = L.map('map').setView([51.505, -0.09], 13);
const remoteMarkers = new Map();

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

function getUsersCurrentLocation() {
  return new Promise((res, rej) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Got user's location`, position);
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          res({ latitude, longitude });
        },
        (err) => { rej(err); },
        { enableHighAccuracy: true },
      );
    } else {
      alert('Geolocation is not available in this browser');
    }
  });
}

let myCurrentLocationMarker = null;

async function main(socket) {
  setInterval(async () => {
    const { latitude, longitude } = await getUsersCurrentLocation();
    socket.emit('client:location:update', { latitude, longitude });
    if (!myCurrentLocationMarker) {
      myCurrentLocationMarker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup('You are here');
    } else {
      myCurrentLocationMarker.setLatLng([latitude, longitude]);
    }
  }, 10 * 1000);
}

window.addEventListener('load', async () => {
  const res = await fetch('/auth/me');
  if (!res.ok) {
    document.getElementById('login-screen').style.display = 'flex';
    return;
  }
  document.getElementById('map').style.display = 'block';
  const socket = io();

  socket.on('server:location:update', (data) => {
    const { userId, latitude, longitude, name } = data;
    if (!remoteMarkers.has(userId)) {
      const marker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(name || userId);
      remoteMarkers.set(userId, marker);
    } else {
      const existingMarker = remoteMarkers.get(userId);
      existingMarker.setLatLng([latitude, longitude]);
    }
  });

  main(socket);
});
