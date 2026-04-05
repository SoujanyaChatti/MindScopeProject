/**
 * Google Calendar Tool for ActivityAgent
 *
 * Provides calendar integration for:
 * - Scheduling activities and reminders
 * - Checking availability
 * - Viewing upcoming events
 * - Creating recurring wellness activities
 *
 * Uses Google Calendar API with OAuth2 authentication.
 *
 * Setup Requirements:
 * 1. Create a Google Cloud project
 * 2. Enable Google Calendar API
 * 3. Create OAuth2 credentials (Web application)
 * 4. Set environment variables:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REDIRECT_URI (e.g., http://localhost:5000/api/auth/google/callback)
 */

const { google } = require('googleapis');

class CalendarTool {
  constructor() {
    this.name = 'calendar';

    // OAuth2 configuration
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );

    // Default calendar settings for wellness activities
    this.defaultReminders = [
      { method: 'popup', minutes: 15 },
      { method: 'popup', minutes: 5 }
    ];

    // Activity type to calendar color mapping
    this.activityColors = {
      physical: '11',      // Red
      social: '10',        // Green
      mindfulness: '7',    // Cyan
      creative: '5',       // Yellow
      self_care: '9',      // Purple
      accomplishment: '8', // Gray
      default: '1'         // Blue
    };
  }

  /**
   * Get Gemini function declaration schema
   */
  static getSchema() {
    return {
      description: 'Google Calendar integration for scheduling and managing wellness activities',
      functions: [
        {
          name: 'createEvent',
          description: 'Create a new calendar event for a wellness activity or reminder',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title of the event (e.g., "Morning Walk", "Meditation Session")'
              },
              description: {
                type: 'string',
                description: 'Description of the activity including tips or instructions'
              },
              startTime: {
                type: 'string',
                description: 'Start time in ISO 8601 format (e.g., "2025-01-15T10:00:00")'
              },
              duration: {
                type: 'integer',
                description: 'Duration in minutes'
              },
              activityType: {
                type: 'string',
                enum: ['physical', 'social', 'mindfulness', 'creative', 'self_care', 'accomplishment'],
                description: 'Type of activity for color coding'
              },
              recurring: {
                type: 'string',
                enum: ['none', 'daily', 'weekly', 'weekdays'],
                description: 'Recurrence pattern'
              }
            },
            required: ['title', 'startTime', 'duration']
          }
        },
        {
          name: 'checkAvailability',
          description: 'Check free/busy times for a given date range',
          parameters: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                description: 'Start date in ISO 8601 format'
              },
              endDate: {
                type: 'string',
                description: 'End date in ISO 8601 format'
              }
            },
            required: ['startDate', 'endDate']
          }
        },
        {
          name: 'getUpcomingEvents',
          description: 'Get upcoming calendar events',
          parameters: {
            type: 'object',
            properties: {
              maxResults: {
                type: 'integer',
                description: 'Maximum number of events to return (default 10)'
              },
              filterWellness: {
                type: 'boolean',
                description: 'Only return wellness-related events'
              }
            }
          }
        },
        {
          name: 'suggestTimeSlot',
          description: 'Suggest optimal time slots for an activity based on availability',
          parameters: {
            type: 'object',
            properties: {
              duration: {
                type: 'integer',
                description: 'Required duration in minutes'
              },
              preferredTimeOfDay: {
                type: 'string',
                enum: ['morning', 'afternoon', 'evening', 'any'],
                description: 'Preferred time of day'
              },
              daysAhead: {
                type: 'integer',
                description: 'Number of days ahead to search (default 7)'
              }
            },
            required: ['duration']
          }
        },
        {
          name: 'deleteEvent',
          description: 'Delete a calendar event by ID',
          parameters: {
            type: 'object',
            properties: {
              eventId: {
                type: 'string',
                description: 'The ID of the event to delete'
              }
            },
            required: ['eventId']
          }
        }
      ]
    };
  }

  /**
   * Check if calendar is available (authenticated)
   */
  async isAvailable(userId) {
    // In production, check if user has connected their Google account
    // For now, check if credentials are configured
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  /**
   * Set user's OAuth tokens
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Get OAuth authorization URL for user consent
   */
  getAuthUrl(state) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state, // Used to identify the user after redirect
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Create a calendar event
   */
  async createEvent(params, context = {}) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const {
      title,
      description,
      startTime,
      duration,
      activityType = 'default',
      recurring = 'none'
    } = params;

    // Calculate end time
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    // Build event object
    const event = {
      summary: `🌟 ${title}`,
      description: `${description || ''}\n\n---\nScheduled by MindScope Recovery Agent`,
      start: {
        dateTime: start.toISOString(),
        timeZone: context.timezone || 'UTC'
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: context.timezone || 'UTC'
      },
      colorId: this.activityColors[activityType] || this.activityColors.default,
      reminders: {
        useDefault: false,
        overrides: this.defaultReminders
      }
    };

    // Add recurrence if specified
    if (recurring !== 'none') {
      const recurrenceRules = {
        daily: 'RRULE:FREQ=DAILY',
        weekly: 'RRULE:FREQ=WEEKLY',
        weekdays: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
      };
      event.recurrence = [recurrenceRules[recurring]];
    }

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      return {
        success: true,
        eventId: response.data.id,
        link: response.data.htmlLink,
        summary: response.data.summary,
        start: response.data.start,
        end: response.data.end,
        message: `Created event "${title}" for ${start.toLocaleString()}`
      };
    } catch (error) {
      console.error('Calendar createEvent error:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Check availability for a date range
   */
  async checkAvailability(params, context = {}) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const { startDate, endDate } = params;

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          items: [{ id: 'primary' }]
        }
      });

      const busyTimes = response.data.calendars.primary.busy || [];

      return {
        success: true,
        busyTimes: busyTimes.map(b => ({
          start: b.start,
          end: b.end
        })),
        totalBusyMinutes: busyTimes.reduce((total, b) => {
          const start = new Date(b.start);
          const end = new Date(b.end);
          return total + (end - start) / 60000;
        }, 0),
        message: `Found ${busyTimes.length} busy time blocks`
      };
    } catch (error) {
      console.error('Calendar checkAvailability error:', error);
      throw new Error(`Failed to check availability: ${error.message}`);
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(params = {}, context = {}) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const { maxResults = 10, filterWellness = false } = params;

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: filterWellness ? maxResults * 2 : maxResults, // Get more if filtering
        singleEvents: true,
        orderBy: 'startTime'
      });

      let events = response.data.items || [];

      // Filter for wellness events if requested
      if (filterWellness) {
        events = events.filter(e =>
          e.summary?.includes('🌟') ||
          e.description?.includes('MindScope')
        ).slice(0, maxResults);
      }

      return {
        success: true,
        events: events.map(e => ({
          id: e.id,
          title: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          description: e.description?.split('\n---')[0], // Remove MindScope footer
          link: e.htmlLink,
          isWellnessEvent: e.summary?.includes('🌟') || false
        })),
        count: events.length,
        message: `Found ${events.length} upcoming events`
      };
    } catch (error) {
      console.error('Calendar getUpcomingEvents error:', error);
      throw new Error(`Failed to get upcoming events: ${error.message}`);
    }
  }

  /**
   * Suggest optimal time slots for an activity
   */
  async suggestTimeSlot(params, context = {}) {
    const { duration, preferredTimeOfDay = 'any', daysAhead = 7 } = params;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Get busy times
    const availability = await this.checkAvailability({
      startDate: now.toISOString(),
      endDate: endDate.toISOString()
    }, context);

    if (!availability.success) {
      throw new Error('Failed to check availability');
    }

    // Define preferred time windows
    const timeWindows = {
      morning: { start: 7, end: 12 },
      afternoon: { start: 12, end: 17 },
      evening: { start: 17, end: 21 },
      any: { start: 7, end: 21 }
    };

    const window = timeWindows[preferredTimeOfDay];
    const suggestions = [];

    // Generate potential slots for each day
    for (let day = 0; day < daysAhead && suggestions.length < 5; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(window.start, 0, 0, 0);

      // Check each hour in the window
      for (let hour = window.start; hour < window.end && suggestions.length < 5; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour);

        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Skip if in the past
        if (slotStart < now) continue;

        // Check if slot overlaps with any busy time
        const isBusy = availability.busyTimes.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isBusy) {
          suggestions.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            dayName: slotStart.toLocaleDateString('en-US', { weekday: 'long' }),
            timeFormatted: slotStart.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            dateFormatted: slotStart.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          });
        }
      }
    }

    return {
      success: true,
      suggestions,
      duration,
      preferredTimeOfDay,
      message: suggestions.length > 0
        ? `Found ${suggestions.length} available time slots`
        : 'No available slots found in the requested time window'
    };
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(params, context = {}) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const { eventId } = params;

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      return {
        success: true,
        eventId,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      console.error('Calendar deleteEvent error:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Schedule wellness activities for the week
   * This is a higher-level function that uses createEvent
   */
  async scheduleWeeklyWellness(activities, context = {}) {
    const results = [];

    for (const activity of activities) {
      try {
        // First, find a good time slot
        const slots = await this.suggestTimeSlot({
          duration: activity.duration,
          preferredTimeOfDay: activity.preferredTime || 'any',
          daysAhead: 7
        }, context);

        if (slots.suggestions.length > 0) {
          // Create the event at the first available slot
          const result = await this.createEvent({
            title: activity.title,
            description: activity.description,
            startTime: slots.suggestions[0].start,
            duration: activity.duration,
            activityType: activity.type,
            recurring: activity.recurring || 'none'
          }, context);

          results.push({
            activity: activity.title,
            scheduled: true,
            ...result
          });
        } else {
          results.push({
            activity: activity.title,
            scheduled: false,
            reason: 'No available time slots found'
          });
        }
      } catch (error) {
        results.push({
          activity: activity.title,
          scheduled: false,
          reason: error.message
        });
      }
    }

    return {
      success: true,
      results,
      scheduledCount: results.filter(r => r.scheduled).length,
      failedCount: results.filter(r => !r.scheduled).length
    };
  }
}

module.exports = CalendarTool;
