/**
 * External Tools Index
 *
 * Registers all external tools with the tool registry and
 * exports the configured registry for use by agents.
 *
 * Available Tools:
 * - calendar: Google Calendar integration (ActivityAgent)
 * - vision: Gemini Vision meal analysis (NutritionAgent)
 * - weather: OpenWeatherMap integration (EnergyAgent)
 * - mindfulness: Built-in meditation/breathing timer (WorryAgent)
 */

const toolRegistry = require('./toolRegistry');
const CalendarTool = require('./calendarTool');
const VisionTool = require('./visionTool');
const WeatherTool = require('./weatherTool');
const MindfulnessTool = require('./mindfulnessTool');

// Create tool instances
const calendarTool = new CalendarTool();
const visionTool = new VisionTool();
const weatherTool = new WeatherTool();
const mindfulnessTool = new MindfulnessTool();

// Register tools with their schemas
toolRegistry.registerTool('calendar', calendarTool, CalendarTool.getSchema());
toolRegistry.registerTool('vision', visionTool, VisionTool.getSchema());
toolRegistry.registerTool('weather', weatherTool, WeatherTool.getSchema());
toolRegistry.registerTool('mindfulness', mindfulnessTool, MindfulnessTool.getSchema());

/**
 * Get tool availability status
 */
async function getToolAvailability() {
  return {
    calendar: await toolRegistry.isToolAvailable('calendar'),
    vision: await toolRegistry.isToolAvailable('vision'),
    weather: await toolRegistry.isToolAvailable('weather'),
    mindfulness: await toolRegistry.isToolAvailable('mindfulness')
  };
}

/**
 * Get all function declarations for Gemini
 */
function getAllFunctionDeclarations() {
  return toolRegistry.getGeminiFunctionDeclarations();
}

/**
 * Agent-to-tool mapping
 * Defines which tools each agent has access to
 */
const agentToolAccess = {
  activity: ['calendar', 'weather'],
  nutrition: ['vision'],
  energy: ['weather'],
  worry: ['mindfulness'],
  sleep: ['calendar', 'mindfulness'],  // Can schedule sleep routines and use mindfulness
  mood: ['mindfulness', 'weather']      // Can use mindfulness for mood support
};

/**
 * Get tools available to a specific agent
 */
function getAgentTools(agentName) {
  const tools = agentToolAccess[agentName.toLowerCase()] || [];
  return tools.map(toolName => ({
    name: toolName,
    capabilities: toolRegistry.getToolCapabilities(toolName)
  }));
}

/**
 * Execute a tool call from an agent
 */
async function executeAgentToolCall(agentName, toolName, functionName, params, context = {}) {
  // Verify agent has access to this tool
  const allowedTools = agentToolAccess[agentName.toLowerCase()] || [];
  if (!allowedTools.includes(toolName)) {
    throw new Error(`Agent ${agentName} does not have access to tool ${toolName}`);
  }

  return toolRegistry.executeTool(toolName, functionName, params, context);
}

module.exports = {
  toolRegistry,
  calendarTool,
  visionTool,
  weatherTool,
  mindfulnessTool,
  getToolAvailability,
  getAllFunctionDeclarations,
  getAgentTools,
  executeAgentToolCall,
  agentToolAccess
};
