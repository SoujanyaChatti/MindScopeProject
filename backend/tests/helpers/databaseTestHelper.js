const DatabaseConnection = require('../../utils/database');

/**
 * Test-specific database helper
 */
class DatabaseTestHelper {
  static async setup() {
    // Connect to test database
    await DatabaseConnection.connect();
    
    // Clean up any existing test data
    await DatabaseConnection.cleanup();
  }

  static async teardown() {
    // Clean up test data
    await DatabaseConnection.cleanup();
    
    // Disconnect from database
    await DatabaseConnection.disconnect();
  }

  static async cleanup() {
    await DatabaseConnection.cleanup();
  }

  static async dropDatabase() {
    await DatabaseConnection.dropDatabase();
  }

  static isConnected() {
    return DatabaseConnection.isConnected();
  }

  static getConnectionState() {
    return DatabaseConnection.getConnectionState();
  }
}

module.exports = DatabaseTestHelper;







