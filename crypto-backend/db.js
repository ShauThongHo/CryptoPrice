import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The database file path
const DB_FILE = join(__dirname, 'database.json');

// --- Core: Simple JSON Database Engine ---
const db = {
    data: {
        price_history: [],
        latest_prices: {},
        wallets: [],
        assets: [],
        portfolio_history: [],  // Portfolio snapshots
        api_keys: []  // New: Encrypted API keys for exchanges
    },

    // Load data from disk
    load() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const raw = fs.readFileSync(DB_FILE, 'utf8');
                const loaded = JSON.parse(raw);
                // Merge to ensure schema compatibility
                this.data = { ...this.data, ...loaded };
            } else {
                this.save(); // Initialize file
            }
        } catch (e) {
            console.error('[DB] Load Error, resetting:', e);
            this.save();
        }
    },

    // Save data to disk
    save() {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    }
};

/**
 * Initialize JSON database
 */
export function initDatabase() {
  try {
    console.log(`[DB] Initializing JSON database at: ${DB_FILE}`);
    db.load();
    console.log('[DB] ✅ Database initialized successfully');
    console.log(`[DB] Records: ${db.data.price_history.length} history, ${Object.keys(db.data.latest_prices).length} latest prices, ${db.data.wallets.length} wallets, ${db.data.assets.length} assets`);
    return db;
  } catch (error) {
    console.error('[DB] ❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance (for compatibility)
 */
export function getDatabase() {
  return db;
}

/**
 * Insert price data into price_history
 */
export function insertPriceHistory(coinId, priceUsd, dataJson = null) {
  const record = {
    id: Date.now() + Math.random(), 
    timestamp: Math.floor(Date.now() / 1000),
    coin_id: coinId,
    price_usd: priceUsd,
    data_json: dataJson 
  };
  db.data.price_history.push(record);
  
  // Limit history to last 10000 records to prevent file bloat
  if (db.data.price_history.length > 10000) {
    db.data.price_history = db.data.price_history.slice(-10000);
  }
  
  db.save();
  return true;
}

/**
 * Update or insert latest price
 */
export function upsertLatestPrice(coinId, priceUsd) {
  db.data.latest_prices[coinId] = {
    coin_id: coinId,
    price_usd: priceUsd,
    last_updated: Math.floor(Date.now() / 1000)
  };
  db.save();
  return true;
}

/**
 * Get all latest prices
 */
export function getLatestPrices() {
  const result = [];
  Object.values(db.data.latest_prices).forEach(item => {
    result.push({
      coin_id: item.coin_id,
      price_usd: item.price_usd,
      last_updated: item.last_updated
    });
  });
  return result;
}

/**
 * Get price history for a specific coin
 */
export function getPriceHistory(coinId, limit = 2016) {
  return db.data.price_history
    .filter(row => row.coin_id === coinId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map(row => ({
      timestamp: row.timestamp,
      price_usd: row.price_usd,
      data_json: row.data_json
    }));
}

/**
 * Get price history for a specific coin within a time range
 */
export function getPriceHistoryRange(coinId, startTime, endTime) {
  return db.data.price_history
    .filter(row => row.coin_id === coinId && row.timestamp >= startTime && row.timestamp <= endTime)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(row => ({
      timestamp: row.timestamp,
      price_usd: row.price_usd,
      data_json: row.data_json
    }));
}

/**
 * Clean up old price history data (keep last N days)
 */
export function cleanupOldHistory(daysToKeep = 30) {
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);
  const before = db.data.price_history.length;
  
  db.data.price_history = db.data.price_history.filter(row => row.timestamp >= cutoffTimestamp);
  
  const removed = before - db.data.price_history.length;
  if (removed > 0) {
    db.save();
    console.log(`[DB] Cleaned up ${removed} old price history records`);
  }
  return removed;
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  const timestamps = db.data.price_history.map(r => r.timestamp).filter(Boolean);
  
  return {
    historyRecords: db.data.price_history.length,
    latestPricesCount: Object.keys(db.data.latest_prices).length,
    walletsCount: db.data.wallets.length,
    assetsCount: db.data.assets.length,
    oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
    newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null
  };
}

// ==================== WALLET OPERATIONS ====================

/**
 * Create a new wallet
 */
export function createWallet(name, type, exchangeName = null, color = null) {
  const createdAt = Math.floor(Date.now() / 1000);
  const id = db.data.wallets.length > 0 ? Math.max(...db.data.wallets.map(w => w.id)) + 1 : 1;
  
  const wallet = {
    id,
    name,
    type,
    exchange_name: exchangeName,
    color,
    created_at: createdAt
  };
  
  db.data.wallets.push(wallet);
  db.save();
  
  return wallet;
}

/**
 * Get all wallets
 */
export function getAllWallets() {
  return [...db.data.wallets].sort((a, b) => b.created_at - a.created_at);
}

/**
 * Get wallet by ID
 */
export function getWalletById(id) {
  return db.data.wallets.find(w => w.id === parseInt(id)) || null;
}

/**
 * Update wallet
 */
export function updateWallet(id, updates) {
  const index = db.data.wallets.findIndex(w => w.id === parseInt(id));
  if (index === -1) return false;
  
  const wallet = db.data.wallets[index];
  
  if (updates.name !== undefined) wallet.name = updates.name;
  if (updates.type !== undefined) wallet.type = updates.type;
  if (updates.exchangeName !== undefined) wallet.exchange_name = updates.exchangeName;
  if (updates.color !== undefined) wallet.color = updates.color;
  
  db.save();
  return true;
}

/**
 * Delete wallet (cascades to assets)
 */
export function deleteWallet(id) {
  const walletId = parseInt(id);
  const walletIndex = db.data.wallets.findIndex(w => w.id === walletId);
  if (walletIndex === -1) return false;
  
  // Delete associated assets
  db.data.assets = db.data.assets.filter(a => a.wallet_id !== walletId);
  
  // Delete wallet
  db.data.wallets.splice(walletIndex, 1);
  
  db.save();
  return true;
}

// ==================== ASSET OPERATIONS ====================

/**
 * Create a new asset
 */
export function createAsset(walletId, symbol, amount, tags = null, notes = null) {
  const now = Math.floor(Date.now() / 1000);
  const id = db.data.assets.length > 0 ? Math.max(...db.data.assets.map(a => a.id)) + 1 : 1;
  
  const asset = {
    id,
    wallet_id: walletId,
    symbol,
    amount,
    tags,
    notes,
    created_at: now,
    updated_at: now
  };
  
  db.data.assets.push(asset);
  db.save();
  
  return asset;
}

/**
 * Get all assets (automatically calculates interest for Earn positions)
 */
export function getAllAssets() {
  calculateInterest(); // Auto-calculate interest before returning
  return [...db.data.assets].sort((a, b) => b.created_at - a.created_at);
}

/**
 * Get assets by wallet ID
 */
export function getAssetsByWallet(walletId) {
  return db.data.assets
    .filter(a => a.wallet_id === parseInt(walletId))
    .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Get asset by ID
 */
export function getAssetById(id) {
  return db.data.assets.find(a => a.id === parseInt(id)) || null;
}

/**
 * Update asset
 */
export function updateAsset(id, updates) {
  const index = db.data.assets.findIndex(a => a.id === parseInt(id));
  if (index === -1) return false;
  
  const asset = db.data.assets[index];
  
  if (updates.symbol !== undefined) asset.symbol = updates.symbol;
  if (updates.amount !== undefined) asset.amount = updates.amount;
  if (updates.tags !== undefined) asset.tags = updates.tags;
  if (updates.notes !== undefined) asset.notes = updates.notes;
  if (updates.earnConfig !== undefined) asset.earnConfig = updates.earnConfig;
  
  asset.updated_at = Math.floor(Date.now() / 1000);
  
  db.save();
  return true;
}

/**
 * Delete asset
 */
export function deleteAsset(id) {
  const index = db.data.assets.findIndex(a => a.id === parseInt(id));
  if (index === -1) return false;
  
  db.data.assets.splice(index, 1);
  db.save();
  
  return true;
}

// ==================== SYNC OPERATIONS ====================

/**
 * Get full sync state (all wallets and assets)
 */
export function getFullSyncState() {
  return {
    wallets: getAllWallets(),
    assets: getAllAssets(),
    timestamp: Math.floor(Date.now() / 1000)
  };
}

/**
 * Replace full sync state (overwrites all wallets and assets)
 */
export function replaceFullSyncState(data) {
  try {
    // Clear existing data
    db.data.wallets = [];
    db.data.assets = [];
    
    // Insert wallets
    for (const wallet of data.wallets || []) {
      db.data.wallets.push({
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        exchange_name: wallet.exchange_name || wallet.exchangeName || null,
        color: wallet.color || null,
        created_at: wallet.created_at || wallet.createdAt || Math.floor(Date.now() / 1000)
      });
    }
    
    // Insert assets
    for (const asset of data.assets || []) {
      db.data.assets.push({
        id: asset.id,
        wallet_id: asset.wallet_id || asset.walletId,
        symbol: asset.symbol,
        amount: asset.amount,
        tags: asset.tags || null,
        notes: asset.notes || null,
        created_at: asset.created_at || asset.createdAt || Math.floor(Date.now() / 1000),
        updated_at: asset.updated_at || asset.updatedAt || Math.floor(Date.now() / 1000)
      });
    }
    
    db.save();
    console.log(`[DB] Sync complete: ${db.data.wallets.length} wallets, ${db.data.assets.length} assets`);
    return true;
  } catch (error) {
    console.error('[DB] Error replacing sync state:', error);
    throw error;
  }
}

/**
 * Close database connection (for compatibility)
 */
export function closeDatabase() {
  console.log('[DB] Saving final state...');
  db.save();
}

// ===================================
// Portfolio History Operations
// ===================================

/**
 * Insert portfolio snapshot
 */
export function insertPortfolioSnapshot(timestamp, totalValue, snapshotData) {
  try {
    const record = {
      id: Date.now(), // Simple ID
      timestamp: timestamp,
      total_value: totalValue,
      snapshot_data: snapshotData // JSON string
    };
    
    db.data.portfolio_history.push(record);
    
    // Auto-prune: Keep only last 30 days (for 30-day chart)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    db.data.portfolio_history = db.data.portfolio_history.filter(
      row => row.timestamp >= thirtyDaysAgo
    );
    
    db.save();
    return true;
  } catch (error) {
    console.error('[DB] Error inserting portfolio snapshot:', error);
    return false;
  }
}

/**
 * Get portfolio history within time range
 */
export function getPortfolioHistory(startTime, endTime, limit = 10000) {
  return db.data.portfolio_history
    .filter(row => row.timestamp >= startTime && row.timestamp <= endTime)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, limit);
}

/**
 * Get recent portfolio history
 */
export function getRecentPortfolioHistory(hours) {
  const startTime = Date.now() - (hours * 60 * 60 * 1000);
  return db.data.portfolio_history
    .filter(row => row.timestamp >= startTime)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get portfolio history count
 */
export function getPortfolioHistoryCount() {
  return db.data.portfolio_history.length;
}

/**
 * Clean up old portfolio history (keep last N days)
 */
export function cleanupOldPortfolioHistory(daysToKeep = 30) {
  const cutoffTimestamp = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  const before = db.data.portfolio_history.length;
  db.data.portfolio_history = db.data.portfolio_history.filter(
    row => row.timestamp >= cutoffTimestamp
  );
  const after = db.data.portfolio_history.length;
  
  if (before !== after) {
    db.save();
    console.log(`[DB] 🗑️  Cleaned up portfolio history: ${before - after} old records removed (keeping last ${daysToKeep} days)`);
  }
  
  return before - after;
}

// ==================== API KEY OPERATIONS ====================

/**
 * Create API key record for an exchange
 */
export function createApiKey(exchange, apiKey, apiSecret, password = null) {
  const record = {
    id: Date.now(),
    exchange,
    apiKey,
    apiSecret,
    password,  // Optional passphrase for exchanges like OKX
    createdAt: Date.now(),
    lastUsed: null
  };
  db.data.api_keys.push(record);
  db.save();
  console.log(`[DB] ➕ API key added for ${exchange}`);
  return record;
}

/**
 * Get all API keys
 */
export function getAllApiKeys() {
  return db.data.api_keys;
}

/**
 * Get API key by exchange name
 */
export function getApiKeyByExchange(exchange) {
  return db.data.api_keys.find(k => k.exchange.toLowerCase() === exchange.toLowerCase());
}

/**
 * Update API key
 */
export function updateApiKey(id, updates) {
  const index = db.data.api_keys.findIndex(k => k.id === id);
  if (index === -1) return false;
  
  db.data.api_keys[index] = { ...db.data.api_keys[index], ...updates };
  db.save();
  console.log(`[DB] 🔄 API key ${id} updated`);
  return true;
}

/**
 * Delete API key
 */
export function deleteApiKey(id) {
  const before = db.data.api_keys.length;
  db.data.api_keys = db.data.api_keys.filter(k => k.id !== id);
  
  if (db.data.api_keys.length < before) {
    db.save();
    console.log(`[DB] 🗑️  API key ${id} deleted`);
    return true;
  }
  return false;
}
