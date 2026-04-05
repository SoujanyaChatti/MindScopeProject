const mongoose = require('mongoose');

/**
 * Database connection utility with test-friendly features
 */
class DatabaseConnection {
  static async connect(uri = process.env.MONGODB_URI) {
    try {
      const options = {
        // Remove deprecated options
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      // Add test-specific options
      if (process.env.NODE_ENV === 'test') {
        options.dbName = 'mindscope-test';
      }

      await mongoose.connect(uri, options);
      console.log('✅ MongoDB connected successfully');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  static async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB disconnected');
      return true;
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  static async cleanup() {
    if (process.env.NODE_ENV === 'test') {
      try {
        const collections = await mongoose.connection.db.collections();
        
        for (const collection of collections) {
          await collection.deleteMany({});
        }
        
        console.log('✅ Test database cleaned up');
        return true;
      } catch (error) {
        console.error('❌ Database cleanup error:', error);
        throw error;
      }
    }
    return false;
  }

  static async dropDatabase() {
    if (process.env.NODE_ENV === 'test') {
      try {
        await mongoose.connection.db.dropDatabase();
        console.log('✅ Test database dropped');
        return true;
      } catch (error) {
        console.error('❌ Database drop error:', error);
        throw error;
      }
    }
    return false;
  }

  static isConnected() {
    return mongoose.connection.readyState === 1;
  }

  static getConnectionState() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }
}

module.exports = DatabaseConnection;

