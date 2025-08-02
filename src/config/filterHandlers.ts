/**
 * Filter handlers and their implementations
 * 
 * This file contains common filter handlers used across all universities.
 * Filter handlers are responsible for converting between UI filter selections
 * and API request parameters in a bidirectional manner.
 */

import { FilterHandler } from './filterConfigs';

/**
 * Common filter handlers shared across all universities
 * Currently empty as all handlers are university-specific
 * and defined in their respective configurations
 */
export const commonFilterHandlers: Record<string, FilterHandler> = {}; 