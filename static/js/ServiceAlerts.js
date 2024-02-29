// Service Alerts

const gtfsrt_link = "https://app.mecatran.com/utw/ws/gtfsfeed/alerts/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true";
const alertList = document.getElementById('alerts');


async function getAlerts() {
  const response = await fetch(gtfsrt_link);
  const json = await response.json();
  return json;
}

async function displayAlerts() {
  const alerts = await getAlerts();
  if (alerts.entity.length > 0) {
    alertList.innerHTML = '';
    const ul = document.createElement('ul');
    alertList.appendChild(ul);
    for (let i = 0; i < alerts.entity.length; i++) {
      const alert = alerts.entity[i].alert;
      const li = document.createElement('li');
      li.innerHTML = alert.headerText.translation[0].text;
      ul.appendChild(li);
    }
  }
}

// document.addEventListener('DOMContentLoaded', displayAlerts);