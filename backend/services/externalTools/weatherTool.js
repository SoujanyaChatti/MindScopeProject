/**
 * Weather Tool for EnergyAgent
 *
 * Provides weather-aware activity recommendations:
 * - Current weather conditions
 * - Weather forecast for activity planning
 * - Season-appropriate suggestions
 * - Light exposure recommendations based on conditions
 *
 * Uses OpenWeatherMap API (free tier: 60 calls/minute, 1M calls/month)
 *
 * Setup:
 * 1. Get free API key from https://openweathermap.org/api
 * 2. Set environment variable: OPENWEATHER_API_KEY
 */

const axios = require('axios');

class WeatherTool {
  constructor() {
    this.name = 'weather';
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';

    // Cache weather data for 30 minutes to reduce API calls
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes

    // Weather impact on energy and mood
    this.weatherMoodImpact = {
      clear: { energy: 'boost', mood: 'positive', outdoor: 'excellent' },
      clouds: { energy: 'neutral', mood: 'neutral', outdoor: 'good' },
      rain: { energy: 'drain', mood: 'lower', outdoor: 'poor' },
      drizzle: { energy: 'slight drain', mood: 'neutral', outdoor: 'fair' },
      thunderstorm: { energy: 'drain', mood: 'anxiety_trigger', outdoor: 'avoid' },
      snow: { energy: 'drain', mood: 'variable', outdoor: 'fair' },
      mist: { energy: 'neutral', mood: 'calm', outdoor: 'fair' },
      fog: { energy: 'drain', mood: 'lower', outdoor: 'fair' },
      extreme: { energy: 'significant drain', mood: 'stress', outdoor: 'avoid' }
    };

    // Activity suggestions by weather
    this.activitySuggestions = {
      sunny: {
        outdoor: ['Take a walk in the park', 'Sit outside with a book', 'Light gardening', 'Outdoor yoga'],
        indoor: ['Open curtains for natural light', 'Exercise near a window']
      },
      cloudy: {
        outdoor: ['Walking is still good', 'Light outdoor activities'],
        indoor: ['Use bright indoor lights', 'Light therapy lamp if available']
      },
      rainy: {
        outdoor: ['Brief rain walk if light rain (can be calming)'],
        indoor: ['Indoor stretching', 'Dance to music', 'Cozy reading']
      },
      cold: {
        outdoor: ['Bundle up for a short walk', 'Winter outdoor activities'],
        indoor: ['Warm drink ritual', 'Gentle indoor exercise']
      },
      hot: {
        outdoor: ['Early morning or evening walks', 'Swimming if available'],
        indoor: ['Stay hydrated', 'Cool indoor activities']
      }
    };
  }

  /**
   * Get Gemini function declaration schema
   */
  static getSchema() {
    return {
      description: 'Weather data and weather-aware activity recommendations',
      functions: [
        {
          name: 'getCurrentWeather',
          description: 'Get current weather conditions for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name (e.g., "London", "New York")'
              },
              lat: {
                type: 'number',
                description: 'Latitude (alternative to location name)'
              },
              lon: {
                type: 'number',
                description: 'Longitude (alternative to location name)'
              }
            }
          }
        },
        {
          name: 'getForecast',
          description: 'Get weather forecast for upcoming days',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name'
              },
              days: {
                type: 'integer',
                description: 'Number of days to forecast (1-5)'
              }
            },
            required: ['location']
          }
        },
        {
          name: 'getActivityRecommendation',
          description: 'Get weather-appropriate activity recommendations',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name'
              },
              activityType: {
                type: 'string',
                enum: ['any', 'physical', 'relaxation', 'social'],
                description: 'Type of activity desired'
              },
              energyLevel: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Current energy level'
              }
            },
            required: ['location']
          }
        },
        {
          name: 'getLightExposureAdvice',
          description: 'Get advice on natural light exposure based on weather',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name'
              }
            },
            required: ['location']
          }
        },
        {
          name: 'getWeatherMoodImpact',
          description: 'Assess how current weather might affect mood and energy',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name'
              }
            },
            required: ['location']
          }
        }
      ]
    };
  }

  /**
   * Check if weather tool is available
   */
  async isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Get cache key for a location
   */
  getCacheKey(location, type = 'weather') {
    return `${type}_${location.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Check and return cached data if valid
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store data in cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(params, context = {}) {
    const { location, lat, lon } = params;

    // Check cache first
    const cacheKey = this.getCacheKey(location || `${lat},${lon}`, 'current');
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    try {
      let url = `${this.baseUrl}/weather?appid=${this.apiKey}&units=metric`;

      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`;
      } else if (location) {
        url += `&q=${encodeURIComponent(location)}`;
      } else {
        throw new Error('Location or coordinates required');
      }

      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      const result = {
        success: true,
        location: data.name,
        country: data.sys.country,
        condition: data.weather[0].main.toLowerCase(),
        conditionDetail: data.weather[0].description,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        cloudCover: data.clouds.all,
        visibility: data.visibility,
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
        isDaytime: this.isDaytime(data.sys.sunrise, data.sys.sunset),
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Weather getCurrentWeather error:', error);
      throw new Error(`Failed to get weather: ${error.message}`);
    }
  }

  /**
   * Get weather forecast
   */
  async getForecast(params, context = {}) {
    const { location, days = 3 } = params;

    const cacheKey = this.getCacheKey(location, 'forecast');
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    try {
      const url = `${this.baseUrl}/forecast?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=metric`;

      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      // Process forecast data (comes in 3-hour intervals)
      const dailyForecasts = {};

      data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];

        if (!dailyForecasts[dateKey]) {
          dailyForecasts[dateKey] = {
            date: dateKey,
            dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
            temps: [],
            conditions: [],
            humidity: []
          };
        }

        dailyForecasts[dateKey].temps.push(item.main.temp);
        dailyForecasts[dateKey].conditions.push(item.weather[0].main.toLowerCase());
        dailyForecasts[dateKey].humidity.push(item.main.humidity);
      });

      // Summarize each day
      const forecast = Object.values(dailyForecasts)
        .slice(0, days)
        .map(day => ({
          date: day.date,
          dayName: day.dayName,
          tempHigh: Math.round(Math.max(...day.temps)),
          tempLow: Math.round(Math.min(...day.temps)),
          avgTemp: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
          primaryCondition: this.getMostCommonCondition(day.conditions),
          avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
          outdoorSuitability: this.getOutdoorSuitability(day.conditions, day.temps)
        }));

      const result = {
        success: true,
        location: data.city.name,
        country: data.city.country,
        forecast,
        bestDayForOutdoor: this.getBestOutdoorDay(forecast),
        timestamp: new Date().toISOString()
      };

      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Weather getForecast error:', error);
      throw new Error(`Failed to get forecast: ${error.message}`);
    }
  }

  /**
   * Get weather-appropriate activity recommendations
   */
  async getActivityRecommendation(params, context = {}) {
    const { location, activityType = 'any', energyLevel = 'medium' } = params;

    // Get current weather
    const weather = await this.getCurrentWeather({ location }, context);

    const condition = weather.condition;
    const temp = weather.temperature;

    // Determine weather category
    let weatherCategory = 'cloudy';
    if (condition === 'clear' && weather.isDaytime) {
      weatherCategory = 'sunny';
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
      weatherCategory = 'rainy';
    } else if (temp < 10) {
      weatherCategory = 'cold';
    } else if (temp > 30) {
      weatherCategory = 'hot';
    }

    const suggestions = this.activitySuggestions[weatherCategory] || this.activitySuggestions.cloudy;

    // Adjust for energy level
    let recommendations = [];

    if (energyLevel === 'low') {
      recommendations = [
        ...suggestions.indoor.slice(0, 2),
        'Rest is okay on low energy days',
        'Gentle stretching indoors'
      ];
    } else if (energyLevel === 'high') {
      recommendations = [
        ...suggestions.outdoor,
        ...suggestions.indoor.slice(0, 1)
      ];
    } else {
      recommendations = [
        ...suggestions.outdoor.slice(0, 2),
        ...suggestions.indoor.slice(0, 2)
      ];
    }

    // Add activity type specific suggestions
    if (activityType === 'physical') {
      recommendations.unshift(
        weatherCategory === 'rainy' ? 'Indoor workout or yoga' : 'Outdoor walk or jog'
      );
    } else if (activityType === 'relaxation') {
      recommendations.unshift(
        weatherCategory === 'sunny' ? 'Mindful sitting outdoors' : 'Cozy indoor meditation'
      );
    } else if (activityType === 'social') {
      recommendations.unshift(
        weatherCategory === 'rainy' ? 'Indoor café meetup' : 'Outdoor walk with a friend'
      );
    }

    return {
      success: true,
      location: weather.location,
      weather: {
        condition: weather.condition,
        temperature: weather.temperature,
        description: weather.conditionDetail
      },
      weatherCategory,
      energyLevel,
      recommendations: recommendations.slice(0, 5),
      isGoodForOutdoor: ['sunny', 'cloudy'].includes(weatherCategory) && weather.isDaytime,
      tip: this.getWeatherTip(weatherCategory, weather.isDaytime),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get light exposure advice
   */
  async getLightExposureAdvice(params, context = {}) {
    const { location } = params;

    const weather = await this.getCurrentWeather({ location }, context);

    const cloudCover = weather.cloudCover;
    const isDaytime = weather.isDaytime;

    let advice = {
      success: true,
      location: weather.location,
      currentConditions: weather.conditionDetail,
      isDaytime,
      cloudCover: `${cloudCover}%`,
      naturalLightQuality: cloudCover < 30 ? 'excellent' : cloudCover < 60 ? 'good' : 'limited',
      recommendations: [],
      importance: 'Light exposure helps regulate sleep-wake cycles and mood.',
      timestamp: new Date().toISOString()
    };

    if (!isDaytime) {
      advice.recommendations = [
        'It\'s currently nighttime - avoid bright lights 1-2 hours before bed',
        'Morning light exposure will help tomorrow',
        'If you wake early, try to get outside when the sun rises'
      ];
      advice.optimalWindow = `Tomorrow morning, aim for ${weather.sunrise} - one hour after sunrise`;
    } else if (cloudCover < 30) {
      advice.recommendations = [
        'Excellent day for natural light! Try to spend 15-30 minutes outside',
        'Morning sunlight is especially beneficial',
        'Even sitting by a sunny window helps',
        'Wear sunglasses if needed, but remove for short periods for light therapy benefit'
      ];
      advice.optimalWindow = 'Now is a good time for light exposure';
    } else if (cloudCover < 70) {
      advice.recommendations = [
        'Moderate light available - outdoor time is still beneficial',
        'Spend extra time outside since light is reduced',
        'Sit near windows when indoors',
        'Consider a SAD lamp if you have one'
      ];
      advice.optimalWindow = 'Any outdoor time today helps';
    } else {
      advice.recommendations = [
        'Limited natural light today - maximize window time',
        'Use bright indoor lighting, especially in morning',
        'A light therapy lamp (10,000 lux) can help on cloudy days',
        'Even overcast outdoor light is brighter than indoor'
      ];
      advice.optimalWindow = 'Try to get outside even briefly, or use indoor lighting';
    }

    return advice;
  }

  /**
   * Assess weather impact on mood and energy
   */
  async getWeatherMoodImpact(params, context = {}) {
    const { location } = params;

    const weather = await this.getCurrentWeather({ location }, context);
    const impact = this.weatherMoodImpact[weather.condition] || this.weatherMoodImpact.clouds;

    // Calculate pressure effect (if available)
    let pressureEffect = 'neutral';
    // Low pressure can affect some people

    // Temperature comfort
    const temp = weather.temperature;
    let temperatureEffect = 'neutral';
    if (temp < 5) temperatureEffect = 'cold may drain energy';
    else if (temp > 30) temperatureEffect = 'heat may cause fatigue';
    else if (temp >= 18 && temp <= 24) temperatureEffect = 'comfortable temperature';

    // Light effect
    const lightEffect = weather.isDaytime && weather.cloudCover < 50
      ? 'good natural light available'
      : weather.isDaytime
        ? 'reduced natural light'
        : 'nighttime - limited light';

    return {
      success: true,
      location: weather.location,
      weather: {
        condition: weather.condition,
        temperature: weather.temperature,
        cloudCover: weather.cloudCover,
        isDaytime: weather.isDaytime
      },
      moodImpact: {
        energy: impact.energy,
        mood: impact.mood,
        outdoorSuitability: impact.outdoor
      },
      factors: {
        light: lightEffect,
        temperature: temperatureEffect,
        pressure: pressureEffect
      },
      suggestions: this.getMoodSuggestions(impact, weather),
      affirmation: this.getWeatherAffirmation(weather.condition),
      timestamp: new Date().toISOString()
    };
  }

  // Helper methods

  isDaytime(sunrise, sunset) {
    const now = Math.floor(Date.now() / 1000);
    return now >= sunrise && now <= sunset;
  }

  getMostCommonCondition(conditions) {
    const counts = {};
    conditions.forEach(c => {
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  getOutdoorSuitability(conditions, temps) {
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const hasRain = conditions.some(c => c.includes('rain'));
    const hasThunderstorm = conditions.some(c => c.includes('thunderstorm'));

    if (hasThunderstorm) return 'avoid';
    if (hasRain) return 'fair';
    if (avgTemp < 0 || avgTemp > 35) return 'challenging';
    if (avgTemp < 10 || avgTemp > 30) return 'fair';
    return 'good';
  }

  getBestOutdoorDay(forecast) {
    const suitable = forecast.filter(d => d.outdoorSuitability === 'good');
    if (suitable.length > 0) {
      return {
        date: suitable[0].date,
        dayName: suitable[0].dayName,
        reason: `${suitable[0].primaryCondition}, ${suitable[0].avgTemp}°C`
      };
    }
    return null;
  }

  getWeatherTip(category, isDaytime) {
    const tips = {
      sunny: isDaytime
        ? 'Great weather for outdoor activities! Remember sunscreen if needed.'
        : 'Clear night - great for an evening walk.',
      cloudy: 'Clouds don\'t stop the benefits of being outside.',
      rainy: 'If it\'s light rain, a brief walk with an umbrella can be refreshing.',
      cold: 'Dress warmly in layers. Even 10 minutes outside helps.',
      hot: 'Stay hydrated and seek shade. Early morning is best for outdoor activities.'
    };
    return tips[category] || tips.cloudy;
  }

  getMoodSuggestions(impact, weather) {
    const suggestions = [];

    if (impact.energy === 'drain' || impact.mood === 'lower') {
      suggestions.push('Weather like this can affect energy - be extra gentle with yourself');
      suggestions.push('Use bright indoor lighting to compensate');
      suggestions.push('Cozy activities can be nurturing on days like this');
    }

    if (impact.mood === 'anxiety_trigger') {
      suggestions.push('If storms make you anxious, that\'s common and okay');
      suggestions.push('Focus on indoor calming activities');
      suggestions.push('The storm will pass');
    }

    if (impact.energy === 'boost') {
      suggestions.push('Great weather for activities - make the most of it');
      suggestions.push('Even a short outdoor break will help');
    }

    if (!weather.isDaytime) {
      suggestions.push('Evening is good for winding down activities');
    }

    return suggestions;
  }

  getWeatherAffirmation(condition) {
    const affirmations = {
      clear: 'The sun is shining - a good day to take a small step forward.',
      clouds: 'Even on cloudy days, you can find moments of brightness.',
      rain: 'Rain nourishes the earth, and rest nourishes you.',
      drizzle: 'Like a gentle drizzle, small actions add up.',
      thunderstorm: 'Storms pass. You\'ve weathered them before.',
      snow: 'Each snowflake is unique, and so are your strengths.',
      mist: 'When things are unclear, focus on just the next step.',
      fog: 'The fog will lift. Trust the process.'
    };
    return affirmations[condition] || affirmations.clouds;
  }
}

module.exports = WeatherTool;
