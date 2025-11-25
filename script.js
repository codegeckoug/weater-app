// Map weather codes to human-readable descriptions
const weatherCodeMap = {
  0: "Clear",
  1: "Clouds",
  2: "Clouds",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Drizzle",
  57: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Rain",
  66: "Rain",
  67: "Rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  77: "Snow",
  80: "Rain",
  81: "Rain",
  82: "Rain",
  85: "Snow",
  86: "Snow",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

// Map descriptions to your local image files in /images
const weatherIcons = {
  Clear: "images/icon-sunny.webp",
  Clouds: "images/icon-partly-cloudy.webp",
  Overcast: "images/icon-overcast.webp",
  Fog: "images/icon-fog.webp",
  Drizzle: "images/icon-drizzle.webp",
  Rain: "images/icon-rain.webp",
  Snow: "images/icon-snow.webp",
  Thunderstorm: "images/icon-storm.webp",
};

// DOM ELEMENTS

const timeElement = document.getElementById("time");
const dateEl = document.getElementById("date");
const currentWeatherItemsEl = document.getElementById("extra-metric");
const weatherForecastEl = document.getElementById("weather-forecast");
const currentTempEl = document.getElementById("curent-temp");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-btn");
let currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
let timeInterval;

//unit conversion state
let currentUnits = {
  temperature: "celsius",
  windSpeed: "km/h",
  precipitation: "mm",
};
let currentWeatherData = null;
let currentLatitude = null;
let currentLongitude = null;
let currentCity = "";
let currentCountry = "";

//Unit conversion functions
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}
function farenheitToCelsius(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9;
}
function kmhToMph(kmh) {
  return kmh * 0.621371;
}
function mphToKmh(mph) {
  return mph / 0.621371;
}
function mmToInches(mm) {
  return mm * 0.0393701;
}
function inchesToMm(inches) {
  return inches / 0.0393701;
}
function convertTemperature(temp, toUnit) {
  if (toUnit === "fahrenheit") {
    return celsiusToFahrenheit(temp);
  }
  return temp;
}
function convertWindSpeed(speed, toUnit) {
  if (toUnit === "mph") {
    return kmhToMph(speed);
  }
  return speed;
}
function convertPrecipitation(precip, toUnit) {
  if (toUnit === "inches") {
    return mmToInches(precip);
  }
  return precip;
}
function getTemperatureSymbol() {
  return currentUnits.temperature === "celsius" ? "°C" : "°F";
}
function getWindSpeedUnit() {
  return currentUnits.windSpeed === "kmh" ? "km/h" : "mph";
}
function getPrecipitationUnit() {
  return currentUnits.precipitation === "mm" ? "mm" : "in";
}
//Units dropdown functionality
const unitsBtn = document.querySelector(".units-btn");
const unitsMenu = document.querySelector(".units-menu");
unitsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  unitsMenu.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!unitsMenu.contains(e.target) && !unitsBtn.contains(e.target)) {
    unitsMenu.classList.remove("show");
  }
});
//unit button click handling
const unitButtons = document.querySelectorAll(".units-menu button[data-unit]");
unitButtons.forEach((button) => {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const unit = button.dataset.unit;
    //update active state for buttons in the same category
    const category = button.parentElement;
    category.querySelectorAll("button").forEach((btn) => {
      btn.classList.remove("active");
    });
    button.classList.add("active");
    //update current units
    if (unit === "celsius" || unit === "fahrenheit") {
      currentUnits.temperature = unit;
    } else if (unit === "kmh" || unit === "mph") {
      currentUnits.windSpeed = unit;
    } else if (unit === "mm" || unit === "inches") {
      currentUnits.precipitation = unit;
    }
    //update header text
    updateUnitsHeader();
    //Re-render weather data with new units
    if (currentWeatherData) {
      showWeatherData(
        currentWeatherData,
        currentLatitude,
        currentLongitude,
        currentCity,
        currentCountry
      );
    }
  });
});
function updateUnitsHeader() {
  const isImperial =
    currentUnits.temperature === "fahrenheit" ||
    currentUnits.windSpeed === "mph" ||
    currentUnits.precipitation === "in";
  const headerText = document.querySelector(".units-menu p strong");
  if (headerText) {
    headerText.textContent = isImperial
      ? "Switch to Metric"
      : "Switch to Imperial";
  }
}
//set initial active states
document.querySelector("button[data-unit='celsius']").classList.add("active");
document.querySelector("button[data-unit='kmh']").classList.add("active");
document.querySelector("button[data-unit='mm']").classList.add("active");

//Function to Start time
function startClock(timezone) {
  if (timeInterval) clearInterval(timeInterval);

  timeInterval = setInterval(() => {
    const now = new Date();

    // TIME (12hr format with seconds)
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: timezone,
    });

    // DATE (full written format)
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    });

    // Update HTML
    dateEl.innerHTML = dateString; // First line
    timeElement.innerHTML = timeString; // Second line
  }, 1000);
}

// DATE + TIME

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
//get location from search input

async function getLocationFromSearch(query) {
  const apiKey = "7f72302250304209ab6c29424d513688";
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
        query
      )}&key=${apiKey}`
    );
    const data = await response.json();
    if (!data.results || !data.results.length)
      throw new Error("location not found");
    const components = data.results[0].components;
    const city =
      components.city ||
      components.town ||
      components.village ||
      components.state ||
      "unknown";
    const country = components.country || "unknown";
    const latitude = data.results[0].geometry.lat;
    const longitude = data.results[0].geometry.lng;
    return { city, country, latitude, longitude };
  } catch (error) {
    alert(error.message);
    return null;
  }
}
//searchbtn
searchButton.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  const location = await getLocationFromSearch(query);
  if (!location) return;
  getWeatherDataForLocation(
    location.latitude,
    location.longitude,
    location.city,
    location.country
  );
});
function getWeatherDataForLocation(
  latitude,
  longitude,
  city = "",
  country = ""
) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,weathercode,windspeed_10m,precipitation_probability,precipitation&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      showWeatherData(data, latitude, longitude, city, country);
    })
    .catch((err) => console.error(err));
}

/*setInterval(() => {
  const time = new Date();
  const month = time.getMonth();
  const date = time.getDate();
  const day = time.getDay();
  const hour = time.getHours();
  const hoursIn12HrFormat = hour >= 13 ? hour % 12 : hour;
  const minutes = time.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  const minutesPadded = minutes.toString().padStart(2, "0");

  timeElement.innerHTML = `${hoursIn12HrFormat}:${minutesPadded} <span class="am-pm">${ampm}</span>`;
  dateEl.innerHTML = `${days[day]}, ${date} ${months[month]}`;
}, 1000);*/

//
// FETCH WEATHER

getWeatherData();

function getWeatherData() {
  navigator.geolocation.getCurrentPosition((success) => {
    let { latitude, longitude } = success.coords;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,weathercode,windspeed_10m,precipitation_probability,precipitation&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        showWeatherData(data, latitude, longitude);
      })
      .catch((err) => console.error(err));
  });
}

//CITY + COUNTRY

function getCityAndCountry(latitude, longitude) {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        "User-Agent": "MyWeatherApp/1.0",
        "Accept-Language": "en",
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.state ||
        "Unknown";

      const country = data.address.country || "Unknown";

      return { city, country };
    })
    .catch(() => ({ city: "Unknown", country: "Unknown" }));
}

// SHOW WEATHER DATA

// SHOW WEATHER DATA
function showWeatherData(data, latitude, longitude, city = "", country = "") {
  currentWeatherData = data;
  currentLatitude = latitude;
  currentLongitude = longitude;
  currentCity = city;
  currentCountry = country;

  const now = new Date();
  const currentHourIndex = data.hourly.time.findIndex(
    (t) => new Date(t).getHours() === now.getHours()
  );
  const precipitationProbability =
    currentHourIndex >= 0
      ? data.hourly.precipitation_probability[currentHourIndex]
      : data.hourly.precipitation_probability[0];

  const precipitationAmount =
    currentHourIndex >= 0
      ? data.hourly.precipitation?.[currentHourIndex] || 0
      : data.hourly.precipitation?.[0] || 0;
  // use API timezone or fallback
  currentTimeZone = data.timezone || currentTimeZone;
  startClock(currentTimeZone);

  // CITY + COUNTRY
  if (city && country) {
    currentTempEl.innerHTML = `${country}, ${city}`;
  } else {
    getCityAndCountry(latitude, longitude).then((location) => {
      currentTempEl.innerHTML = `${location.city}, ${location.country}`;
    });
  }

  const { temperature, windspeed } = data.current_weather;
  const currentCode = data.current_weather.weathercode;
  const currentDescription = weatherCodeMap[currentCode] || "Clear";
  document.querySelector(".weather-icon").src =
    weatherIcons[currentDescription] || weatherIcons["Clear"];

  // CURRENT TEMP
  const displayTemp = convertTemperature(
    temperature,
    currentUnits.temperature
  ).toFixed(1);
  document.getElementById(
    "temp"
  ).innerHTML = `${displayTemp}${getTemperatureSymbol()}`;

  // EXTRA METRICS
  const displayWindspeed = convertWindSpeed(
    windspeed,
    currentUnits.windSpeed
  ).toFixed(1);
  const displayFeelsLike = convertTemperature(
    data.hourly.apparent_temperature[0],
    currentUnits.temperature
  ).toFixed(1);
  const displayPrecipitation = convertPrecipitation(
    precipitationAmount,
    currentUnits.precipitation
  ).toFixed(2);
  currentWeatherItemsEl.innerHTML = `
    <div class="metric">
      <span>${displayWindspeed} ${getWindSpeedUnit()}</span>
      <p>Wind Speed</p>
    </div>
    <div class="metric">
      <span>${data.hourly.relativehumidity_2m[0]}%</span>
      <p>Humidity</p>
    </div>
    <div class="metric">
      <span>${displayFeelsLike}${getTemperatureSymbol()}</span>
      <p>Feels Like</p>
    </div>
    <div class="metric">
      <span>${displayPrecipitation}${getPrecipitationUnit()}</span>
      <p>Precipitation</p>
    </div>
    <div class="metric">
    <span>${precipitationProbability}%</span>
    <p>Rain Chance</p>
  </div>
  `;

  // DAILY FORECAST
  let weatherForecastHTML = `
    <h3>Daily forecast</h3>
    <div class="daily-cards">
  `;

  data.daily.time.forEach((day, idx) => {
    const date = new Date(day);
    const weekday = days[date.getDay()].slice(0, 3);
    const weatherCode = data.daily.weathercode[idx];
    const description = weatherCodeMap[weatherCode] || "Clear";
    const icon = weatherIcons[description] || weatherIcons["Clear"];

    const maxTemp = convertTemperature(
      data.daily.temperature_2m_max[idx],
      currentUnits.temperature
    ).toFixed(0);
    const minTemp = convertTemperature(
      data.daily.temperature_2m_min[idx],
      currentUnits.temperature
    ).toFixed(0);

    weatherForecastHTML += `
      <div class="day-card">
        <h4>${weekday}</h4>
        <img src="${icon}" width="30" alt="${description}"/>
        <div class="temp-range">
          <p class="number">${maxTemp}°</p>
          <p class="number">${minTemp}°</p>
        </div>
      </div>
    `;
  });

  weatherForecastHTML += `</div>`;
  weatherForecastEl.innerHTML = weatherForecastHTML;

  // -----------------------------
  // HOURLY FORECAST
  renderHourlyForecast(data); // <--- call hourly forecast here
}

// -----------------------------
// HOURLY FORECAST FUNCTION
function renderHourlyForecast(data) {
  const daySelector = document.getElementById("day-selector");
  const hourlyContainer = document.querySelector(
    ".hourly-forecast .hourly-cards"
  );

  // Map daily dates for selector
  const dayMap = data.daily.time.map((dayStr) => {
    const date = new Date(dayStr);
    const weekday = days[date.getDay()];
    return { weekday, date };
  });

  // Populate day selector
  daySelector.innerHTML = "";
  dayMap.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.date.toISOString(); // safer than toDateString
    option.textContent = d.weekday;
    daySelector.appendChild(option);
  });

  // Function to render hourly cards for a selected date
  function renderHoursForDate(dateISO) {
    hourlyContainer.innerHTML = "";
    const selectedDate = new Date(dateISO);

    const hoursForDay = data.hourly.time
      .map((timeStr, idx) => ({ timeStr, idx }))
      .filter(({ timeStr }) => {
        const t = new Date(timeStr);
        return (
          t.getFullYear() === selectedDate.getFullYear() &&
          t.getMonth() === selectedDate.getMonth() &&
          t.getDate() === selectedDate.getDate()
        );
      });

    hoursForDay.forEach(({ timeStr, idx }) => {
      const hourDate = new Date(timeStr);
      let hour = hourDate.getHours();
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;

      const weatherCode = data.hourly.weathercode[idx];
      const description = weatherCodeMap[weatherCode] || "Clear";
      const icon = weatherIcons[description] || weatherIcons["Clear"];
      const temp = convertTemperature(
        data.hourly.temperature_2m[idx],
        currentUnits.temperature
      ).toFixed(1);

      const hourCard = document.createElement("div");
      hourCard.className = "hour-cards";
      hourCard.innerHTML = `
        <div class="hour-card">
          <img src="${icon}" alt="${description}" class="hour-icon" width="40"/>
          <span>${hour} ${ampm}</span>
        </div>
        <div class="hour-temp">
          <p>${temp}${getTemperatureSymbol()}</p>
        </div>
      `;
      hourlyContainer.appendChild(hourCard);
    });
  }

  // Render today's hourly forecast by default
  renderHoursForDate(dayMap[0].date.toISOString());

  // Update hourly forecast when user selects a different day
  daySelector.addEventListener("change", (e) => {
    renderHoursForDate(e.target.value);
  });
}
