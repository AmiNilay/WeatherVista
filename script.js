// =============================================
//  WeatherVista - Material Design 3 Version
//  Full working script with canvas animation
// =============================================

const API_KEY = window.WEATHER_API_KEY;

if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE' || API_KEY === undefined) {
    console.error("%c❌ API KEY MISSING!\nCreate config.js in the root folder with your WeatherAPI key.", 
                 "color:red; font-size:16px; font-weight:bold");
}

const BASE_URL = 'https://api.weatherapi.com/v1';
const DEFAULT_CITY = 'Kolkata';

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const tempToggle = document.getElementById('temp-toggle');
const modeToggle = document.getElementById('mode-toggle');
const currentWeatherSection = document.getElementById('current-weather');
const hourlySection = document.getElementById('hourly-forecast');
const dailySection = document.getElementById('daily-forecast');
const alertsSection = document.getElementById('alerts');
const errorElement = document.getElementById('error-message');
const loaderElement = document.getElementById('loader-overlay');
const greetingEl = document.getElementById('greeting');
const clockEl = document.getElementById('clock');
const canvas = document.getElementById('weather-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const locationPopup = document.getElementById('location-popup');
const allowBtn = document.getElementById('allow-location');
const denyBtn = document.getElementById('deny-location');
const installBtn = document.getElementById('install-app-btn');
const backToTopBtn = document.getElementById('back-to-top');
const localTimeEl = document.getElementById('local-time');

// State
let isCelsius = true;
let isDarkMode = false;
let currentWeatherData = null;
let deferredPrompt = null;
let particles = [];
let animationFrameId = null;

// Weather Emojis
const weatherEmojis = {
    'Clear': '☀️', 'Sunny': '☀️', 'Partly cloudy': '⛅', 'Cloudy': '☁️', 'Overcast': '🌥️',
    'Mist': '🌫️', 'Fog': '🌫️', 'Rain': '🌧️', 'Heavy rain': '⛈️', 'Snow': '❄️',
    'Thunder': '⛈️', 'Default': '🌡️'
};

function getWeatherEmoji(conditionText) {
    if (!conditionText) return weatherEmojis.Default;
    const lower = conditionText.toLowerCase();
    if (lower.includes('rain') || lower.includes('shower') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('snow') || lower.includes('sleet')) return '❄️';
    if (lower.includes('thunder')) return '⛈️';
    if (lower.includes('clear') || lower.includes('sunny')) return '☀️';
    if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
    if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
    return weatherEmojis.Default;
}

function getWeatherQuote(conditionText) {
    const lower = conditionText.toLowerCase();
    if (lower.includes('rain')) return "Listen to the rhythm of the rain 🎶";
    if (lower.includes('sunny') || lower.includes('clear')) return "Sunshine is the best medicine ☀️";
    return "Check the conditions and make it a great day!";
}

// ================== API CALLS ==================
async function getWeather(query) {
    if (!API_KEY) {
        showError("API key is missing. Please check config.js");
        return;
    }
    showLoader(true);
    clearError();

    try {
        const url = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        currentWeatherData = data;
        displayCurrentWeather(data);
        displayHourlyForecast(data.forecast.forecastday[0].hour);
        displayDailyForecast(data.forecast.forecastday);
        displayAlerts(data.alerts?.alert || []);
        
        if (ctx) animateWeather(data.current.condition.text);
        localStorage.setItem('lastCity', data.location.name);
    } catch (err) {
        console.error(err);
        showError("Could not fetch weather. Please try again.");
        clearWeatherDisplayOnError();
    } finally {
        showLoader(false);
    }
}

// ================== DISPLAY FUNCTIONS ==================
function displayCurrentWeather(data) {
    const loc = data.location;
    const curr = data.current;
    const temp = isCelsius ? curr.temp_c : curr.temp_f;
    const feels = isCelsius ? curr.feelslike_c : curr.feelslike_f;

    document.getElementById('location').textContent = `${loc.name}, ${loc.country}`;
    localTimeEl.textContent = `Local Time: ${loc.localtime.split(' ')[1] || '—'}`;
    document.getElementById('condition').textContent = curr.condition.text;
    document.getElementById('temp').textContent = `${Math.round(temp)}°${isCelsius ? 'C' : 'F'}`;
    document.getElementById('feels-like').textContent = `Feels like ${Math.round(feels)}°`;

    document.getElementById('humidity').textContent = `${curr.humidity}%`;
    document.getElementById('wind').textContent = `${curr.wind_kph} km/h`;
    document.getElementById('pressure').textContent = `${curr.pressure_mb} hPa`;
    document.getElementById('aqi').textContent = curr.air_quality?.['us-epa-index'] || '—';
    document.getElementById('uv').textContent = curr.uv || '—';

    const icon = document.getElementById('weather-icon');
    icon.src = `https:${curr.condition.icon}`;
    icon.alt = curr.condition.text;

    document.getElementById('quote').textContent = getWeatherQuote(curr.condition.text);
}

function displayHourlyForecast(hours) {
    const container = hourlySection.querySelector('.forecast-container');
    container.innerHTML = '';
    const now = Math.floor(Date.now() / 1000);
    const relevantHours = hours.filter(h => h.time_epoch >= now).slice(0, 12);

    relevantHours.forEach(hour => {
        const temp = isCelsius ? hour.temp_c : hour.temp_f;
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="time">${new Date(hour.time_epoch * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</p>
            <p class="temp">${Math.round(temp)}°${isCelsius ? 'C' : 'F'}</p>
            <p class="condition">${hour.condition.text}</p>
            <p class="emoji">${getWeatherEmoji(hour.condition.text)}</p>
        `;
        container.appendChild(card);
    });
}

function displayDailyForecast(days) {
    const container = dailySection.querySelector('.forecast-container');
    container.innerHTML = '';

    days.forEach(dayData => {
        const day = dayData.day;
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="time">${getForecastDayName(new Date(dayData.date))}</p>
            <p class="temp-range">H:${Math.round(isCelsius ? day.maxtemp_c : day.maxtemp_f)}° L:${Math.round(isCelsius ? day.mintemp_c : day.mintemp_f)}°</p>
            <p class="condition">${day.condition.text}</p>
            <p class="emoji">${getWeatherEmoji(day.condition.text)}</p>
        `;
        container.appendChild(card);
    });
}

function getForecastDayName(date) {
    const today = new Date().toDateString();
    if (date.toDateString() === today) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function displayAlerts(alerts) {
    if (!alerts || alerts.length === 0) {
        alertsSection.style.display = 'none';
        return;
    }
    alertsSection.style.display = 'block';
    alertsSection.innerHTML = `<h2 class="section-title">Weather Alerts</h2>`;
    alerts.forEach(alert => {
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.style.background = 'var(--md-sys-color-primary-container)';
        div.style.borderRadius = '16px';
        div.style.marginBottom = '12px';
        div.innerHTML = `<strong>${alert.headline || alert.event}</strong><p>${alert.desc || alert.description}</p>`;
        alertsSection.appendChild(div);
    });
}

// ================== UI HELPERS ==================
function showLoader(show) {
    loaderElement.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearError() {
    errorElement.style.display = 'none';
}

function updateToggles() {
    tempToggle.textContent = isCelsius ? '°F' : '°C';
    modeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    document.body.classList.toggle('dark', isDarkMode);
}

function updateGreeting() {
    const hour = new Date().getHours();
    greetingEl.textContent = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
}

function updateClock() {
    clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ================== CANVAS ANIMATION (Full Original Logic) ==================
function animateWeather(condition) {
    if (!ctx || !canvas) return;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    particles = [];

    const lower = condition.toLowerCase();

    if (lower.includes('rain') || lower.includes('shower')) {
        setupRain(lower.includes('heavy') || lower.includes('thunder'));
        animationFrameId = requestAnimationFrame(animateRain);
    } else if (lower.includes('snow')) {
        setupSnow();
        animationFrameId = requestAnimationFrame(animateSnow);
    } else if (lower.includes('fog') || lower.includes('mist')) {
        setupFog();
        animationFrameId = requestAnimationFrame(animateFog);
    } else if (lower.includes('clear') || lower.includes('sunny')) {
        setupSunny();
        animationFrameId = requestAnimationFrame(animateSunny);
    } else {
        setupCloudy();
        animationFrameId = requestAnimationFrame(animateCloudy);
    }
}

function setupRain(heavy = false) {
    const count = heavy ? 180 : 90;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 12 + 8,
            length: Math.random() * 18 + 10
        });
    }
}

function setupSnow() {
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 2 + 0.5,
            radius: Math.random() * 3 + 1.5,
            drift: Math.random() * 1.5 - 0.75
        });
    }
}

function setupFog() {
    for (let i = 0; i < 18; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7 + 100,
            radius: Math.random() * 90 + 60,
            speed: Math.random() * 0.4 + 0.1
        });
    }
}

function setupSunny() { particles = []; }
function setupCloudy() {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: 80 + Math.random() * 80,
            radius: 90 + Math.random() * 60,
            speed: 0.2 + Math.random() * 0.3
        });
    }
}

function animateRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = isDarkMode ? 'rgba(165, 200, 255, 0.7)' : 'rgba(80, 120, 180, 0.6)';
    ctx.lineWidth = 2;

    particles.forEach((p, i) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.length);
        ctx.stroke();
        p.y += p.speed;
        if (p.y > canvas.height) p.y = -20;
    });
    animationFrameId = requestAnimationFrame(animateRain);
}

function animateSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDarkMode ? 'rgba(240, 250, 255, 0.9)' : 'rgba(255, 255, 255, 0.9)';

    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speed;
        p.x += p.drift;
        if (p.y > canvas.height) p.y = -10;
        if (p.x < 0 || p.x > canvas.width) p.drift *= -1;
    });
    animationFrameId = requestAnimationFrame(animateSnow);
}

function animateFog() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = isDarkMode ? 'rgba(180,190,210,' : 'rgba(210,220,240,';
    particles.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius*0.2, p.x, p.y, p.radius);
        grad.addColorStop(0, color + '0.15)');
        grad.addColorStop(1, color + '0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.speed;
        if (p.x > canvas.width + 100) p.x = -100;
    });
    animationFrameId = requestAnimationFrame(animateFog);
}

function animateSunny() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width * 0.75;
    const cy = canvas.height * 0.22;
    const r = 55;

    const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.2);
    glow.addColorStop(0, 'rgba(255, 220, 80, 0.6)');
    glow.addColorStop(1, 'rgba(255, 180, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r*2, cy - r*2, r*4, r*4);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdd44';
    ctx.fill();
}

function animateCloudy() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = isDarkMode ? 'rgba(160,170,190,' : 'rgba(200,205,220,';
    particles.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius*0.3, p.x, p.y, p.radius);
        grad.addColorStop(0, color + '0.35)');
        grad.addColorStop(1, color + '0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.speed;
        if (p.x > canvas.width + 150) p.x = -150;
    });
    animationFrameId = requestAnimationFrame(animateCloudy);
}

// ================== EVENT LISTENERS & INIT ==================
function setupEventListeners() {
    searchBtn.addEventListener('click', () => {
        const query = cityInput.value.trim();
        if (query) getWeather(query);
        cityInput.value = '';
    });

    cityInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const query = cityInput.value.trim();
            if (query) getWeather(query);
            cityInput.value = '';
        }
    });

    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => getWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
                () => showError("Location access denied or unavailable.")
            );
        }
    });

    tempToggle.addEventListener('click', () => {
        isCelsius = !isCelsius;
        updateToggles();
        if (currentWeatherData) displayCurrentWeather(currentWeatherData);
    });

    modeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        updateToggles();
        if (currentWeatherData && ctx) animateWeather(currentWeatherData.current.condition.text);
    });

    allowBtn.addEventListener('click', () => {
        locationPopup.style.display = 'none';
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
            pos => getWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
            () => showError("Location permission denied.")
        );
    });

    denyBtn.addEventListener('click', () => {
        locationPopup.style.display = 'none';
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        backToTopBtn.classList.toggle('show', window.scrollY > 500);
    });

    // PWA Install
    window.addEventListener('beforeinstallprompt', e => {
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt = null;
            installBtn.style.display = 'none';
        }
    });
}

function loadInitialWeather() {
    const lastCity = localStorage.getItem('lastCity') || DEFAULT_CITY;
    getWeather(lastCity);
}

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    updateClock();
    setInterval(updateClock, 30000);
    updateToggles();
    setupEventListeners();
    loadInitialWeather();

    // Show location popup on first visit
    if (!localStorage.getItem('locationPopupShown')) {
        setTimeout(() => {
            locationPopup.style.display = 'flex';
            localStorage.setItem('locationPopupShown', 'true');
        }, 1200);
    }

    // Canvas resize handler
    window.addEventListener('resize', () => {
        if (canvas && currentWeatherData) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            animateWeather(currentWeatherData.current.condition.text);
        }
    });
});

// Expose for debugging if needed
window.getWeather = getWeather;