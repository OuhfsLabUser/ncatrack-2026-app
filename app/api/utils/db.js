// src/api/utils/db.js

/**
 * Helper function to handle pagination
 * @param {object} options - Pagination options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Number of items per page
 * @returns {object} - Pagination configuration for Prisma
 */
export const getPaginationConfig = ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;
    return {
      skip,
      take: limit
    };
  };
  
  /**
   * Helper function to handle sorting
   * @param {string} sortField - Field to sort by
   * @param {string} sortOrder - Sort order ('asc' or 'desc')
   * @returns {object} - Sorting configuration for Prisma
   */
  export const getSortingConfig = (sortField, sortOrder = 'asc') => {
    if (!sortField) return {};
    
    return {
      orderBy: {
        [sortField]: sortOrder.toLowerCase()
      }
    };
  };
  
  /**
   * Helper function to handle filtering
   * @param {object} filters - Key-value pairs of filters
   * @returns {object} - Filtering configuration for Prisma
   */
  export const getFilterConfig = (filters) => {
    if (!filters || Object.keys(filters).length === 0) return {};
    
    const whereClause = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;
      
      // Handle string search (case-insensitive contains)
      if (typeof value === 'string' && value.trim()) {
        whereClause[key] = {
          contains: value.trim(),
          mode: 'insensitive'
        };
      }
      // Handle exact matches for other types
      else {
        whereClause[key] = value;
      }
    }
    
    return { where: whereClause };
  };
  
  /**
   * Helper function to get the next ID for a table
   * @param {object} prisma - Prisma client
   * @param {string} model - Model name
   * @param {string} idField - ID field name
   * @returns {Promise<number>} - Next ID
   */
  export const getNextId = async (prisma, model, idField) => {
    const maxResult = await prisma[model].findFirst({
      orderBy: {
        [idField]: 'desc'
      },
      select: {
        [idField]: true
      }
    });
    
    return maxResult ? maxResult[idField] + 1 : 1;
  };
  
  /**
   * Helper function to format date strings to ISO format for Prisma
   * Uses Dallas timezone (America/Chicago) for consistent date handling
   * @param {string|Date} date - Date to format
   * @returns {string|null} - Formatted date string or null
   */
  export const formatDate = (date) => {
    if (!date) return null;
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      
      // Get date components in Dallas timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const parts = formatter.formatToParts(dateObj);
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      
      // Return ISO string at noon UTC to avoid timezone conversion issues
      return `${year}-${month}-${day}T12:00:00.000Z`;
    } catch (error) {
      console.error('Invalid date:', date, error);
      return null;
    }
  };
  
  /**
   * Helper function to execute raw SQL queries
   * @param {object} prisma - Prisma client
   * @param {string} query - SQL query with placeholders
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Array>} - Query results
   */
  export const executeRawQuery = async (prisma, query, params = []) => {
    try {
      const result = await prisma.$queryRawUnsafe(query, ...params);
      return result;
    } catch (error) {
      console.error('Raw query error:', error);
      throw error;
    }
  };
  
  /**
   * Helper function to safely parse an ID parameter
   * @param {string} idParam - ID parameter to parse
   * @returns {number} - Parsed ID or null if invalid
   */
  export const parseId = (idParam) => {
    try {
      const id = parseInt(idParam, 10);
      return isNaN(id) ? null : id;
    } catch (error) {
      return null;
    }
  };
  
  /**
   * Helper function to safely handle boolean parameters from request
   * @param {any} value - Value to convert to boolean
   * @returns {boolean|null} - Converted boolean or null if undefined
   */
  export const parseBoolean = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowercased = value.toLowerCase();
      if (lowercased === 'true' || lowercased === 'yes' || lowercased === '1') return true;
      if (lowercased === 'false' || lowercased === 'no' || lowercased === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return null;
  };
  
  /**
   * Check if a record exists in a table
   * @param {object} prisma - Prisma client
   * @param {string} model - Model name
   * @param {object} where - Where clause
   * @returns {Promise<boolean>} - Whether the record exists
   */
  export const recordExists = async (prisma, model, where) => {
    const count = await prisma[model].count({ where });
    return count > 0;
  };