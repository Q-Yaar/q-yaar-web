import { useEffect, useState } from 'react';
import { resolveAreaToFeatureName, ResolvedArea } from '../utils/geoJsonLoader';
import { getAreaConfigByName, ALL_AREAS, AreaConfig } from '../config/areaConfig';

/**
 * Hook to resolve area display names to feature names for automation
 */
export function useAreaMapping() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [resolvedAreas, setResolvedAreas] = useState<Map<string, ResolvedArea>>(new Map());

  /**
   * Resolve a single area display name to its feature name
   */
  const resolveArea = async (displayName: string): Promise<ResolvedArea | null> => {
    // Check cache first
    if (resolvedAreas.has(displayName)) {
      return resolvedAreas.get(displayName) || null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resolved = await resolveAreaToFeatureName(displayName);
      if (resolved) {
        setResolvedAreas(prev => new Map(prev).set(displayName, resolved));
      }
      return resolved;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resolve multiple area display names
   */
  const resolveAreas = async (displayNames: string[]): Promise<Map<string, ResolvedArea>> => {
    const results = new Map<string, ResolvedArea>();
    
    for (const name of displayNames) {
      const resolved = await resolveArea(name);
      if (resolved) {
        results.set(name, resolved);
      }
    }
    
    return results;
  };

  /**
   * Get the feature name for a resolved area
   */
  const getFeatureName = (displayName: string): string | null => {
    const resolved = resolvedAreas.get(displayName);
    return resolved?.featureName || null;
  };

  /**
   * Get all available area display names
   */
  const getAvailableAreaNames = (): string[] => {
    return ALL_AREAS.map(a => a.displayName);
  };

  /**
   * Check if an area display name is valid
   */
  const isValidArea = (displayName: string): boolean => {
    return ALL_AREAS.some(a => a.displayName === displayName);
  };

  /**
   * Get area config by display name (synchronous)
   */
  const getAreaConfig = (displayName: string): AreaConfig | null => {
    return getAreaConfigByName(displayName);
  };

  return {
    isLoading,
    error,
    resolvedAreas,
    resolveArea,
    resolveAreas,
    getFeatureName,
    getAvailableAreaNames,
    isValidArea,
    getAreaConfig,
  };
}
