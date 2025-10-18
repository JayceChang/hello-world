'use strict';

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    form: $('#search-form'),
    input: $('#city-input'),
    btn: $('#search-btn'),
    loading: $('#loading'),
    error: $('#error'),
    errorText: $('#error-text'),
    retry: $('#retry-btn'),
    card: $('#card'),
    status: $('#status'),
  };

  const dict = {
    zh: {
      today: '今日',
      city: '城市',
      date: '日期',
      currentTemp: '当前温度',
      highLow: '最高/最低',
      precip: '降水概率',
      windMax: '最大风速',
      sunrise: '日出',
      sunset: '日落',
      feel: '体感温度',
      loadingLoc: '正在获取定位…',
      loadingWeather: '正在加载天气…',
      locDenied: '定位不可用或已拒绝，请输入城市名查询。',
      networkErr: '网络错误，请稍后重试。',
      cityNotFound: '未找到该城市，请检查后重试。',
    },
    en: {
      today: 'Today',
      city: 'City',
      date: 'Date',
      currentTemp: 'Current',
      highLow: 'High/Low',
      precip: 'Precipitation',
      windMax: 'Max wind',
      sunrise: 'Sunrise',
      sunset: 'Sunset',
      feel: 'Feels like',
      loadingLoc: 'Getting location…',
      loadingWeather: 'Loading weather…',
      locDenied: 'Location unavailable or denied. Please search by city.',
      networkErr: 'Network error. Please try again later.',
      cityNotFound: 'City not found. Please check and try again.',
    }
  };

  const state = {
    locale: 'zh',
    lastAction: null, // function to retry
    lastQuery: null,
  };

  const t = (key) => (dict[state.locale] || dict.zh)[key] || key;

  // Weather code mapping: https://open-meteo.com/en/docs#weathervariables
  function getWeatherInfo(code) {
    const map = {
      0: { zh: '晴', en: 'Clear', icon: 'clear' },
      1: { zh: '少云', en: 'Mainly clear', icon: 'partly' },
      2: { zh: '多云', en: 'Partly cloudy', icon: 'partly' },
      3: { zh: '阴', en: 'Overcast', icon: 'cloud' },

      45: { zh: '有雾', en: 'Fog', icon: 'fog' },
      48: { zh: '雾凇', en: 'Depositing rime fog', icon: 'fog' },

      51: { zh: '毛毛雨', en: 'Light drizzle', icon: 'drizzle' },
      53: { zh: '小雨', en: 'Drizzle', icon: 'drizzle' },
      55: { zh: '中到大毛毛雨', en: 'Dense drizzle', icon: 'drizzle' },
      56: { zh: '冻毛毛雨', en: 'Freezing drizzle', icon: 'rain' },
      57: { zh: '冻毛毛雨', en: 'Freezing drizzle', icon: 'rain' },

      61: { zh: '小雨', en: 'Light rain', icon: 'rain' },
      63: { zh: '中雨', en: 'Rain', icon: 'rain' },
      65: { zh: '大雨', en: 'Heavy rain', icon: 'rain' },
      66: { zh: '冻雨', en: 'Freezing rain', icon: 'rain' },
      67: { zh: '冻雨', en: 'Freezing rain', icon: 'rain' },

      71: { zh: '小雪', en: 'Light snow', icon: 'snow' },
      73: { zh: '中雪', en: 'Snow', icon: 'snow' },
      75: { zh: '大雪', en: 'Heavy snow', icon: 'snow' },
      77: { zh: '冰粒/雪粒', en: 'Snow grains', icon: 'snow' },

      80: { zh: '阵雨', en: 'Rain showers', icon: 'rain' },
      81: { zh: '阵雨', en: 'Rain showers', icon: 'rain' },
      82: { zh: '强阵雨', en: 'Heavy rain showers', icon: 'rain' },

      85: { zh: '阵雪', en: 'Snow showers', icon: 'snow' },
      86: { zh: '强阵雪', en: 'Heavy snow showers', icon: 'snow' },

      95: { zh: '雷雨', en: 'Thunderstorm', icon: 'storm' },
      96: { zh: '雷雨伴冰雹', en: 'Thunderstorm with hail', icon: 'storm' },
      99: { zh: '雷雨伴冰雹', en: 'Thunderstorm with hail', icon: 'storm' },
    };
    return map[code] || { zh: '未知', en: 'Unknown', icon: 'cloud' };
  }

  function iconSvg(name) {
    const stroke = '#4f7df3';
    const fill = '#4f7df3';
    const gray = '#94a3b8';
    const yellow = '#f59e0b';
    switch (name) {
      case 'clear':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="24" cy="24" r="9" fill="${yellow}"/><g stroke="${yellow}" stroke-width="3" stroke-linecap="round"><line x1="24" y1="4" x2="24" y2="12"/><line x1="24" y1="36" x2="24" y2="44"/><line x1="4" y1="24" x2="12" y2="24"/><line x1="36" y1="24" x2="44" y2="24"/><line x1="9" y1="9" x2="14" y2="14"/><line x1="34" y1="34" x2="39" y2="39"/><line x1="9" y1="39" x2="14" y2="34"/><line x1="34" y1="14" x2="39" y2="9"/></g></svg>`;
      case 'partly':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="16" cy="16" r="7" fill="${yellow}"/><path d="M30 22c5.523 0 10 4.477 10 10H18a8 8 0 0 1 12-10z" fill="${gray}"/></svg>`;
      case 'cloud':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 36h16a8 8 0 0 0 0-16 10 10 0 0 0-19.5-2.5A7 7 0 0 0 18 36z" fill="${gray}"/></svg>`;
      case 'rain':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 24h16a8 8 0 0 0 0-16 10 10 0 0 0-19.5 2.5A7 7 0 0 0 18 24z" fill="${gray}"/><g fill="${fill}" opacity="0.9"><path d="M18 30c0 2-2 4-2 6s2 2 2 0 2-4 2-6-2-2-2 0zm8 0c0 2-2 4-2 6s2 2 2 0 2-4 2-6-2-2-2 0zm8 0c0 2-2 4-2 6s2 2 2 0 2-4 2-6-2-2-2 0z"/></g></svg>`;
      case 'drizzle':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 24h16a8 8 0 0 0 0-16 10 10 0 0 0-19.5 2.5A7 7 0 0 0 18 24z" fill="${gray}"/><g stroke="${fill}" stroke-linecap="round" stroke-width="3" opacity="0.9"><line x1="18" y1="30" x2="18" y2="35"/><line x1="26" y1="30" x2="26" y2="35"/><line x1="34" y1="30" x2="34" y2="35"/></g></svg>`;
      case 'snow':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 24h16a8 8 0 0 0 0-16 10 10 0 0 0-19.5 2.5A7 7 0 0 0 18 24z" fill="${gray}"/><g stroke="${stroke}" stroke-width="2" stroke-linecap="round"><line x1="18" y1="30" x2="18" y2="35"/><line x1="18" y1="35" x2="16" y2="33"/><line x1="18" y1="35" x2="20" y2="33"/><line x1="26" y1="30" x2="26" y2="35"/><line x1="26" y1="35" x2="24" y2="33"/><line x1="26" y1="35" x2="28" y2="33"/><line x1="34" y1="30" x2="34" y2="35"/><line x1="34" y1="35" x2="32" y2="33"/><line x1="34" y1="35" x2="36" y2="33"/></g></svg>`;
      case 'fog':
        return `<svg class=\"icon\" viewBox=\"0 0 48 48\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><g stroke=\"${gray}\" stroke-width=\"3\" stroke-linecap=\"round\"><line x1=\"8\" y1=\"18\" x2=\"40\" y2=\"18\"/><line x1=\"4\" y1=\"26\" x2=\"36\" y2=\"26\"/><line x1=\"10\" y1=\"34\" x2=\"42\" y2=\"34\"/></g></svg>`;
      case 'storm':
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 24h16a8 8 0 0 0 0-16 10 10 0 0 0-19.5 2.5A7 7 0 0 0 18 24z" fill="${gray}"/><path d="M22 28l6-6-2 6h6l-8 10 2-8h-6z" fill="${fill}"/></svg>`;
      default:
        return `<svg class="icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="24" cy="24" r="10" fill="${gray}"/></svg>`;
    }
  }

  function showLoading(message) {
    els.status.textContent = message || t('loadingWeather');
    els.loading.hidden = false;
    els.card.setAttribute('aria-busy', 'true');
  }

  function hideLoading() {
    els.loading.hidden = true;
    els.card.setAttribute('aria-busy', 'false');
  }

  function showError(message, retryFn) {
    els.errorText.textContent = message || t('networkErr');
    els.error.hidden = false;
    els.retry.onclick = null;
    if (typeof retryFn === 'function') {
      els.retry.onclick = () => {
        els.error.hidden = true;
        retryFn();
      };
    }
  }

  function clearError() {
    els.error.hidden = true;
    els.errorText.textContent = '';
  }

  function formatTemp(v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '-';
    return Math.round(v) + '°C';
  }

  function formatPercent(v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '-';
    return Math.round(v) + '%';
  }

  function formatWind(v, units) {
    if (v === null || v === undefined || Number.isNaN(v)) return '-';
    return Math.round(v) + (units || ' km/h');
  }

  function formatDate(dStr) {
    if (!dStr) return '';
    try {
      // Open-Meteo daily time is like YYYY-MM-DD
      const [y, m, d] = dStr.split('-').map((x) => parseInt(x, 10));
      return `${y}年${m}月${d}日`;
    } catch (_) {
      const d = new Date(dStr);
      if (!isNaN(d)) return d.toLocaleDateString();
      return dStr;
    }
  }

  function formatTimeLocal(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d)) return '-';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function searchCity(q) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    const resp = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) throw new Error('nominatim error');
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      const err = new Error('not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const item = data[0];
    const city = item.display_name?.split(',')[0] || q;
    return { lat: parseFloat(item.lat), lon: parseFloat(item.lon), name: city };
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      url.searchParams.set('format', 'json');
      url.searchParams.set('zoom', '10');
      url.searchParams.set('addressdetails', '1');
      const resp = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error('reverse geocode error');
      const data = await resp.json();
      const addr = data.address || {};
      const name = addr.city || addr.town || addr.village || addr.hamlet || addr.county || data.display_name || '当前位置';
      return name;
    } catch (e) {
      return '当前位置';
    }
  }

  async function fetchWeather(lat, lon) {
    const base = 'https://api.open-meteo.com/v1/forecast';
    const daily = [
      'temperature_2m_max','temperature_2m_min',
      'apparent_temperature_max','apparent_temperature_min',
      'sunrise','sunset','precipitation_sum','precipitation_probability_max','windspeed_10m_max'
    ];
    const url = new URL(base);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('daily', daily.join(','));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const resp = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('open-meteo error');
    const data = await resp.json();
    const d = {
      date: data.daily?.time?.[0] || null,
      currentTemp: data.current_weather?.temperature ?? null,
      weathercode: data.current_weather?.weathercode ?? null,
      tempMax: data.daily?.temperature_2m_max?.[0] ?? null,
      tempMin: data.daily?.temperature_2m_min?.[0] ?? null,
      precipProb: data.daily?.precipitation_probability_max?.[0] ?? null,
      windMax: data.daily?.windspeed_10m_max?.[0] ?? null,
      sunrise: data.daily?.sunrise?.[0] || null,
      sunset: data.daily?.sunset?.[0] || null,
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      units: {
        temp: data.daily_units?.temperature_2m_max || '°C',
        wind: data.daily_units?.windspeed_10m_max || 'km/h',
      }
    };
    return d;
  }

  function renderCard(payload) {
    const info = getWeatherInfo(payload.weathercode);
    const titleZh = info.zh;
    const titleEn = info.en;
    const svg = iconSvg(info.icon);

    const dateStr = formatDate(payload.date);

    els.card.innerHTML = `
      <div class="card__header">
        <div class="card__title">
          <div class="card__city" id="card-city">${escapeHtml(payload.city || '')}</div>
          <div class="card__date">${dateStr}</div>
        </div>
        <div class="badge" aria-hidden="true"></div>
      </div>

      <div class="weather">
        <div class="weather__main">
          ${svg}
          <div class="temp">
            <div class="temp__current" aria-label="${t('currentTemp')}">${formatTemp(payload.currentTemp)}</div>
            <div class="temp__desc" aria-label="天气">${state.locale === 'zh' ? titleZh : titleEn}</div>
          </div>
        </div>
        <div class="weather__meta">
          <div class="meta__item">
            <div class="meta__label">${t('highLow')}</div>
            <div class="meta__value">${formatTemp(payload.tempMax)} / ${formatTemp(payload.tempMin)}</div>
          </div>
          <div class="meta__item">
            <div class="meta__label">${t('precip')}</div>
            <div class="meta__value">${formatPercent(payload.precipProb)}</div>
          </div>
          <div class="meta__item">
            <div class="meta__label">${t('windMax')}</div>
            <div class="meta__value">${formatWind(payload.windMax, ' ' + (payload.units?.wind || 'km/h'))}</div>
          </div>
          <div class="meta__item">
            <div class="meta__label">${t('sunrise')}</div>
            <div class="meta__value">${formatTimeLocal(payload.sunrise)}</div>
          </div>
          <div class="meta__item">
            <div class="meta__label">${t('sunset')}</div>
            <div class="meta__value">${formatTimeLocal(payload.sunset)}</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="footer-note">${state.locale === 'zh' ? '默认中文，内部保留英文映射' : 'Default Chinese, English mapping preserved'}</div>
    `;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function init() {
    clearError();
    showLoading(t('loadingLoc'));

    // Geolocation may require secure context; handle errors gracefully
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const namePromise = reverseGeocode(latitude, longitude);
          const data = await fetchWeather(latitude, longitude);
          const cityName = await namePromise;
          hideLoading();
          renderCard({ ...data, city: cityName });
          state.lastAction = () => fetchAndRender(latitude, longitude, cityName);
        } catch (e) {
          hideLoading();
          showError(t('networkErr'), () => init());
        }
      }, (err) => {
        hideLoading();
        showError(t('locDenied'));
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
    } else {
      hideLoading();
      showError(t('locDenied'));
    }
  }

  async function fetchAndRender(lat, lon, cityName) {
    clearError();
    showLoading(t('loadingWeather'));
    try {
      const data = await fetchWeather(lat, lon);
      const name = cityName || await reverseGeocode(lat, lon);
      hideLoading();
      renderCard({ ...data, city: name });
      state.lastAction = () => fetchAndRender(lat, lon, name);
    } catch (e) {
      hideLoading();
      showError(t('networkErr'), () => fetchAndRender(lat, lon, cityName));
    }
  }

  // Events
  els.form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const q = (els.input.value || '').trim();
    if (!q) {
      showError(t('cityNotFound'));
      return;
    }
    clearError();
    showLoading(t('loadingWeather'));
    try {
      const res = await searchCity(q);
      state.lastQuery = res.name;
      await fetchAndRender(res.lat, res.lon, res.name);
    } catch (e) {
      hideLoading();
      if (e && e.code === 'NOT_FOUND') {
        showError(t('cityNotFound'));
      } else {
        showError(t('networkErr'), () => els.form.requestSubmit());
      }
    }
  });

  els.retry.addEventListener('click', () => {
    if (typeof state.lastAction === 'function') state.lastAction();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== els.input) {
      els.input.focus();
      e.preventDefault();
    }
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
