/**
 * Utility functions for formatting values in the application
 */

/**
 * Format a number as currency
 * @param value The number to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value);
};

/**
 * Format a date string to a localized format
 * @param dateString The date string to format
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format a date and time string to a localized format
 * @param dateTimeString The date and time string to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  const date = new Date(dateTimeString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Format a number with its appropriate unit
 * @param value The number to format
 * @param unit The unit to append (e.g., 'minutes', 'gallons')
 * @returns Formatted string with unit
 */
export const formatWithUnit = (value: number, unit: string): string => {
  if (value === null || value === undefined) return '';
  return `${value.toLocaleString()} ${unit}`;
}; 