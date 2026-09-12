// Initialize Lucide icons
// This function looks for tags like <i data-lucide="icon-name"></i> and replaces them with SVG icons.
lucide.createIcons();

// --- Navigation Link Highlighting ---
// We want to highlight the correct link in the header when clicked.

const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', function() {
        // Remove 'active' class from all links
        navLinks.forEach(nav => nav.classList.remove('active'));
        // Add 'active' class to the clicked link
        this.classList.add('active');
    });
});

// --- Theme Toggle Placeholder ---
// We will implement full localStorage theme persistence in a later stage.
// For now, this just toggles a 'dark' class// --- Theme (Light/Dark Mode) & Unit Preferences ---
const themeToggle = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('mausam247_theme') || 'light';
htmlElement.setAttribute('data-theme', savedTheme);
updateThemeIcons(savedTheme);

// Theme Toggle Logic
themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mausam247_theme', newTheme);
    updateThemeIcons(newTheme);
});

function updateThemeIcons(theme) {
    const moonIcon = document.getElementById('theme-icon-moon');
    const sunIcon = document.getElementById('theme-icon-sun');
    if (theme === 'dark') {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }
}

// Unit Logic
let currentUnit = localStorage.getItem('mausam247_unit') || 'C';
const unitToggleBtn = document.getElementById('unit-toggle');
const unitText = document.getElementById('unit-text');

// Initialize unit text
unitText.textContent = `°${currentUnit}`;

unitToggleBtn.addEventListener('click', () => {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    localStorage.setItem('mausam247_unit', currentUnit);
    unitText.textContent = `°${currentUnit}`;
    
    // Re-render UI if data exists
    if (currentWeatherData) {
        // We can just trigger a re-fetch of the last location to easily re-render everything
        const lastLocStr = localStorage.getItem('mausam247_lastLocation');
        if (lastLocStr) {
            const lastLoc = JSON.parse(lastLocStr);
            fetchWeather(lastLoc.lat, lastLoc.lon, lastLoc.cityName);
        }
    }
});

// Helper to format temperature based on preference
function formatTemp(celsiusValue) {
    if (currentUnit === 'F') {
        return Math.round(celsiusValue * 9/5 + 32);
    }
    return Math.round(celsiusValue);
}

// --- Search Functionality & Geocoding API Integration ---
// We use the Open-Meteo Geocoding API to search for cities.
// It's completely free and doesn't require an API key!

const searchInput = document.getElementById('city-search');
const searchSuggestions = document.getElementById('search-suggestions');
const searchSpinner = document.getElementById('search-spinner');

// A "debounce" timer prevents us from sending an API request for EVERY single letter typed.
// Instead, it waits until the user stops typing for 300 milliseconds.
let debounceTimer;

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear the previous timer
    clearTimeout(debounceTimer);
    
    // If input is empty, hide suggestions and return
    if (query.length === 0) {
        searchSuggestions.style.display = 'none';
        searchSuggestions.innerHTML = '';
        return;
    }
    
    // Set a new timer to fetch data after 300ms
    debounceTimer = setTimeout(() => {
        fetchCities(query);
    }, 300);
});

// Hide suggestions when clicking outside the search area
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.style.display = 'none';
    }
});

// Show suggestions again if input is clicked and not empty, OR show recent searches if empty
searchInput.addEventListener('focus', () => {
    if (searchSuggestions.innerHTML.trim() !== '' && searchInput.value.trim() !== '') {
        searchSuggestions.style.display = 'block';
    } else if (searchInput.value.trim() === '') {
        showRecentSearches();
    }
});

// Async function to fetch city data from Open-Meteo
// `async/await` makes working with Promises (network requests) much easier to read!
async function fetchCities(query) {
    try {
        // Show loading spinner
        searchSpinner.style.display = 'block';
        
        // Make the API request
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await response.json();
        
        // Hide loading spinner
        searchSpinner.style.display = 'none';
        
        // Render the results
        renderSuggestions(data.results);
        
    } catch (error) {
        console.error("Error fetching cities:", error);
        searchSpinner.style.display = 'none';
    }
}

// Function to take the API data and turn it into HTML list items
function renderSuggestions(results) {
    // Clear previous suggestions
    searchSuggestions.innerHTML = '';
    
    if (!results || results.length === 0) {
        searchSuggestions.innerHTML = '<li class="suggestion-item"><div class="suggestion-title">No results found</div></li>';
        searchSuggestions.style.display = 'block';
        return;
    }
    
    // Loop through the results and create HTML for each
    results.forEach(city => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        
        // Format the subtitle: State (if exists), Country
        let subtitle = '';
        if (city.admin1) subtitle += `${city.admin1}, `;
        subtitle += city.country || 'Unknown Country';
        
        li.innerHTML = `
            <div class="suggestion-title">${city.name}</div>
            <div class="suggestion-subtitle">${subtitle}</div>
        `;
        
        // When a user clicks a suggestion, handle the selection
        li.addEventListener('click', () => {
            selectCity(city);
        });
        
        searchSuggestions.appendChild(li);
    });
    
    searchSuggestions.style.display = 'block';
}

// Function to show recent searches from LocalStorage
function showRecentSearches() {
    const recent = JSON.parse(localStorage.getItem('mausam247_recentSearches') || '[]');
    if (recent.length === 0) return;
    
    searchSuggestions.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Recent Searches</div>';
    
    recent.forEach(city => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        
        // Format the subtitle
        let subtitle = '';
        if (city.admin1) subtitle += `${city.admin1}, `;
        subtitle += city.country || 'Unknown Country';
        
        li.innerHTML = `
            <div class="suggestion-title">${city.name}</div>
            <div class="suggestion-subtitle">${subtitle}</div>
        `;
        
        li.addEventListener('click', () => {
            selectCity(city);
        });
        
        searchSuggestions.appendChild(li);
    });
    
    searchSuggestions.style.display = 'block';
}

// Function to save a city to recent searches
function saveRecentSearch(city) {
    let recent = JSON.parse(localStorage.getItem('mausam247_recentSearches') || '[]');
    // Remove if it already exists (so we can move it to the top)
    recent = recent.filter(c => c.name !== city.name || c.latitude !== city.latitude);
    // Add to the front
    recent.unshift(city);
    // Keep only the last 5
    if (recent.length > 5) recent.pop();
    // Save back to LocalStorage
    localStorage.setItem('mausam247_recentSearches', JSON.stringify(recent));
}

// Function to handle what happens when a city is selected
function selectCity(city) {
    // Update the input field with the city name
    searchInput.value = city.name;
    // Hide the suggestions dropdown
    searchSuggestions.style.display = 'none';
    
    // Save to recent searches!
    saveRecentSearch(city);
    
    // Fetch the weather for this location!
    fetchWeather(city.latitude, city.longitude, city.name);
}

// --- Weather API Integration ---

const weatherCard = document.getElementById('current-weather-card');
const weatherDataView = document.getElementById('weather-data-view');
const weatherSkeleton = document.getElementById('weather-skeleton-view');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
let currentWeatherData = null; // Store for use in map overlays
let lastAttemptedFetch = null; // Store for retrying

retryBtn.addEventListener('click', () => {
    if (lastAttemptedFetch) {
        fetchWeather(lastAttemptedFetch.lat, lastAttemptedFetch.lon, lastAttemptedFetch.cityName);
    }
});

async function fetchWeather(lat, lon, cityName) {
    try {
        errorMessage.style.display = 'none'; // Hide error on new attempt
        lastAttemptedFetch = { lat, lon, cityName }; // Save state for retry
        
        // 1. Show the card and the skeleton loader
        weatherCard.style.display = 'block';
        weatherDataView.style.display = 'none';
        weatherSkeleton.style.display = 'flex';
        
        const forecastContainer = document.getElementById('forecast-container');
        const forecastSkeleton = document.getElementById('forecast-skeleton-container');
        forecastContainer.style.display = 'none';
        
        // Show 7 skeletons
        forecastSkeleton.innerHTML = Array(7).fill(`
            <div class="forecast-card card" style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <div class="skeleton" style="width: 80px; height: 20px;"></div>
                <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
                <div class="skeleton" style="width: 100px; height: 15px;"></div>
                <div class="skeleton" style="width: 60px; height: 20px;"></div>
            </div>
        `).join('');
        forecastSkeleton.style.display = 'flex';

        // 2. Fetch data from Open-Meteo
        // We request current conditions AND daily forecast for 7 days
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        currentWeatherData = data.current; // Store globally for overlays
        
        // Save last searched location to LocalStorage
        localStorage.setItem('mausam247_lastLocation', JSON.stringify({ lat, lon, cityName }));
        
        // 3. Update the UI with the real data
        updateCurrentWeatherUI(data.current, cityName);
        
        // 4. Update Forecast UI
        updateForecastUI(data.daily);
        
        // Update Map Location and Marker
        const { icon } = getWeatherCondition(data.current.weather_code, data.current.is_day);
        if (typeof updateMapLocation === 'function') {
            updateMapLocation(lat, lon, cityName, data.current.temperature_2m, icon);
        }
        
        // Update Overlay
        if (typeof updateMapOverlay === 'function') {
            updateMapOverlay();
        }
        
        // 5. Hide skeletons, show actual data
        weatherSkeleton.style.display = 'none';
        weatherDataView.style.display = 'block';
        forecastSkeleton.style.display = 'none';
        forecastContainer.style.display = 'flex';
        
        // Re-initialize icons just in case we changed an icon class dynamically
        lucide.createIcons();
        
    } catch (error) {
        console.error("Error fetching weather:", error);
        
        // Hide loading skeletons and actual data views
        weatherSkeleton.style.display = 'none';
        weatherCard.style.display = 'none';
        
        const forecastContainer = document.getElementById('forecast-container');
        const forecastSkeleton = document.getElementById('forecast-skeleton-container');
        forecastSkeleton.style.display = 'none';
        forecastContainer.style.display = 'none';
        
        // Show the error message
        errorMessage.style.display = 'block';
        lucide.createIcons(); // To render the alert triangle icon!
    }
}

function updateCurrentWeatherUI(current, cityName) {
    // Basic Data
    document.getElementById('cw-temp').textContent = `${formatTemp(current.temperature_2m)}°${currentUnit}`;
    document.getElementById('cw-city').textContent = cityName;
    
    // Detailed Data
    document.getElementById('cw-feels-like').textContent = `${formatTemp(current.apparent_temperature)}°${currentUnit}`;
    document.getElementById('cw-humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('cw-wind').textContent = `${current.wind_speed_10m} km/h`;
    document.getElementById('cw-precip').textContent = `${current.precipitation} mm`;
    
    // Pressure Logic (Low, Normal, High)
    // Standard sea-level pressure is around 1013 hPa
    const pressure = current.surface_pressure;
    let pressureText = "Normal";
    if (pressure < 1000) pressureText = "Low";
    else if (pressure > 1020) pressureText = "High";
    document.getElementById('cw-pressure').textContent = pressureText;
    
    // Weather Condition & Icon
    const { text, icon } = getWeatherCondition(current.weather_code, current.is_day);
    document.getElementById('cw-condition').textContent = text;
    
    // Update the icon
    const iconElement = document.getElementById('cw-icon');
    iconElement.setAttribute('data-lucide', icon);
}

// Helper function to map Open-Meteo WMO weather codes to human-readable text and Lucide icons
function getWeatherCondition(wmoCode, isDay) {
    const codeMap = {
        0: { text: "Clear", icon: isDay ? "sun" : "moon" },
        1: { text: "Mainly Clear", icon: isDay ? "sun" : "moon" },
        2: { text: "Partly Cloudy", icon: "cloud-sun" },
        3: { text: "Cloudy", icon: "cloud" },
        45: { text: "Fog", icon: "cloud-fog" },
        48: { text: "Depositing Rime Fog", icon: "cloud-fog" },
        51: { text: "Light Drizzle", icon: "cloud-drizzle" },
        53: { text: "Moderate Drizzle", icon: "cloud-drizzle" },
        55: { text: "Dense Drizzle", icon: "cloud-drizzle" },
        61: { text: "Light Rain", icon: "cloud-rain" },
        63: { text: "Moderate Rain", icon: "cloud-rain" },
        65: { text: "Heavy Rain", icon: "cloud-rain-wind" },
        71: { text: "Light Snow", icon: "cloud-snow" },
        73: { text: "Moderate Snow", icon: "cloud-snow" },
        75: { text: "Heavy Snow", icon: "cloud-snow" },
        77: { text: "Snow Grains", icon: "cloud-snow" },
        80: { text: "Light Showers", icon: "cloud-rain" },
        81: { text: "Moderate Showers", icon: "cloud-rain" },
        82: { text: "Violent Showers", icon: "cloud-rain-wind" },
        85: { text: "Light Snow Showers", icon: "cloud-snow" },
        86: { text: "Heavy Snow Showers", icon: "cloud-snow" },
        95: { text: "Thunderstorm", icon: "cloud-lightning" },
        96: { text: "Thunderstorm with Hail", icon: "cloud-lightning" },
        99: { text: "Heavy Thunderstorm with Hail", icon: "cloud-lightning" }
    };

    const fallback = { text: "Unknown", icon: "cloud" };
    return codeMap[wmoCode] || fallback;
}

// Function to render the 7-day forecast cards
function updateForecastUI(daily) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = ''; // Clear old data

    // The 'daily' object contains arrays for each variable.
    // E.g., daily.time is an array of 7 dates.
    for (let i = 0; i < daily.time.length; i++) {
        const dateObj = new Date(daily.time[i]);
        // Get day name (e.g., "Monday") - Use "Today" for the first item
        const dayName = i === 0 ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        
        const { text, icon } = getWeatherCondition(daily.weather_code[i], 1); // 1 = isDay (assume daytime icon for daily forecast)
        
        const maxTemp = formatTemp(daily.temperature_2m_max[i]);
        const minTemp = formatTemp(daily.temperature_2m_min[i]);
        const precipProb = daily.precipitation_probability_max[i];
        const precipSum = daily.precipitation_sum[i];
        const windSpeed = Math.round(daily.wind_speed_10m_max[i]);

        const cardHTML = `
            <div class="forecast-card card">
                <div class="forecast-day">${dayName}</div>
                <i data-lucide="${icon}" class="forecast-icon"></i>
                <div class="forecast-condition">${text}</div>
                <div class="forecast-temps">
                    <span class="forecast-temp-min">${minTemp}°</span> — <span>${maxTemp}°</span>
                </div>
                <div class="forecast-details">
                    <div class="forecast-detail-item">
                        <i data-lucide="cloud-rain"></i>
                        <span>${precipProb}% • ${precipSum}mm</span>
                    </div>
                    <div class="forecast-detail-item">
                        <i data-lucide="wind"></i>
                        <span>${windSpeed} km/h</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add to container
        forecastContainer.innerHTML += cardHTML;
    }
}

// --- Leaflet Map Integration ---
// Leaflet is an open-source JavaScript library for interactive maps.

// 1. Initialize the map
// We center it roughly on India to start, with a zoom level of 5.
const map = L.map('weather-map').setView([20.5937, 78.9629], 5);

// 2. Add the base map tiles through CARTO's hosted basemap service.
// The basemap uses OpenStreetMap data without sending browser traffic to
// the volunteer-operated OSM tile servers.
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
}).addTo(map);

// 3. Create a custom marker variable (initially null)
let currentMarker = null;

// Function to update the map and marker when a city is selected
function updateMapLocation(lat, lon, cityName, temp, icon) {
    // Move the map to the new location
    map.setView([lat, lon], 10);
    
    // Remove the old marker if it exists
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    // Create the custom HTML for our marker
    const markerHTML = `
        <div class="weather-marker-content">
            <i data-lucide="${icon}" class="marker-icon"></i>
            <div class="marker-temp">${formatTemp(temp)}°${currentUnit}</div>
        </div>
    `;
    
    // Create the Leaflet divIcon
    const customIcon = L.divIcon({
        className: 'weather-marker',
        html: markerHTML,
        iconSize: [80, 60], // Roughly the size of our custom HTML box
        iconAnchor: [40, 60] // The point of the icon that corresponds to the exact GPS location
    });
    
    // Add the new marker to the map
    currentMarker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    
    // Re-initialize Lucide icons because we injected new HTML with data-lucide tags
    lucide.createIcons();
}

// 4. Handle clicking anywhere on the map
map.on('click', async (e) => {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    // Fetch weather for the exact clicked coordinate. Avoid reverse-geocoding
    // through Nominatim because its public service is not intended for this
    // kind of unrestricted browser traffic.
    fetchWeather(lat, lon, "Selected Location");
});

// --- Stage 10: Device Location ("My Location") ---
// We use the browser's Geolocation API to find where the user is!

const myLocationBtn = document.getElementById('my-location-btn');

// When the user clicks the target button, get location but DO NOT auto-fetch weather yet
myLocationBtn.addEventListener('click', () => {
    getUserLocation(false); 
});

// Function to handle the geolocation request
function getUserLocation(autoFetchWeather = false) {
    // Check if the browser supports geolocation
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }
    
    // Add a spinning effect to the button icon to show it's working
    const icon = myLocationBtn.querySelector('i');
    icon.classList.add('search-spinner'); // Reusing the spin animation
    
    // Request the location
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Remove spinning effect
            icon.classList.remove('search-spinner');
            
            // Update search input text
            searchInput.value = "My Location";
            
            if (autoFetchWeather) {
                // If it's the first launch, fetch everything
                fetchWeather(lat, lon, "My Location");
            } else {
                // If they just clicked the button, only move the map and show a basic marker (no temp yet)
                // We'll pass a default temperature of 0 and a default icon until they click the map or search
                updateMapLocation(lat, lon, "My Location", 0, "map-pin");
            }
        },
        (error) => {
            // Remove spinning effect on error
            icon.classList.remove('search-spinner');
            
            if (error.code === error.PERMISSION_DENIED) {
                console.log("User denied the request for Geolocation.");
                // If they deny it on first launch, they just see the search bar (as requested)
            } else {
                alert("An error occurred while getting your location.");
            }
        }
    );
}

// First Launch Behavior & Last Location
// When the webpage finishes loading, we check if they have visited before.
document.addEventListener('DOMContentLoaded', () => {
    const isFirstLaunch = !localStorage.getItem('mausam247_visited');
    
    if (isFirstLaunch) {
        // Mark that they have now visited
        localStorage.setItem('mausam247_visited', 'true');
        
        // Request location and automatically fetch weather if granted
        getUserLocation(true);
    } else {
        // Not their first time! Let's load the last city they looked at.
        const lastLocStr = localStorage.getItem('mausam247_lastLocation');
        if (lastLocStr) {
            const lastLoc = JSON.parse(lastLocStr);
            fetchWeather(lastLoc.lat, lastLoc.lon, lastLoc.cityName);
            searchInput.value = lastLoc.cityName;
        }
    }
});

// --- Stage 11: Map Overlays ---
let currentOverlayMode = 'none';
let overlayLayer = null;

const overlayBtns = document.querySelectorAll('.overlay-btn');

overlayBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active class
        overlayBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update mode
        currentOverlayMode = e.target.getAttribute('data-overlay');
        updateMapOverlay();
    });
});

function updateMapOverlay() {
    // Remove existing overlay
    if (overlayLayer) {
        map.removeLayer(overlayLayer);
        overlayLayer = null;
    }
    
    // If no mode or no data, stop
    if (currentOverlayMode === 'none' || !currentWeatherData || !currentMarker) return;
    
    const latlng = currentMarker.getLatLng();
    let color = '#3388ff'; // default blue
    let fillOpacity = 0.4;
    
    if (currentOverlayMode === 'temp') {
        const temp = currentWeatherData.temperature_2m;
        if (temp > 30) color = '#ef4444'; // Red (Hot)
        else if (temp > 20) color = '#f97316'; // Orange (Warm)
        else if (temp > 10) color = '#eab308'; // Yellow (Mild)
        else color = '#3b82f6'; // Blue (Cold)
        fillOpacity = 0.5;
    } 
    else if (currentOverlayMode === 'rain') {
        const rain = currentWeatherData.precipitation;
        if (rain > 10) color = '#1d4ed8'; // Dark blue (Heavy)
        else if (rain > 2) color = '#3b82f6'; // Blue (Moderate)
        else if (rain > 0) color = '#93c5fd'; // Light blue (Light)
        else fillOpacity = 0; // No rain, invisible
    }
    else if (currentOverlayMode === 'wind') {
        const wind = currentWeatherData.wind_speed_10m;
        if (wind > 40) color = '#7c3aed'; // Purple (Strong)
        else if (wind > 20) color = '#a855f7'; // Light purple (Moderate)
        else color = '#d8b4fe'; // Very light purple (Light)
        fillOpacity = 0.4;
    }
    
    // Create a 50km radius circle
    if (fillOpacity > 0) {
        overlayLayer = L.circle(latlng, {
            color: color,
            fillColor: color,
            fillOpacity: fillOpacity,
            radius: 50000 
        }).addTo(map);
    }
}

// --- Stage 14: Auto-Refresh ---
// When the user comes back to this tab after looking at another tab, 
// we should refresh the data so it isn't stale!
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const lastLocStr = localStorage.getItem('mausam247_lastLocation');
        if (lastLocStr) {
            console.log("Tab became visible. Auto-refreshing weather data...");
            const lastLoc = JSON.parse(lastLocStr);
            fetchWeather(lastLoc.lat, lastLoc.lon, lastLoc.cityName);
        }
    }
});

