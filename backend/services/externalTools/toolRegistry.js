/**
 * Tool Registry - External Tool Calling Abstraction Layer
 *
 * This provides a unified interface for agents to call external tools/APIs.
 *
 * Architecture Decision: Custom vs MCP (Model Context Protocol)
 *
 * We chose a CUSTOM approach over MCP because:
 * 1. MCP is designed for multi-model, multi-server orchestration - overkill for our use case
 * 2. We need tight Gemini function calling integration
 * 3. Our tool set is limited and domain-specific (calendar, vision, weather, mindfulness)
 * 4. MCP adds complexity (JSON-RPC, separate servers) without proportional benefit
 * 5. Direct API integration gives us more control over error handling and retries
 *
 * However, this registry is designed to be extensible - adding MCP support later
 * would be straightforward if the tool ecosystem grows significantly.
 *
 * Usage:
 *   const toolRegistry = require('./toolRegistry');
 *   const result = await toolRegistry.executeTool('calendar', 'createEvent', params);
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolSchemas = new Map();
    this.executionLog = [];
  }

  /**
   * Register a tool with its schema for Gemini function calling
   */
  registerTool(toolName, toolInstance, schema) {
    this.tools.set(toolName, toolInstance);
    this.toolSchemas.set(toolName, schema);
    console.log(`[ToolRegistry] Registered tool: ${toolName}`);
  }

  /**
   * Get all tool schemas for Gemini function declarations
   */
  getGeminiFunctionDeclarations() {
    const declarations = [];

    for (const [toolName, schema] of this.toolSchemas) {
      if (schema.functions) {
        schema.functions.forEach(fn => {
          declarations.push({
            name: `${toolName}_${fn.name}`,
            description: fn.description,
            parameters: fn.parameters
          });
        });
      }
    }

    return declarations;
  }

  /**
   * Execute a tool function
   */
  async executeTool(toolName, functionName, params, context = {}) {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    if (typeof tool[functionName] !== 'function') {
      throw new Error(`Function not found: ${toolName}.${functionName}`);
    }

    const startTime = Date.now();

    try {
      const result = await tool[functionName](params, context);

      // Log execution
      this.logExecution({
        toolName,
        functionName,
        params,
        result,
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      return {
        success: true,
        data: result,
        toolName,
        functionName
      };
    } catch (error) {
      this.logExecution({
        toolName,
        functionName,
        params,
        error: error.message,
        success: false,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      return {
        success: false,
        error: error.message,
        toolName,
        functionName
      };
    }
  }

  /**
   * Execute a Gemini function call response
   * Parses the function name and routes to the correct tool
   */
  async executeGeminiFunctionCall(functionCall, context = {}) {
    const { name, args } = functionCall;

    // Parse tool_function format
    const underscoreIndex = name.indexOf('_');
    if (underscoreIndex === -1) {
      throw new Error(`Invalid function call format: ${name}`);
    }

    const toolName = name.substring(0, underscoreIndex);
    const functionName = name.substring(underscoreIndex + 1);

    return this.executeTool(toolName, functionName, args, context);
  }

  /**
   * Check if a tool is available and authenticated
   */
  async isToolAvailable(toolName) {
    const tool = this.tools.get(toolName);
    if (!tool) return false;

    if (typeof tool.isAvailable === 'function') {
      return tool.isAvailable();
    }

    return true;
  }

  /**
   * Get tool capabilities for an agent
   */
  getToolCapabilities(toolName) {
    const schema = this.toolSchemas.get(toolName);
    if (!schema) return null;

    return {
      name: toolName,
      description: schema.description,
      functions: schema.functions?.map(f => ({
        name: f.name,
        description: f.description
      })) || []
    };
  }

  /**
   * Log tool execution for debugging and analytics
   */
  logExecution(entry) {
    this.executionLog.push(entry);

    // Keep only last 1000 entries
    if (this.executionLog.length > 1000) {
      this.executionLog = this.executionLog.slice(-1000);
    }
  }

  /**
   * Get recent execution stats
   */
  getExecutionStats() {
    const recentLogs = this.executionLog.slice(-100);

    const stats = {
      totalExecutions: recentLogs.length,
      successRate: 0,
      avgDuration: 0,
      byTool: {}
    };

    if (recentLogs.length === 0) return stats;

    let successCount = 0;
    let totalDuration = 0;

    recentLogs.forEach(log => {
      if (log.success) successCount++;
      totalDuration += log.duration || 0;

      if (!stats.byTool[log.toolName]) {
        stats.byTool[log.toolName] = { calls: 0, successes: 0 };
      }
      stats.byTool[log.toolName].calls++;
      if (log.success) stats.byTool[log.toolName].successes++;
    });

    stats.successRate = (successCount / recentLogs.length * 100).toFixed(1);
    stats.avgDuration = Math.round(totalDuration / recentLogs.length);

    return stats;
  }
}

// Singleton instance
const toolRegistry = new ToolRegistry();

module.exports = toolRegistry;
