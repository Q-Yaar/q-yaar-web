/**
 * Configuration for the Question Automation system
 * This file defines which categories can be automated and system behavior
 */

import { initAutomationConfig } from '../services/questionAutomation';

/**
 * Configuration options for question automation
 */
export interface QuestionAutomationConfig {
  /** Master switch to enable/disable automation entirely */
  enabled: boolean;
  
  /** Categories that should always be answered manually (never auto-answered) */
  manualOnlyCategories: string[];
  
  /** Minimum confidence percentage to auto-submit an answer (0-100) */
  autoSubmitThreshold: number;
  
  /** Whether to show debug logs in console */
  debug: boolean;
}

/**
 * Default configuration
 */
export const defaultQuestionAutomationConfig: QuestionAutomationConfig = {
  enabled: true,
  manualOnlyCategories: [
    'Photo',
    'Video',
    'Image',
    'Picture',
    'Capture',
    'Subjective',
    'Opinion'
  ],
  autoSubmitThreshold: 100,
  debug: false
};

/**
 * Initialize the automation system with configuration
 * Call this at app startup or when configuration changes
 */
export function initializeAutomation(config?: Partial<QuestionAutomationConfig>): void {
  const mergedConfig = {
    ...defaultQuestionAutomationConfig,
    ...config,
    // Ensure manualOnlyCategories is always an array
    manualOnlyCategories: [
      ...defaultQuestionAutomationConfig.manualOnlyCategories,
      ...(config?.manualOnlyCategories || [])
    ].filter((cat, index, self) => self.indexOf(cat) === index) // Remove duplicates
  };

  initAutomationConfig({
    enabled: mergedConfig.enabled,
    manualCategories: new Set(mergedConfig.manualOnlyCategories),
    autoSubmitThreshold: mergedConfig.autoSubmitThreshold,
    debug: mergedConfig.debug
  });
}

/**
 * Get the current configuration
 */
export function getAutomationConfig(): QuestionAutomationConfig {
  return defaultQuestionAutomationConfig;
}

/**
 * Update automation configuration at runtime
 */
export function updateAutomationConfig(config: Partial<QuestionAutomationConfig>): void {
  initializeAutomation(config);
}

/**
 * Add a category to the manual-only list
 */
export function addManualOnlyCategory(categoryName: string): void {
  const current = getAutomationConfig();
  if (!current.manualOnlyCategories.includes(categoryName)) {
    updateAutomationConfig({
      manualOnlyCategories: [...current.manualOnlyCategories, categoryName]
    });
  }
}

/**
 * Remove a category from the manual-only list
 */
export function removeManualOnlyCategory(categoryName: string): void {
  const current = getAutomationConfig();
  updateAutomationConfig({
    manualOnlyCategories: current.manualOnlyCategories.filter(c => c !== categoryName)
  });
}

// Initialize with defaults on module load
initializeAutomation();
