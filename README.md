# 🌦️ WeatherVista

<p align="center">
  <img src="assets/logo.png" alt="WeatherVista logo" width="110">
</p>

<p align="center">
  A modern, responsive Progressive Web App for real-time weather conditions, forecasts, alerts, and dynamic weather animations.
</p>

<p align="center">
  <a href="https://aminilay.github.io/WeatherVista/">
    <strong>View Live Website</strong>
  </a>
</p>

---

## Overview

WeatherVista lets you check the weather for your current location or search for cities, postal codes, and ZIP codes worldwide. It provides current conditions, hourly forecasts, a 7-day outlook, air-quality information, weather alerts, and an installable PWA experience.

The interface is built with Material Design 3 principles, responsive layouts, premium typography, light and dark themes, and weather-responsive canvas animations.

## Features

- Real-time weather conditions
- Current temperature and “feels like” temperature
- Humidity, wind speed, atmospheric pressure, AQI, and UV index
- Hourly weather forecast
- 7-day weather forecast
- Global city and postal-code search
- Browser geolocation with the **Find Me** button
- Celsius and Fahrenheit unit switching
- Light and dark themes
- Dynamic rain, snow, fog, cloud, and sunshine animations
- Material Design 3-inspired interface
- Responsive navigation drawer
- Mobile, tablet, laptop, desktop, and large-screen support
- Installable Progressive Web App
- Offline app-shell support through a service worker
- Accessible labels, semantic HTML, and keyboard-friendly controls

> Fresh weather information requires an internet connection, even when the PWA app shell is available offline.

## Live

### [Open WeatherVista](https://aminilay.github.io/WeatherVista/)

## Technology Stack

- **HTML5** — Semantic page structure and PWA integration
- **CSS3** — Responsive layouts, custom properties, animations, and Material Design 3 styling
- **Vanilla JavaScript** — API requests, application state, DOM rendering, geolocation, and canvas animations
- **WeatherAPI** — Current conditions, forecasts, air quality, and weather alerts
- **Service Worker API** — App-shell caching and offline PWA support
- **Geolocation API** — Local weather lookup
- **Local Storage API** — Theme, unit, and last-location preferences
- **Canvas API** — Dynamic weather animations
- **Inter** — Modern interface typography

## Responsive Support

WeatherVista is designed for the following screen categories:

| Device | Supported width |
|---|---:|
| Small mobile | 320px and above |
| Mobile | 375px and above |
| Large mobile | 480px and above |
| Tablet | 768px and above |
| Laptop | 1024px and above |
| Desktop | 1280px and above |
| Large desktop | 1440px and above |
| 2K and 4K displays | Supported |

On smaller screens, the navigation becomes a slide-in drawer and forecast cards use touch-friendly horizontal scrolling. On larger screens, the interface expands while maintaining a readable maximum content width.

## Project Structure

```text
weather-vista/
├── assets/
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── logo.png
│   └── site.webmanifest
├── .gitignore
├── config.example.js
├── index.html
├── manifest.json
├── README.md
├── script.js
├── service-worker.js
└── style.css
```

`config.js` is created locally and should not be committed when it contains a real API key.

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/AmiNilay/weather-vista.git
cd weather-vista
```

### 2. Get a WeatherAPI key

Create an account at [WeatherAPI.com](https://www.weatherapi.com/) and copy your API key.

### 3. Create the local configuration file

Create a file named `config.js` in the project root:

```javascript
window.WEATHER_API_KEY = 'YOUR_WEATHERAPI_KEY';
```

You may also create a safe example file named `config.example.js`:

```javascript
window.WEATHER_API_KEY = 'YOUR_WEATHERAPI_KEY';
```

Never place a real API key inside `config.example.js`.

### 4. Protect local configuration

Make sure `.gitignore` contains:

```gitignore
# Local API configuration
config.js
.env
.env.*

# Dependencies and build output
node_modules/
dist/
build/

# Logs
*.log

# Editor and operating-system files
.vscode/
.idea/
.DS_Store
Thumbs.db
```

### 5. Start a local server

Service workers, geolocation, and some browser APIs may not work correctly when opening `index.html` directly with the `file://` protocol.

Using Python:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

You can also use the **Live Server** extension in Visual Studio Code.

## GitHub Pages Deployment

This project can be published from the `master` branch and repository root:

1. Open the GitHub repository.
2. Go to **Settings**.
3. Select **Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `master` branch.
6. Select the `/ (root)` folder.
7. Click **Save**.
8. Wait for GitHub Pages to finish deployment.

The website will normally be available at:

```text
https://aminilay.github.io/weather-vista/
```

## API Key Security

WeatherVista currently runs entirely in the browser. Any WeatherAPI key loaded by frontend JavaScript can be viewed by website visitors through browser developer tools or network requests.

A `.env` file, GitHub Actions secret, minification, obfuscation, or a renamed `config.js` file cannot permanently hide a key when that key is delivered to the browser.

GitHub Pages only hosts static frontend files and cannot securely store a private server-side secret.

For a public production deployment, the recommended architecture is:

```text
Browser → Serverless API proxy → WeatherAPI
```

Suitable proxy platforms include:

- Cloudflare Workers
- Netlify Functions
- Vercel Functions
- Render
- Railway
- A private Node.js backend

The WeatherAPI key should be stored as an environment variable on the proxy platform. The browser should call the proxy instead of calling WeatherAPI directly.

If a frontend key has already been committed or publicly deployed:

1. Revoke or regenerate the exposed key in the WeatherAPI dashboard.
2. Remove it from the repository.
3. Consider removing it from Git history.
4. Configure API restrictions and usage limits when supported.
5. Move future production requests behind a server-side proxy.

## PWA Installation

On supported browsers:

1. Open the live WeatherVista website.
2. Use the browser’s **Install** option or the in-app **Install App** button.
3. Confirm the installation.
4. Launch WeatherVista like a native application.

PWA installation support depends on the browser and operating system.

## Browser Support

WeatherVista works best in recent versions of:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari
- Samsung Internet
- Other modern Chromium-based browsers

Geolocation requires user permission and generally works only on HTTPS websites or localhost.

## Privacy

WeatherVista requests location access only after user permission is granted. Coordinates are used to request local weather information.

The frontend does not intentionally store location coordinates on a private WeatherVista server. Weather requests are processed by WeatherAPI or by the configured API proxy.

For more information, review the [WeatherAPI privacy policy](https://www.weatherapi.com/privacy.aspx).

## Author

**Nilay Naha**

- GitHub: [@AmiNilay](https://github.com/AmiNilay)
- LinkedIn: [Nilay Naha](https://www.linkedin.com/in/nilay-naha/)

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add your feature"
   ```

4. Push your branch:

   ```bash
   git push origin feature/your-feature
   ```

5. Open a pull request.

## License

This project is available under the MIT License. Add a `LICENSE` file to the repository before distributing the project under this license.

## Support

If you find WeatherVista useful:

- Star the repository
- Report bugs through GitHub Issues
- Suggest improvements
- Share the project

---

<p align="center">
  Designed and developed by <a href="https://github.com/AmiNilay">Nilay Naha</a>
</p>

<p align="center">
  Weather data provided by <a href="https://www.weatherapi.com/">WeatherAPI.com</a>
</p>
