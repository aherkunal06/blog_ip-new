// src/lib/opencart-db.ts
// OpenCart database connection for product sync

import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';

// OpenCart database connection pool
const opencartPool = mysql.createPool({
  host: process.env.OPENCART_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.OPENCART_DB_PORT || process.env.DB_PORT || '3306'),
  user: process.env.OPENCART_DB_USER || process.env.DB_USER || 'root',
  password: process.env.OPENCART_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.OPENCART_DB_NAME || 'sagar',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
});

// Helper function to execute queries on OpenCart database
export async function opencartQuery<T = RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  try {
    const [rows] = await opencartPool.execute<RowDataPacket[]>(sql, params);
    return rows as T;
  } catch (error: any) {
    // Provide helpful error message for connection issues
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      const dbHost = process.env.OPENCART_DB_HOST || process.env.DB_HOST || 'localhost';
      const dbUser = process.env.OPENCART_DB_USER || process.env.DB_USER || 'root';
      const dbName = process.env.OPENCART_DB_NAME || 'sagar';
      console.error('OpenCart database connection error:', {
        message: 'Access denied. Please check your OpenCart database credentials.',
        host: dbHost,
        user: dbUser,
        database: dbName,
        hint: 'Set OPENCART_DB_HOST, OPENCART_DB_USER, OPENCART_DB_PASSWORD, and OPENCART_DB_NAME in your .env.local file'
      });
      throw new Error(
        `OpenCart database access denied for user '${dbUser}'@'${dbHost}'. ` +
        `Please check your OPENCART_DB_* environment variables in .env.local`
      );
    }
    console.error('OpenCart database query error:', error);
    throw error;
  }
}

// Helper to get a single row from OpenCart
export async function opencartQueryOne<T = RowDataPacket>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await opencartQuery<T[]>(sql, params);
  return (rows.length > 0 ? rows[0] : null) as T | null;
}

// Export the pool for advanced usage
export { opencartPool };

// Close pool on process termination
process.on('SIGINT', async () => {
  await opencartPool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await opencartPool.end();
  process.exit(0);
});

