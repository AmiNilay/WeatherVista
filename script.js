// script.js - Fully Responsive Version
const API_KEY = window.WEATHER_API_KEY;

if (!API_KEY) {
    console.error("%c❌ API KEY MISSING! Add config.js", "color:red;font-size:16px");
}

const BASE_URL = 'https://api.weatherapi.com/v1';
const DEFAULT_CITY = 'Kolkata';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const tempToggle = document.getElementById('temp-toggle');
const modeToggle = document.getElementById('mode-toggle');
const currentWeather = document.getElementById('current-weather');
const hourlyForecast = document.getElementById('hourly-forecast');
const dailyForecast = document.getElementById('daily-forecast');
const alertsSection = document.getElementById('alerts');
const errorElement = document.getElementById('error-message');
const loaderElement = document.getElementById('loader-overlay');
const greeting = document.getElementById('greeting');
const clock = document.getElementById('clock');
const canvas = document.getElementById('weather-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const locationPopup = document.getElementById('location-popup');
const allowBtn = document.getElementById('allow-location');
const denyBtn = document.getElementById('deny-location');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const backToTop = document.getElementById('back-to-top');
const installBtn = document.getElementById('install-app-btn');
const localTimeElement = document.getElementById('local-time');

let isCelsius = true;
let isDarkMode = false;
let currentWeatherData = null;
let deferredPrompt = null;
let particles = [];
let animationFrameId = null;

const weatherEmojis = {
    'Clear': '☀️', 'Sunny': '☀️', 'Partly cloudy': '⛅', 'Cloudy': '☁️', 'Overcast': '🌥️',
    'Mist': '🌫️', 'Fog': '🌫️', 'Rain': '🌧️', 'Heavy rain': '⛈️', 'Snow': '❄️',
    'Thunder': '⛈️', 'Default': '🌡️'
};

function getWeatherEmoji(text) {
    if (!text) return weatherEmojis.Default;
    const t = text.toLowerCase();
    if (t.includes('rain') || t.includes('shower') || t.includes('drizzle')) return '🌧️';
    if (t.includes('snow') || t.includes('sleet')) return '❄️';
    if (t.includes('thunder')) return '⛈️';
    if (t.includes('clear') || t.includes('sunny')) return '☀️';
    if (t.includes('cloud') || t.includes('overcast')) return '☁️';
    if (t.includes('fog') || t.includes('mist')) return '🌫️';
    return weatherEmojis.Default;
}

function getWeatherQuote(text) {
    const t = text.toLowerCase();
    if (t.includes('rain')) return "Listen to the rhythm of the rain 🎶";
    if (t.includes('sunny') || t.includes('clear')) return "Sunshine is the best medicine ☀️";
    return "Enjoy the weather today!";
}

async function getWeather(query) {
    if (!API_KEY) return showError("API key is missing");
    showLoader(true);
    clearError();

    try {
        const res = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes`);
        if (!res.ok) throw new Error("Failed to fetch weather");
        const data = await res.json();
        currentWeatherData = data;

        displayCurrentWeather(data);
        displayHourlyForecast(data.forecast.forecastday[0].hour);
        displayDailyForecast(data.forecast.forecastday);
        displayAlerts(data.alerts?.alert || []);
        if (ctx) animateWeather(data.current.condition.text);

        localStorage.setItem('lastCity', data.location.name);
    } catch (err) {
        showError("Could not load weather. Please try again.");
    } finally {
        showLoader(false);
    }
}

function displayCurrentWeather(data) {
    const loc = data.location;
    const curr = data.current;
    const temp = isCelsius ? curr.temp_c : curr.temp_f;
    const feels = isCelsius ? curr.feelslike_c : curr.feelslike_f;

    document.getElementById('location').textContent = `${loc.name}, ${loc.country}`;
    localTimeElement.textContent = `Local Time: ${loc.localtime.split(' ')[1] || '—'}`;
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
    document.getElementById('quote').textContent = getWeatherQuote(curr.condition.text);
}

function displayHourlyForecast(hours) {
    const container = hourlyForecast.querySelector('.forecast-container');
    container.innerHTML = '';
    const now = Math.floor(Date.now() / 1000);
    const relevant = hours.filter(h => h.time_epoch >= now).slice(0, 12);

    relevant.forEach(h => {
        const temp = isCelsius ? h.temp_c : h.temp_f;
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="time">${new Date(h.time_epoch * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</p>
            <p class="temp">${Math.round(temp)}°</p>
            <p class="condition">${h.condition.text}</p>
            <p class="emoji">${getWeatherEmoji(h.condition.text)}</p>
        `;
        container.appendChild(card);
    });
}

function displayDailyForecast(days) {
    const container = dailyForecast.querySelector('.forecast-container');
    container.innerHTML = '';
    days.forEach(d => {
        const day = d.day;
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="time">${getForecastDayName(new Date(d.date))}</p>
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
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
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
    alerts.forEach(a => {
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.style.background = '#fef3c7';
        div.style.borderRadius = '16px';
        div.style.marginBottom = '12px';
        div.innerHTML = `<strong>${a.headline}</strong><p>${a.desc}</p>`;
        alertsSection.appendChild(div);
    });
}

function showLoader(show) { loaderElement.style.display = show ? 'flex' : 'none'; }
function showError(msg) { errorElement.textContent = msg; errorElement.style.display = 'block'; }
function clearError() { errorElement.style.display = 'none'; }

function updateToggles() {
    tempToggle.textContent = isCelsius ? '°F' : '°C';
    modeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    document.body.classList.toggle('dark', isDarkMode);
}

function updateGreeting() {
    const h = new Date().getHours();
    greeting.textContent = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
}

function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Canvas Animation (Full)
function animateWeather(condition) {
    if (!ctx || !canvas) return;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    particles = [];

    const lower = condition.toLowerCase();
    if (lower.includes('rain')) { setupRain(); animationFrameId = requestAnimationFrame(animateRain); }
    else if (lower.includes('snow')) { setupSnow(); animationFrameId = requestAnimationFrame(animateSnow); }
    else if (lower.includes('fog') || lower.includes('mist')) { setupFog(); animationFrameId = requestAnimationFrame(animateFog); }
    else if (lower.includes('clear') || lower.includes('sunny')) { setupSunny(); animationFrameId = requestAnimationFrame(animateSunny); }
    else { setupCloudy(); animationFrameId = requestAnimationFrame(animateCloudy); }
}

function setupRain() {
    for (let i = 0; i < 90; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 12 + 8,
            length: Math.random() * 18 + 10
        });
    }
}

function setupSnow() {
    for (let i = 0; i < 140; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 2.5 + 0.5,
            radius: Math.random() * 3.5 + 1,
            drift: Math.random() * 1.2 - 0.6
        });
    }
}

function setupFog() {
    for (let i = 0; i < 18; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.6 + 80,
            radius: Math.random() * 90 + 50,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}

function setupSunny() { particles = []; }

function setupCloudy() {
    for (let i = 0; i < 7; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: 60 + Math.random() * 90,
            radius: 85 + Math.random() * 70,
            speed: 0.15 + Math.random() * 0.35
        });
    }
}

function animateRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = isDarkMode ? 'rgba(165, 200, 255, 0.75)' : 'rgba(70, 110, 180, 0.65)';
    ctx.lineWidth = 2.2;
    particles.forEach(p => {
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
    ctx.fillStyle = isDarkMode ? 'rgba(240, 248, 255, 0.95)' : 'rgba(255,255,255,0.95)';
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speed;
        p.x += p.drift;
        if (p.y > canvas.height) p.y = -10;
    });
    animationFrameId = requestAnimationFrame(animateSnow);
}

function animateFog() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = isDarkMode ? 'rgba(180,190,210,' : 'rgba(210,220,240,';
    particles.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius*0.2, p.x, p.y, p.radius);
        grad.addColorStop(0, color + '0.18)');
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
    const cx = canvas.width * 0.78;
    const cy = canvas.height * 0.18;
    const r = 58;
    const glow = ctx.createRadialGradient(cx, cy, r*0.6, cx, cy, r*2.5);
    glow.addColorStop(0, 'rgba(255, 230, 100, 0.7)');
    glow.addColorStop(1, 'rgba(255, 180, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx-r*2.2, cy-r*2.2, r*4.4, r*4.4);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdd44';
    ctx.fill();
    animationFrameId = requestAnimationFrame(animateSunny);
}

function animateCloudy() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = isDarkMode ? 'rgba(160,170,190,' : 'rgba(190,200,220,';
    particles.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius*0.3, p.x, p.y, p.radius);
        grad.addColorStop(0, color + '0.38)');
        grad.addColorStop(1, color + '0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.speed;
        if (p.x > canvas.width + 180) p.x = -180;
    });
    animationFrameId = requestAnimationFrame(animateCloudy);
}

function setupEventListeners() {
    searchBtn.addEventListener('click', () => {
        const q = cityInput.value.trim();
        if (q) getWeather(q);
        cityInput.value = '';
    });

    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => getWeather(`${pos.coords.latitude},${pos.coords.longitude}`));
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

    sidebarToggle.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) sidebar.classList.remove('open');
        });
    });

    allowBtn.addEventListener('click', () => { locationPopup.style.display = 'none'; });
    denyBtn.addEventListener('click', () => { locationPopup.style.display = 'none'; });

    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => backToTop.classList.toggle('show', window.scrollY > 500));

    window.addEventListener('beforeinstallprompt', e => {
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            installBtn.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    updateClock();
    setInterval(updateClock, 30000);
    updateToggles();
    setupEventListeners();

    const lastCity = localStorage.getItem('lastCity') || DEFAULT_CITY;
    getWeather(lastCity);

    if (!localStorage.getItem('locationPopupShown')) {
        setTimeout(() => {
            locationPopup.style.display = 'flex';
            localStorage.setItem('locationPopupShown', 'true');
        }, 1200);
    }
});