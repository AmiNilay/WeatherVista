// API Configuration (WeatherAPI)
const API_KEY = '21b12acaf40b4689bdc70217250904'; // Your WeatherAPI key
const BASE_URL = 'https://api.weatherapi.com/v1'; // Use HTTPS
const DEFAULT_CITY = 'Kolkata'; // Default city on load/error

// DOM Elements (ensure these IDs match your HTML)
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const tempToggle = document.getElementById('temp-toggle');
const modeToggle = document.getElementById('mode-toggle');
const currentWeather = document.getElementById('current-weather');
const hourlyForecast = document.getElementById('hourly-forecast');
const dailyForecast = document.getElementById('daily-forecast');
const alerts = document.getElementById('alerts'); // Container for weather alerts
const errorElement = document.getElementById('error-message'); // Dedicated error message display
const loaderElement = document.getElementById('loader-overlay'); // Dedicated loader display
const greeting = document.getElementById('greeting');
const clock = document.getElementById('clock');
const canvas = document.getElementById('weather-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const locationPopup = document.getElementById('location-popup');
const allowLocationBtn = document.getElementById('allow-location');
const denyLocationBtn = document.getElementById('deny-location');
const progressBar = document.getElementById('progress-bar');
const sidebar = document.getElementById('sidebar'); // Sidebar element
const sidebarToggle = document.getElementById('sidebar-toggle'); // Hamburger toggle button
const closeSidebarBtn = document.getElementById('close-sidebar-btn'); // Close button inside sidebar
const backToTop = document.getElementById('back-to-top');
const installButton = document.getElementById('install-app-btn'); // PWA install button in sidebar
const installButtonFooter = document.getElementById('install-app-btn-footer'); // Optional footer install button
// === ADDED: Get local time element ===
const localTimeElement = document.getElementById('local-time');


// State Variables
let isCelsius = true;
let isDarkMode = false;
let particles = [];
let deferredPrompt; // For PWA installation
let currentWeatherData = null; // Store last successful weather data
let animationFrameId = null; // Store animation frame ID for cancellation

// Weather Condition to Emoji Mapping (Keep this updated)
const weatherEmojis = {
    'Clear': '☀️', 'Sunny': '☀️', // Consolidate clear/sunny
    'Partly cloudy': '⛅',
    'Cloudy': '☁️', 'Overcast': '🌥️',
    'Mist': '🌫️', 'Fog': '🌫️',
    'Patchy rain possible': '🌦️', 'Patchy rain nearby': '🌦️', 'Patchy light drizzle': '💧', 'Light drizzle': '💧',
    'Patchy light rain': '🌦️', 'Light rain': '🌦️', 'Light rain shower': '🌦️',
    'Moderate rain at times': '🌧️', 'Moderate rain': '🌧️', 'Moderate or heavy rain shower': '🌧️',
    'Heavy rain at times': '🌧️', 'Heavy rain': '🌧️', 'Torrential rain shower': '⛈️',
    'Patchy snow possible': '🌨️', 'Patchy light snow': '🌨️', 'Light snow': '🌨️', 'Light snow showers': '🌨️',
    'Moderate snow': '❄️', 'Patchy heavy snow': '❄️', 'Heavy snow': '❄️', 'Moderate or heavy snow showers': '❄️',
    'Ice pellets': '🥶', 'Patchy sleet possible': '🌨️', 'Light sleet': '🌨️', 'Moderate or heavy sleet': '🌨️',
    'Light sleet showers': '🌨️', 'Moderate or heavy sleet showers': '🌨️',
    'Thundery outbreaks possible': '⛈️', 'Patchy light rain with thunder': '⛈️', 'Moderate or heavy rain with thunder': '⛈️',
    'Patchy light snow with thunder': '⛈️❄️', 'Moderate or heavy snow with thunder': '⛈️❄️',
    'Blowing snow': '🌬️❄️', 'Blizzard': '🥶❄️', 'Freezing drizzle': '🥶💧', 'Heavy freezing drizzle': '🥶💧',
    'Freezing fog': '🥶🌫️', 'Default': '🌡️'
};

// Levenshtein Distance for Fuzzy Matching (Helper Function)
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[a.length][b.length];
}

// Validate Critical DOM Elements on Startup
function validateDOM() {
    const criticalElements = {
        cityInput, searchBtn, locationBtn, currentWeather, hourlyForecast, dailyForecast, loaderElement, errorElement, sidebar, sidebarToggle, tempToggle, modeToggle, clock, greeting, localTimeElement // Added localTimeElement
        // Add other elements you absolutely need for basic function
    };
    const missing = Object.entries(criticalElements)
                        .filter(([_, element]) => !element)
                        .map(([name, _]) => name);

    if (missing.length > 0) {
        console.error('CRITICAL DOM elements missing:', missing.join(', '));
        if(errorElement) {
            errorElement.textContent = `Initialization Error: Missing required elements (${missing.join(', ')}). App cannot function correctly.`;
            errorElement.style.display = 'block';
        } else {
            alert(`Initialization Error: Missing required elements (${missing.join(', ')}). App cannot function correctly.`);
        }
        // Hide loader if it exists and validation fails
        if (loaderElement) showLoader(false);
        return false;
    }
    console.log("DOM validation successful for critical elements.");
    return true;
}


// --- LOCATION RESOLUTION LOGIC ---
async function resolveLocation(query) {
    try {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) throw new Error('Empty search query provided.');

        let searchQuery = trimmedQuery; // Start with the raw query
        let isHinted = false;

        // --- Heuristics to add country hints (Optional but can help API) ---
        const isIndianPin = /^\d{6}$/.test(trimmedQuery);
        const isUsZip = /^\d{5}(?:-\d{4})?$/.test(trimmedQuery); // Allows 5 or 5+4 digits
        const isUkPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(trimmedQuery);
        const isCaPostalCode = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(trimmedQuery);

        if (isIndianPin) {
            searchQuery = `${trimmedQuery}, India`;
            isHinted = true;
            console.log(`Detected Indian PIN format, using hint: "${searchQuery}"`);
        } else if (isUsZip) {
            searchQuery = `${trimmedQuery}, USA`; // Use USA or US
            isHinted = true;
            console.log(`Detected US ZIP format, using hint: "${searchQuery}"`);
        } else if (isUkPostcode) {
            searchQuery = `${trimmedQuery}, UK`;
            isHinted = true;
            console.log(`Detected UK Postcode format, using hint: "${searchQuery}"`);
        } else if (isCaPostalCode) {
             searchQuery = `${trimmedQuery}, Canada`;
             isHinted = true;
             console.log(`Detected Canada Postal Code format, using hint: "${searchQuery}"`);
        } else {
            console.log(`Assuming city name or other format, using raw query: "${searchQuery}"`);
        }

        // --- Attempt 1: Call WeatherAPI /search.json with potentially hinted query ---
        let data = null;
        try {
            console.log("Attempting search with query:", searchQuery);
            const endpoint = `${BASE_URL}/search.json?key=${API_KEY}&q=${encodeURIComponent(searchQuery)}`;
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`API search failed with status: ${response.status}`);
            data = await response.json();
            if (!data || data.length === 0) console.warn(`Search with query "${searchQuery}" yielded no results.`);
            else console.log(`Search successful with query "${searchQuery}".`);
        } catch (error) {
             console.warn(`Initial search with "${searchQuery}" failed: ${error.message}`);
        }

        // --- Attempt 2 (Fallback): If hinted search failed or yielded no results, try raw query ---
        if (isHinted && (!data || data.length === 0)) {
            console.log(`Hinted search failed or no results, falling back to raw query: "${trimmedQuery}"`);
            try {
                const fallbackEndpoint = `${BASE_URL}/search.json?key=${API_KEY}&q=${encodeURIComponent(trimmedQuery)}`;
                const fallbackResponse = await fetch(fallbackEndpoint);
                if (!fallbackResponse.ok) throw new Error(`Fallback API search failed with status: ${fallbackResponse.status}`);
                const fallbackData = await fallbackResponse.json();
                if (!fallbackData || fallbackData.length === 0) throw new Error(`No location found for "${trimmedQuery}" even after fallback.`);
                console.log("Fallback search successful.");
                data = fallbackData; // Use fallback data
            } catch (fallbackError) {
                 console.error(`Fallback search failed: ${fallbackError.message}`);
                 if (data && data.length > 0) throw new Error(`Initial search failed processing. Fallback failed: ${fallbackError.message}`);
                 else throw new Error(`No location found for "${trimmedQuery}". Initial and fallback searches failed or yielded no results.`);
            }
        } else if (!data || data.length === 0) {
             // If NON-hinted search yielded no results
             throw new Error(`No location found for "${trimmedQuery}".`);
        }

        // --- Process the successful results (from either attempt) ---
        return processSearchResults(data, trimmedQuery);

    } catch (error) {
        console.error('Location resolution error:', error.message);
        throw new Error(`Could not resolve location "${query}". ${error.message}`);
    }
}

function processSearchResults(data, originalQuery) {
     const nameCorrections = { 'Shiliguri': 'Siliguri' };
     const PRIMARY_COUNTRY = 'india';
     let bestMatch = null;
     let minDistance = Infinity;
     let primaryCountryMatchFound = false;
     const lowerOriginalQueryName = originalQuery.toLowerCase().split(',')[0].trim();

     console.log(`Processing ${data.length} search results for query "${originalQuery}" (comparing against "${lowerOriginalQueryName}")`);

     for (const location of data) {
         const normalizedName = nameCorrections[location.name] || location.name;
         const lowerNormalizedName = normalizedName.toLowerCase();
         const distance = levenshteinDistance(lowerOriginalQueryName, lowerNormalizedName);
         const isPrimary = location.country.toLowerCase() === PRIMARY_COUNTRY;

         console.log(` -> Evaluating: "${location.name}", ${location.region}, ${location.country} (Normalized: "${normalizedName}", IsPrimary: ${isPrimary}, Dist: ${distance})`);

         if (isPrimary) {
             if (lowerNormalizedName === lowerOriginalQueryName) {
                 bestMatch = location;
                 console.log(`    FOUND: Exact primary country match.`);
                 break;
             }
             else if (!primaryCountryMatchFound || distance < minDistance) {
                 minDistance = distance;
                 bestMatch = location;
                 primaryCountryMatchFound = true;
                 console.log(`    Selected: Best primary country match so far (Dist: ${distance}).`);
             }
         } else if (!primaryCountryMatchFound && distance < minDistance) {
             minDistance = distance;
             bestMatch = location;
             console.log(`    Selected: Best non-primary match so far (No primary found yet, Dist: ${distance}).`);
         } else {
             console.log(`    Skipped: Not better than current best match.`);
         }
     }

     if (!bestMatch) {
         if (data.length > 0) {
             console.warn("Could not determine best match with prioritization logic, selecting first result from API as fallback.");
             bestMatch = data[0];
         } else {
             throw new Error(`Internal Error: No search results provided to processSearchResults for "${originalQuery}".`);
         }
     }
     console.log('Final selected location:', bestMatch);
     return {
         name: bestMatch.name, region: bestMatch.region || '', country: bestMatch.country, lat: bestMatch.lat, lon: bestMatch.lon
     };
}


// --- WEATHER DATA FETCHING AND DISPLAY ---
async function getWeather(query) {
    if (!validateDOM()) return;
    showLoader(true); clearError();
    try {
        console.log(`Getting weather for query: "${query}"`);
        const locationData = await resolveLocation(query);
        console.log("Resolved location:", locationData);
        // Use the resolved lat/lon for the forecast API call
        const forecastUrl = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${locationData.lat},${locationData.lon}&days=7&aqi=yes&alerts=yes`;
        console.log("Fetching forecast from:", forecastUrl);
        const response = await fetch(forecastUrl);
        if (!response.ok) {
             let apiErrorMessage = `HTTP error ${response.status}`;
             try { const errorData = await response.json(); if (errorData?.error?.message) apiErrorMessage = errorData.error.message; } catch (e) { console.warn("Could not parse error response body"); }
            throw new Error(`Weather API request failed: ${apiErrorMessage}`);
        }
        const data = await response.json();
        console.log("Weather data received:", data);
        if (data.error) throw new Error(`Weather API error: ${data.error.message}`);
        currentWeatherData = data; // Store the full response
        displayCurrentWeather(data);
        displayHourlyForecast(data.forecast.forecastday[0]?.hour || []);
        displayDailyForecast(data.forecast.forecastday || []);
        displayAlerts(data.alerts);
        if (ctx) animateWeather(data.current.condition.text);
        localStorage.setItem('lastCity', data.location.name); // Save resolved city name
        console.log(`Saved lastCity: ${data.location.name}`);
    } catch (error) {
        console.error('Error in getWeather:', error);
        currentWeatherData = null; // Clear stored data on error
        showError(error.message || 'An unknown error occurred while fetching weather.');
        clearWeatherDisplayOnError();
    } finally {
        showLoader(false);
    }
}

function displayCurrentWeather(data) {
    if (!currentWeather || !data || !data.location || !data.current) {
        console.error("Missing data or DOM element for current weather display.");
        clearWeatherDisplayOnError(); // Clear potentially stale data
        return;
    }

    const location = data.location;
    const current = data.current;

    const temp = isCelsius ? current.temp_c : current.temp_f;
    const feelsLike = isCelsius ? current.feelslike_c : current.feelslike_f;
    const conditionText = current.condition?.text || 'N/A';
    const aqiValue = current.air_quality ? (current.air_quality['us-epa-index'] || 'N/A') : 'N/A';
    const humidity = current.humidity ?? 'N/A';
    const wind = current.wind_kph ?? 'N/A';
    const pressure = current.pressure_mb ?? 'N/A';
    const uv = current.uv ?? 'N/A';

    const locationName = `${location.name}${location.region ? ', ' + location.region : ''}, ${location.country}`;
    document.getElementById('location').textContent = locationName;

    // === ADDED: Display Local Time ===
    if (localTimeElement && location.localtime_epoch && location.tz_id) {
        try {
            const localDate = new Date(location.localtime_epoch * 1000);
            const timeOptions = {
                timeZone: location.tz_id,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            };
            localTimeElement.textContent = `Local Time: ${localDate.toLocaleTimeString('en-US', timeOptions)}`;
        } catch (e) {
            console.error("Error formatting local time:", e);
            localTimeElement.textContent = 'Local Time: N/A';
            // Fallback using the raw string if formatting fails
            // if (location.localtime) {
            //     localTimeElement.textContent = `Local Time: ${location.localtime.split(' ')[1]}`;
            // }
        }
    } else if (localTimeElement) {
        localTimeElement.textContent = 'Local Time: N/A';
    }
    // ===================================

    document.getElementById('condition').textContent = conditionText;
    document.getElementById('temp').textContent = `${Math.round(temp)}°${isCelsius ? 'C' : 'F'}`;
    document.getElementById('feels-like').textContent = `Feels like ${Math.round(feelsLike)}°${isCelsius ? 'C' : 'F'}`;
    document.getElementById('humidity').textContent = `${humidity}%`;
    document.getElementById('wind').textContent = `${wind} km/h`;
    document.getElementById('pressure').textContent = `${pressure} hPa`;
    document.getElementById('aqi').textContent = `${aqiValue}`;
    document.getElementById('uv').textContent = `${uv}`;

    const iconElement = document.getElementById('weather-icon');
    if (iconElement && current.condition?.icon) {
         iconElement.src = `https:${current.condition.icon}`;
         iconElement.alt = conditionText;
         iconElement.style.display = 'inline-block';
    } else if (iconElement) {
         iconElement.style.display = 'none';
    }

    const quoteElement = document.getElementById('quote');
    if(quoteElement) {
        quoteElement.textContent = getWeatherQuote(conditionText);
    }

    // Ensure the section is visible after population
    currentWeather.style.visibility = 'visible';
    currentWeather.style.opacity = '1';
}

function displayHourlyForecast(hourlyData) {
    if (!hourlyForecast) return; const container = hourlyForecast.querySelector('.forecast-container');
    if (!container) { console.error("Hourly container not found."); return; }
    container.innerHTML = '';
    if (!Array.isArray(hourlyData) || hourlyData.length === 0) { container.innerHTML = '<p>Hourly forecast unavailable.</p>'; return; }
    const nowEpoch = Math.floor(Date.now() / 1000);
    // Show next 12 hours from now
    const relevantHours = hourlyData.filter(hour => hour.time_epoch >= nowEpoch).slice(0, 12);
    if (relevantHours.length === 0) {
         container.innerHTML = '<p>No future hourly data for today.</p>';
         return;
    }
    relevantHours.forEach(hour => {
        const temp = isCelsius ? hour.temp_c : hour.temp_f;
        const conditionText = hour.condition?.text || 'N/A';
        const emoji = getWeatherEmoji(conditionText);
        const hourTime = new Date(hour.time_epoch * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const card = document.createElement('div'); card.classList.add('forecast-card'); if (isDarkMode) card.classList.add('dark');
        card.innerHTML = `<p class="time">${hourTime}</p><p class="temp">${Math.round(temp)}°${isCelsius ? 'C' : 'F'}</p><p class="condition">${conditionText}</p><p class="emoji">${emoji}</p>`;
        container.appendChild(card);
    });
    hourlyForecast.style.visibility = 'visible'; hourlyForecast.style.opacity = '1';
}

function displayDailyForecast(dailyData) {
    if (!dailyForecast) return; const container = dailyForecast.querySelector('.forecast-container');
    if (!container) { console.error("Daily container not found."); return; }
    container.innerHTML = '';
    if (!Array.isArray(dailyData) || dailyData.length === 0) { container.innerHTML = '<p>Daily forecast unavailable.</p>'; return; }
    dailyData.forEach(dayEntry => {
        const day = dayEntry.day; if (!day) return;
        const date = new Date(dayEntry.date_epoch * 1000); const dayName = getForecastDayName(date);
        const maxTemp = isCelsius ? day.maxtemp_c : day.maxtemp_f; const minTemp = isCelsius ? day.mintemp_c : day.mintemp_f;
        const conditionText = day.condition?.text || 'N/A'; const emoji = getWeatherEmoji(conditionText);
        const card = document.createElement('div'); card.classList.add('forecast-card'); if (isDarkMode) card.classList.add('dark');
        card.innerHTML = `<p class="time">${dayName}</p><p class="temp-range">H:${Math.round(maxTemp)}° L:${Math.round(minTemp)}°</p><p class="condition">${conditionText}</p><p class="emoji">${emoji}</p>`;
        container.appendChild(card);
    });
    dailyForecast.style.visibility = 'visible'; dailyForecast.style.opacity = '1';
}

function getForecastDayName(date) {
    const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    // Reset time component for accurate date comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) return 'Today';
    if (compareDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function displayAlerts(alertsData) {
    if (!alerts) return; alerts.innerHTML = '';
    const activeAlerts = alertsData?.alert;
    if (Array.isArray(activeAlerts) && activeAlerts.length > 0) {
        alerts.style.display = 'block';
        alerts.style.visibility = 'visible'; // Ensure visibility
        alerts.style.opacity = '1';        // Ensure opacity
        alerts.innerHTML = '<h2>Weather Alerts</h2>';
        activeAlerts.forEach(alert => {
            const div = document.createElement('div'); div.classList.add('alert-item');
            const headline = alert.headline || alert.event || 'Weather Alert';
            const description = alert.desc || 'No further details.';
            const effective = alert.effective ? new Date(alert.effective).toLocaleString() : 'N/A';
            const expires = alert.expires ? new Date(alert.expires).toLocaleString() : 'N/A';
            div.innerHTML = `<strong>${headline}</strong><p>${description}</p><small>Effective: ${effective} | Expires: ${expires}</small>`;
            alerts.appendChild(div);
        });
    } else {
        alerts.style.display = 'none';
        alerts.style.visibility = 'hidden';
        alerts.style.opacity = '0';
    }
}

function getWeatherEmoji(conditionText) {
    if (!conditionText) return weatherEmojis['Default']; const lowerCondition = conditionText.toLowerCase();
    // Prioritize specific keywords
    if (lowerCondition.includes('thunder')) return '⛈️';
    if (lowerCondition.includes('snow') || lowerCondition.includes('blizzard')) return '❄️'; // Combined snow/blizzard
    if (lowerCondition.includes('ice pellets') || lowerCondition.includes('sleet') || lowerCondition.includes('freezing')) return '🥶'; // Combined freezing/ice
    if (lowerCondition.includes('heavy rain') || lowerCondition.includes('torrential')) return '🌧️';
    if (lowerCondition.includes('rain') || lowerCondition.includes('shower') || lowerCondition.includes('drizzle')) return '🌦️';
    if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) return '🌫️';
    if (lowerCondition.includes('overcast')) return '🌥️';
    if (lowerCondition.includes('cloudy')) return '☁️'; // After overcast
    if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) return '☀️'; // Combined clear/sunny

    // Fallback to general mapping if specific keywords aren't found
    for (const key in weatherEmojis) {
        // Check if the key (case-insensitive) is part of the condition text
        if (lowerCondition.includes(key.toLowerCase())) {
            return weatherEmojis[key];
        }
    }
    return weatherEmojis['Default']; // Absolute fallback
}

function getWeatherQuote(conditionText) {
    const quotes = { 'Clear': 'Clear skies, clear mind. Enjoy!', 'Sunny': 'Sunshine is the best medicine! ☀️', 'Partly cloudy': 'A bit of sun, a bit of shade.', 'Cloudy': "Cozy sweater weather. ☕", 'Overcast': "The clouds are blanketing the sky.", 'Mist': "Misty views ahead.", 'Fog': "Lost in the fog? Drive safe.", 'Rain': "Listen to the rhythm of the rain. 🎶", 'Heavy rain': "It's pouring! Stay dry!", 'Snow': "Winter wonderland! ❄️", 'Thunderstorm': "Nature's light show! Stay safe. ⚡", 'Default': 'Check the conditions and make it a great day!' };
    if (!conditionText) return quotes['Default']; const lowerCondition = conditionText.toLowerCase();
    if (lowerCondition.includes('thunder')) return quotes['Thunderstorm']; if (lowerCondition.includes('snow') || lowerCondition.includes('sleet') || lowerCondition.includes('blizzard')) return quotes['Snow'];
    if (lowerCondition.includes('heavy rain') || lowerCondition.includes('torrential')) return quotes['Heavy rain']; if (lowerCondition.includes('rain') || lowerCondition.includes('shower') || lowerCondition.includes('drizzle')) return quotes['Rain'];
    if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) return quotes['Mist']; if (lowerCondition.includes('overcast')) return quotes['Overcast'];
    if (lowerCondition.includes('cloudy')) return quotes['Cloudy']; if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) return quotes['Sunny'];
    return quotes['Default'];
}

function clearWeatherDisplayOnError() {
    // Reset text content and styles for weather elements
    if (currentWeather) {
        document.getElementById('location').textContent = 'Location';
        if (localTimeElement) localTimeElement.textContent = 'Local Time: --'; // Reset local time
        document.getElementById('condition').textContent = 'Condition';
        document.getElementById('temp').textContent = '--°';
        document.getElementById('feels-like').textContent = 'Feels like --°';
        document.getElementById('humidity').textContent = `--%`;
        document.getElementById('wind').textContent = `-- km/h`;
        document.getElementById('pressure').textContent = `-- hPa`;
        document.getElementById('aqi').textContent = `--`;
        document.getElementById('uv').textContent = `--`;
        const iconElement = document.getElementById('weather-icon');
        if (iconElement) iconElement.style.display = 'none';
        const quoteElement = document.getElementById('quote');
        if(quoteElement) quoteElement.textContent = '';
        currentWeather.style.opacity = '0.5'; // Dim slightly to indicate error state
        currentWeather.style.visibility = 'visible'; // Keep visible but dimmed
    }
    const hourlyContainer = hourlyForecast?.querySelector('.forecast-container');
    if (hourlyContainer) {
        hourlyContainer.innerHTML = '<p>Could not load hourly data.</p>';
        if (hourlyForecast) { hourlyForecast.style.opacity = '0.5'; hourlyForecast.style.visibility = 'visible'; }
    }
    const dailyContainer = dailyForecast?.querySelector('.forecast-container');
    if (dailyContainer) {
        dailyContainer.innerHTML = '<p>Could not load daily data.</p>';
        if (dailyForecast) { dailyForecast.style.opacity = '0.5'; dailyForecast.style.visibility = 'visible'; }
    }
    if (alerts) {
        alerts.style.display = 'none';
        alerts.style.opacity = '0';
        alerts.style.visibility = 'hidden';
    }
    // Optionally clear canvas
    if (ctx && canvas) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}


// --- UI INTERACTIONS & HELPERS ---

function showLoader(show) {
    if (loaderElement) loaderElement.style.display = show ? 'flex' : 'none';
    else console.log(show ? "Loading..." : "Finished loading.");
}

function showError(message) {
    console.error("Error Displayed:", message);
    if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; }
    else alert(message); // Fallback alert
}

function clearError() {
    if (errorElement) { errorElement.textContent = ''; errorElement.style.display = 'none'; }
}

function getLocation() {
    if (!navigator.geolocation) { showError('Geolocation is not supported. Please search manually.'); if(locationPopup) hideLocationPopup(); return; }
    showLoader(true); clearError(); if(locationPopup) hideLocationPopup();
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const query = `${position.coords.latitude},${position.coords.longitude}`;
            console.log('Geolocation successful, fetching weather for coords:', query);
            await getWeather(query);
        },
        (error) => {
            showLoader(false); let message = '', instructions = '';
            switch (error.code) {
                case error.PERMISSION_DENIED: message = 'Location access denied.'; instructions = 'Enable permissions or search manually.'; localStorage.setItem('locationPermissionDenied', 'true'); break;
                case error.POSITION_UNAVAILABLE: message = 'Location unavailable.'; instructions = 'Enable GPS/Location Services or search manually.'; break;
                case error.TIMEOUT: message = 'Location request timed out.'; instructions = 'Try again or search manually.'; break;
                default: message = 'Unknown location error.'; instructions = 'Please search manually.';
            }
            console.error('Geolocation error:', message, error.code, error.message);
            showError(`${message} ${instructions} (Code: ${error.code})`);
            // Load default city only if no previous city was successfully loaded
            if (!localStorage.getItem('lastCity') && !currentWeatherData) {
                 console.log("Loading default city due to geolocation error and no last city.");
                 getWeather(DEFAULT_CITY);
            }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 } // Standard options
    );
}

function showLocationPopup() {
    if (locationPopup && !localStorage.getItem('locationPopupShown') && !localStorage.getItem('locationPermissionDenied')) {
        locationPopup.style.display = 'flex';
        locationPopup.style.visibility = 'visible'; // Make sure it's visible
        locationPopup.style.opacity = '1';
    }
}

function hideLocationPopup() {
    if (locationPopup) {
        locationPopup.style.display = 'none';
        locationPopup.style.visibility = 'hidden';
        locationPopup.style.opacity = '0';
        localStorage.setItem('locationPopupShown', 'true');
    }
}

function updateToggles() {
    if (tempToggle) {
        tempToggle.textContent = isCelsius ? '°F' : '°C';
        const tempTooltip = tempToggle.querySelector('.tooltip');
        if (tempTooltip) tempTooltip.textContent = `Switch to ${isCelsius ? 'Fahrenheit' : 'Celsius'}`;
        tempToggle.setAttribute('aria-label', `Switch to ${isCelsius ? 'Fahrenheit' : 'Celsius'}`);
    }
    if (modeToggle) {
        modeToggle.innerHTML = isDarkMode ? '☀️<span class="tooltip">Light Mode</span>' : '🌙<span class="tooltip">Dark Mode</span>';
        modeToggle.setAttribute('aria-label', `Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`);
    }
    document.body.classList.toggle('dark', isDarkMode);
    if (locationPopup) locationPopup.classList.toggle('dark', isDarkMode);
    // Update card themes if necessary (if cards don't inherit body class styles properly)
    document.querySelectorAll('.forecast-card').forEach(card => card.classList.toggle('dark', isDarkMode));
}

function updateGreeting() {
    if (greeting) {
        const hour = new Date().getHours();
        greeting.textContent = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    }
}

function updateClock() {
    // Displays the USER'S local time in the header
    if (clock) {
        clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', /* second: '2-digit', */ hour12: true });
    }
}

// --- SIDEBAR LOGIC ---

function toggleSidebar() {
    if (!sidebar) return;
    const isActive = sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-active', isActive);

    if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(isActive));

    // Add/Remove listener for clicks outside the sidebar itself
    const listenerMethod = isActive ? 'addEventListener' : 'removeEventListener';
    // Delay adding listener slightly to prevent immediate closure if toggle triggered by touch/click
    setTimeout(() => {
        document.body[listenerMethod]('mousedown', handleClickOutsideSidebar);
        document.body[listenerMethod]('touchstart', handleClickOutsideSidebar, { passive: true }); // Use passive for touchstart
        console.log(isActive ? "Added" : "Removed", "outside click listener for sidebar");
    }, 50); // Small delay
}

function handleClickOutsideSidebar(event) {
    if (!sidebar || !sidebar.classList.contains('active')) return;

    // Check if the click is on the toggle button itself (allow toggle button to handle its own click)
    const isToggleButton = sidebarToggle && sidebarToggle.contains(event.target);
    if (isToggleButton) {
        return; // Let the toggle button's listener handle closing
    }

    // Check if the click is inside the sidebar element
    const isInsideSidebar = sidebar.contains(event.target);

    // If the click is NOT inside the sidebar, close it
    if (!isInsideSidebar) {
        console.log("Clicked outside sidebar area. Closing sidebar.");
        toggleSidebar(); // This removes the listener automatically
    }
}


// --- PWA INSTALLATION ---
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event detected.');
    e.preventDefault(); deferredPrompt = e; showInstallPromotion();
});

function showInstallPromotion() {
    // Check if running as standalone PWA or if dismissed this session
    if (window.matchMedia('(display-mode: standalone)').matches || sessionStorage.getItem('installDismissed')) {
        console.log('App installed or prompt dismissed for this session.');
        hideInstallButtons(); // Ensure buttons are hidden
        return;
    }
    // Show button(s) only if the prompt is available
    if (deferredPrompt) {
        if (installButton) installButton.style.display = 'block';
        if (installButtonFooter) installButtonFooter.style.display = 'block'; // Show footer button too
        console.log('Install button(s) shown.');
    } else {
        console.log('Install prompt not available, buttons remain hidden.');
        hideInstallButtons();
    }
}

function handleInstallClick() {
    if (!deferredPrompt) { console.log('Deferred prompt not available.'); hideInstallButtons(); return; }
    hideInstallButtons(); // Hide buttons immediately
    deferredPrompt.prompt()
        .then(() => {
            console.log('Install prompt shown.');
            return deferredPrompt.userChoice;
        })
        .then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted install prompt.');
            } else {
                console.log('User dismissed install prompt.');
                sessionStorage.setItem('installDismissed', 'true'); // Remember dismissal for the session
            }
            deferredPrompt = null; // Prompt can only be used once
        }).catch(error => {
            console.error('Error during install prompt:', error);
            deferredPrompt = null;
        });
}

function hideInstallButtons() { // Helper to hide all install buttons
    if (installButton) installButton.style.display = 'none';
    if (installButtonFooter) installButtonFooter.style.display = 'none';
}

window.addEventListener('appinstalled', () => {
  console.log('App installed successfully!');
  hideInstallButtons(); // Ensure buttons are hidden after install
  deferredPrompt = null; // Clear prompt reference
});


// --- SCROLL & MISC UI ---
function updateProgressBar() {
    if (!progressBar) return;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) { progressBar.style.width = '0%'; return; }
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const progress = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
}
function toggleBackToTop() {
    if (!backToTop) return;
    if (window.pageYOffset > 300) {
         backToTop.classList.add('show');
    } else {
         backToTop.classList.remove('show');
    }
}

// --- WEATHER ANIMATION ---
function animateWeather(condition) {
    if (!ctx || !canvas) { console.log("Canvas not ready for animation."); return; }
    // Cancel any previous animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("Cancelled previous animation frame.");
    }

    try {
        // Debounced resize handling (using resize listener now) is generally better
        // but ensure canvas dimensions are set if not handled elsewhere
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
             console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
        }
    } catch (e) {
        console.error("Error setting canvas dimensions:", e);
        return; // Don't proceed if canvas setup failed
    }

    particles = []; // Clear existing particles
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    const lowerCondition = condition ? condition.toLowerCase() : '';
    console.log(`Animating weather for condition: "${condition || 'N/A'}"`);

    let animationFunction = null;

    // Determine which animation to run based on condition
    if (lowerCondition.includes('thunder')) { setupRain(true); animationFunction = animateRain; }
    else if (lowerCondition.includes('snow') || lowerCondition.includes('sleet') || lowerCondition.includes('ice pellets') || lowerCondition.includes('blizzard')) { setupSnow(); animationFunction = animateSnow; }
    else if (lowerCondition.includes('rain') || lowerCondition.includes('shower') || lowerCondition.includes('drizzle')) { setupRain(); animationFunction = animateRain; }
    else if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) { setupFog(); animationFunction = animateFog; }
    else if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) { setupSunny(); animationFunction = animateSunny; }
    else if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) { setupCloudy(); animationFunction = animateCloudy; }
    else { console.log("No specific animation for this condition."); ctx.clearRect(0, 0, canvas.width, canvas.height); return; } // Clear and exit if no match

    // Start the animation loop
    if (animationFunction) {
         console.log(`Starting animation: ${animationFunction.name}`);
         animationFrameId = requestAnimationFrame(animationFunction);
    }
}
function setupRain(heavy = false) {
    particles = [];
    const baseDensity = canvas.width < 600 ? 50 : 100;
    const density = heavy ? baseDensity * 2 : baseDensity; // More drops for thunder/heavy
    const baseSpeed = heavy ? 6 : 4;
    const baseLength = heavy ? 15 : 10;
    for (let i = 0; i < density; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * baseSpeed + (baseSpeed / 2),
            length: Math.random() * baseLength + (baseLength / 2)
        });
    }
    console.log(`Setup Rain: ${density} particles`);
}
function setupSnow() {
    particles = [];
    const density = canvas.width < 600 ? 100 : 200;
    for (let i = 0; i < density; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 1 + 0.5, // Slow falling speed
            radius: Math.random() * 2 + 1,
            drift: Math.random() * 1 - 0.5, // Horizontal drift
            opacity: Math.random() * 0.5 + 0.3
        });
    }
    console.log(`Setup Snow: ${density} particles`);
}
function setupFog() {
    particles = [];
    const density = 15; // Fewer, larger particles for fog
    for (let i = 0; i < density; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height * (0.5 + Math.random() * 0.5), // Start lower down
            radius: Math.random() * 80 + 40, // Larger radius
            speed: Math.random() * 0.2 + 0.1, // Very slow speed
            opacity: Math.random() * 0.1 + 0.05 // Low opacity
        });
    }
     console.log(`Setup Fog: ${density} particles`);
}
function setupSunny() {
    particles = []; // No particles for sunny
    console.log("Setup Sunny");
}
function setupCloudy() {
    particles = [];
    const density = canvas.width < 600 ? 3 : 5; // Fewer, larger clouds
    for (let i = 0; i < density; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height * (0.1 + Math.random() * 0.3), // Higher up
            radius: Math.random() * 100 + 80, // Large radius
            speed: Math.random() * 0.3 + 0.1, // Slow drift
            opacity: Math.random() * 0.3 + 0.4 // Higher opacity than fog
        });
    }
     console.log(`Setup Cloudy: ${density} particles`);
}
function animateRain() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Set style based on dark mode
    ctx.strokeStyle = isDarkMode ? 'rgba(174, 194, 224, 0.6)' : 'rgba(100, 120, 150, 0.7)';
    ctx.lineWidth = 1.5; // Slightly thicker drops

    particles.forEach((p, index) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.length);
        ctx.stroke();
        p.y += p.speed;
        // Reset particle when it goes off screen
        if (p.y > canvas.height) {
            particles[index].y = -p.length; // Start just above the screen
            particles[index].x = Math.random() * canvas.width;
        }
    });
    animationFrameId = requestAnimationFrame(animateRain); // Continue the loop
}
function animateSnow() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, index) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`; // White snowflakes
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speed;
        p.x += p.drift; // Apply horizontal drift

        // Reset particle position if it goes off screen
        if (p.y > canvas.height + p.radius) { // Check bottom edge
            particles[index].y = -p.radius;
            particles[index].x = Math.random() * canvas.width;
        }
        // Wrap around horizontally
        if (p.x < -p.radius) particles[index].x = canvas.width + p.radius;
        if (p.x > canvas.width + p.radius) particles[index].x = -p.radius;
    });
    animationFrameId = requestAnimationFrame(animateSnow);
}
function animateFog() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fogColor = isDarkMode ? 'rgba(100, 100, 110,' : 'rgba(180, 180, 180,'; // Adjust color slightly for dark mode

    particles.forEach((p) => {
        // Create a radial gradient for soft edges
        const gradient = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
        gradient.addColorStop(0, `${fogColor} ${p.opacity})`); // Inner color
        gradient.addColorStop(1, `${fogColor} 0)`);          // Outer transparent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.speed; // Move horizontally

        // Wrap around horizontally
        if (p.x > canvas.width + p.radius) p.x = -p.radius;
        if (p.x < -p.radius) p.x = canvas.width + p.radius; // Handle wrapping from left
    });
    animationFrameId = requestAnimationFrame(animateFog);
}
function animateSunny() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sunX = canvas.width * 0.8; // Position sun top-right
    const sunY = canvas.height * 0.2;
    const sunRadius = Math.min(canvas.width, canvas.height) * 0.1;

    // Draw outer glow
    const gradient = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, sunRadius * 1.5);
    gradient.addColorStop(0, 'rgba(255, 223, 0, 0.8)'); // Yellowish center
    gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');  // Orangish transparent edge

    ctx.fillStyle = gradient;
    ctx.fillRect(sunX - sunRadius * 1.5, sunY - sunRadius * 1.5, sunRadius * 3, sunRadius * 3); // Draw glow larger than sun

    // Draw sun disk
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 215, 0, 1)'; // Solid yellow sun
    ctx.fill();
    // No need to request another frame for static sun
}
function animateCloudy() {
     if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cloudColor = isDarkMode ? 'rgba(120, 130, 140,' : 'rgba(200, 200, 200,'; // Darker clouds in dark mode

    particles.forEach((p) => {
        // Create a radial gradient for soft cloud appearance
        const gradient = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius);
        gradient.addColorStop(0, `${cloudColor} ${p.opacity})`);
        gradient.addColorStop(1, `${cloudColor} 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.speed; // Move horizontally

        // Wrap around horizontally
        if (p.x > canvas.width + p.radius) p.x = -p.radius;
        if (p.x < -p.radius) p.x = canvas.width + p.radius;
    });
    animationFrameId = requestAnimationFrame(animateCloudy);
}

// --- INITIALIZATION & EVENT LISTENERS ---

function loadPreferences() {
    // Temperature Unit
    isCelsius = localStorage.getItem('isCelsius') !== 'false'; // Default to true (Celsius) if not set or 'true'

    // Dark Mode
    const savedDarkMode = localStorage.getItem('isDarkMode');
    if (savedDarkMode === null && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        // Apply system preference only if no user preference is saved
        isDarkMode = true;
        console.log("Applying system dark mode preference.");
        localStorage.setItem('isDarkMode', 'true'); // Optionally save the detected preference
    } else {
        // Use saved preference, default to false (light mode) if not set
        isDarkMode = savedDarkMode === 'true';
    }
    updateToggles(); // Apply loaded preferences to UI

    // Last City & Initial Weather Fetch
    const lastCity = localStorage.getItem('lastCity');
    const initialQuery = lastCity || DEFAULT_CITY;
    console.log(`Initializing weather with query: "${initialQuery}"`);
    getWeather(initialQuery); // Fetch weather for last known or default city

    // UI Updates
    updateGreeting();
    updateClock();
    setInterval(updateClock, 30000); // Update header clock every 30 seconds
    showLocationPopup(); // Check if location permission prompt should be shown
    updateProgressBar(); // Initial progress bar state
    toggleBackToTop(); // Initial back-to-top button state
}

function setupEventListeners() {
    // Search
    if (searchBtn && cityInput) {
        searchBtn.addEventListener('click', handleSearch);
        cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
    } else { console.warn("Search elements not found."); }

    // Geolocation
    if (locationBtn) { locationBtn.addEventListener('click', getLocation); }
      else { console.warn("Location button not found."); }

    // Toggles
    if (tempToggle) {
        tempToggle.addEventListener('click', () => {
            isCelsius = !isCelsius;
            localStorage.setItem('isCelsius', String(isCelsius)); // Store as string
            updateToggles();
            // Re-render weather data with the new unit if data exists
            if (currentWeatherData) {
                displayCurrentWeather(currentWeatherData);
                displayHourlyForecast(currentWeatherData.forecast.forecastday[0]?.hour || []);
                displayDailyForecast(currentWeatherData.forecast.forecastday || []);
            } else {
                 // If no data, maybe fetch again? Or just update toggles.
                 console.log("Temperature unit toggled, but no weather data to update.");
            }
        });
    } else { console.warn("Temperature toggle not found."); }

    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            localStorage.setItem('isDarkMode', String(isDarkMode)); // Store as string
            updateToggles();
            // Re-render components affected by theme change if data exists
            if(currentWeatherData) {
                // Re-applying forecast display might re-apply the 'dark' class correctly
                displayHourlyForecast(currentWeatherData.forecast.forecastday[0]?.hour || []);
                displayDailyForecast(currentWeatherData.forecast.forecastday || []);
                animateWeather(currentWeatherData.current?.condition?.text); // Re-run animation with correct colors
            }
        });
    } else { console.warn("Mode toggle not found."); }

    // Location Popup Buttons
    if (allowLocationBtn) { allowLocationBtn.addEventListener('click', getLocation); }
        else { console.warn("Allow location button not found."); }
    if (denyLocationBtn) {
        denyLocationBtn.addEventListener('click', () => {
            hideLocationPopup();
            localStorage.setItem('locationPermissionDenied', 'true');
            console.log('User denied location via popup.');
            // Load default city if no weather has been loaded yet
            if (!currentWeatherData && !localStorage.getItem('lastCity')) {
                getWeather(DEFAULT_CITY);
            }
        });
    } else { console.warn("Deny location button not found."); }

    // --- Sidebar Listeners ---
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (event) => {
             event.stopPropagation(); // Prevent click passing to document listener immediately
             toggleSidebar();
        });
         console.log("Sidebar toggle listener added.");
    } else { console.warn("Sidebar toggle button not found."); }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleSidebar);
        console.log("Sidebar close button listener added.");
    } else { console.warn("Sidebar close button not found."); }

    if (sidebar) {
        // Use event delegation on the sidebar itself for link/button clicks
        sidebar.addEventListener('click', (event) => {
            const target = event.target;
            // Close if an anchor link (#...) or the install button inside is clicked
            if ((target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) || target.closest('#install-app-btn')) {
                console.log("Sidebar link or install button clicked. Closing sidebar.");
                toggleSidebar(); // Close the sidebar
            }
        });
        console.log("Sidebar internal click listener added.");
    } else { console.warn("Sidebar element not found."); }

    // PWA Install Button(s)
    if(installButton) { installButton.addEventListener('click', handleInstallClick); }
        else { console.warn("Sidebar install button not found."); }
    if(installButtonFooter) { installButtonFooter.addEventListener('click', handleInstallClick); }
        else { console.warn("Footer install button not found."); }


    // Back to Top
    if (backToTop) {
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', toggleBackToTop, { passive: true });
    } else { console.warn("Back to top button not found."); }

    // Scroll Progress
    if(progressBar) {
        window.addEventListener('scroll', updateProgressBar, { passive: true });
    } else { console.warn("Progress bar not found."); }

    // Resize Canvas & Debounce Animation
    let resizeTimeout;
    if (canvas) {
        window.addEventListener('resize', () => {
             clearTimeout(resizeTimeout);
             resizeTimeout = setTimeout(() => {
                console.log("Window resized, re-animating weather...");
                 // Ensure canvas dimensions are updated before animating
                try {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                } catch(e){ console.error("Error setting canvas dimensions on resize:", e); return; }

                 if (currentWeatherData?.current?.condition?.text) {
                    animateWeather(currentWeatherData.current.condition.text);
                 } else {
                     // Optional: clear canvas if no weather data
                     if (animationFrameId) cancelAnimationFrame(animationFrameId);
                     animationFrameId = null;
                     if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                 }
             }, 250); // Debounce time: 250ms
        }, { passive: true });
    } else { console.warn("Weather canvas not found."); }

    // System Dark Mode Change Listener
    const darkModeMediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (darkModeMediaQuery) {
        darkModeMediaQuery.addEventListener('change', e => {
            // Only react if the user hasn't explicitly set a preference
            if (localStorage.getItem('isDarkMode') === null) {
                 isDarkMode = e.matches;
                 console.log(`System color scheme changed. Applying dark mode: ${isDarkMode}`);
                 updateToggles(); // Update UI elements
                 // Re-render theme-dependent parts if weather data exists
                if(currentWeatherData) {
                    displayHourlyForecast(currentWeatherData.forecast.forecastday[0]?.hour || []);
                    displayDailyForecast(currentWeatherData.forecast.forecastday || []);
                    animateWeather(currentWeatherData.current?.condition?.text);
                }
            } else {
                 console.log("System color scheme changed, but user preference overrides.");
            }
        });
    }
}

function handleSearch() {
    if (!cityInput) return;
    const query = cityInput.value.trim();
    if (query) {
        getWeather(query); // Fetch weather for the entered query
        cityInput.value = ''; // Clear input field
        cityInput.blur();     // Remove focus from input
    } else {
        showError('Please enter a city, pin code, or zip code.');
        cityInput.focus(); // Set focus back to input for correction
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing Weather App...');
    if (validateDOM()) {
        loadPreferences(); // Load saved settings and fetch initial weather
        setupEventListeners(); // Set up all event listeners
    } else {
        console.error("App initialization failed: Missing critical DOM elements.");
        // Optionally display a user-facing error message on the page itself
        document.body.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Application Error: Could not initialize. Please refresh or contact support.</p>';
    }
});