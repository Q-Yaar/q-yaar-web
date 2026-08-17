import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';
import { QuestionCard } from './QuestionCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useFetchCategoriesQuery,
  useFetchQuestionTemplatesQuery,
  useFetchQuestionTemplateDetailsQuery,
  useAskQuestionMutation,
  useFetchAskedQuestionsQuery,
  useAcceptAnswerMutation,
  useUpdateAskedQuestionMutation,
} from '../../apis/qnaApi';
import { useFetchTeamsQuery, useFetchMyTeamQuery } from '../../apis/gameApi';
import { useCreateFactMutation } from '../../apis/api';
import { isPlayerTeam } from '../../models/Team';
import { Category, QuestionTemplate, AskedQuestion, GenericAskQuestionRequest } from '../../models/QnA';
import { BaseQuestionMeta, LocationPoint, FactMeta } from '../../models/QuestionMeta';
import {
  resolveCategory,
  isGeoCategory as checkIsGeoCategory,
  GEO_CATEGORIES,
  getCategoryConfig,
  getCanonicalCategory,
  getAskConfig,
  getAskRequiredLocations,
  getPlaceholderMap,
  getAskRequiredPlaceholders,
  DEFAULT_FACT_META,
  getToolTypeForCategory,
} from '../../config/questionCategories';
import { getAreaConfigByName, getAreaConfigByIdentifier, ALL_AREAS } from '../../config/areaConfig';
import { resolveAreaToFeatureName } from '../../utils/geoJsonLoader';
import MapComponent from '../../components/Map';
import {
  Loader,
  Send,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Clock,
  LayoutGrid,
  Check,
} from 'lucide-react';

import { Header } from '../../components/ui/header';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Modal } from '../../components/ui/modal';
import {
  Card,
  CardContent,
} from 'components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'components/ui/form';

export function AskQuestionModule() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const featureNameParam = searchParams.get('featureName') || '';
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  // This stores the shallow template from list
  const [selectedTemplateBasic, setSelectedTemplateBasic] =
    useState<QuestionTemplate | null>(null);

  const [locationErrorOpen, setLocationErrorOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<GenericAskQuestionRequest | null>(null);
  const [isAskingForLocation, setIsAskingForLocation] = useState(false);
  
  // Map picker for target location selection (geo questions)
  const [targetLocation, setTargetLocation] = useState<LocationPoint | null>(null);
  const [lastSelectedPOIName, setLastSelectedPOIName] = useState<string | null>(null);
  
  // Using centralized GEO_CATEGORIES from constants/questionCategories

  // Queries
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useFetchCategoriesQuery();
  const { data: templatesData, isLoading: isLoadingTemplates } =
    useFetchQuestionTemplatesQuery(
      { categoryId: selectedCategory?.category_id || '', gameId },
      { skip: !selectedCategory },
    );

  // Fetch detailed template when one is selected
  const { data: fullTemplate, isLoading: isLoadingTemplateDetails } =
    useFetchQuestionTemplateDetailsQuery(
      {
        categoryId: selectedCategory?.category_id || '',
        questionId: selectedTemplateBasic?.question_id || '',
      },
      { skip: !selectedCategory || !selectedTemplateBasic },
    );

  const { data: teams, isLoading: isLoadingTeams } = useFetchTeamsQuery(
    gameId || '',
    { skip: !gameId },
  );

  const { data: myTeam } = useFetchMyTeamQuery(gameId || '', {
    skip: !gameId,
  });

  const playerTeams = useMemo(() => {
    return teams?.filter(isPlayerTeam) || [];
  }, [teams]);

  const availableTeams = useMemo(() => {
    if (!playerTeams || !myTeam) return playerTeams;
    return playerTeams.filter((t) => t.team_id !== myTeam.team_id);
  }, [playerTeams, myTeam]);

  const [selectedHistoryTeamId, setSelectedHistoryTeamId] =
    useState<string>('');

  useEffect(() => {
    if (availableTeams.length > 0 && !selectedHistoryTeamId) {
      setSelectedHistoryTeamId(availableTeams[0].team_id);
    }
  }, [availableTeams, selectedHistoryTeamId]);

  // Fetch asked questions for history
  const { data: askedQuestionsData, isLoading: isLoadingHistory, refetch: refetchAskedQuestions } =
    useFetchAskedQuestionsQuery(
      { gameId: gameId || '', targetTeamId: selectedHistoryTeamId },
      { skip: !gameId || !selectedHistoryTeamId, pollingInterval: 15000 },
    );

  const [askQuestion, { isLoading: isAsking, error: askError }] =
    useAskQuestionMutation();

  const [acceptAnswer, { isLoading: isAccepting }] = useAcceptAnswerMutation();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [createFact] = useCreateFactMutation();

  // Confirmation modal state for auto-creating facts from geo questions
  const [showFactCreationModal, setShowFactCreationModal] = useState(false);
  const [questionForFactCreation, setQuestionForFactCreation] = useState<AskedQuestion | null>(null);
  const [isCreatingFact, setIsCreatingFact] = useState(false);

  const [updateAskedQuestion, { isLoading: isUpdatingLocation }] =
    useUpdateAskedQuestionMutation();
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(
    null,
  );

  const handleAddLocation = (question: AskedQuestion) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setUpdatingLocationId(question.question_id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newPoint: LocationPoint = {
          lat: latitude.toString(),
          lon: longitude.toString(),
        };

        // Collect all existing location points from question_meta
        const currentMeta = question.question_meta || {};
        const existingLocationPoints = currentMeta.location_points || [];
        
        // Also check for legacy fields in question_meta (from before the refactor)
        const legacyPoints: LocationPoint[] = [];
        const asAny = currentMeta as any;
        if (asAny.seekerLocation && asAny.seekerLocation.lat && asAny.seekerLocation.lon) {
          legacyPoints.push(asAny.seekerLocation);
        }
        if (asAny.targetLocation && asAny.targetLocation.lat && asAny.targetLocation.lon) {
          legacyPoints.push(asAny.targetLocation);
        }
        if (asAny.hiderLocation && asAny.hiderLocation.lat && asAny.hiderLocation.lon) {
          legacyPoints.push(asAny.hiderLocation);
        }
        if (asAny.previousLocation && asAny.previousLocation.lat && asAny.previousLocation.lon) {
          legacyPoints.push(asAny.previousLocation);
        }
        if (asAny.currentLocation && asAny.currentLocation.lat && asAny.currentLocation.lon) {
          legacyPoints.push(asAny.currentLocation);
        }
        if (asAny.center && asAny.center.lat && asAny.center.lon) {
          legacyPoints.push(asAny.center);
        }
        
        // Collect points from fact_meta if available
        const factMeta = question.fact_meta || {};
        const factMetaPoints = factMeta.points || [];
        
        // Combine all existing points and add the new point
        const allPoints = [...existingLocationPoints, ...legacyPoints, ...factMetaPoints, newPoint];
        
        // Build updated question_meta with only location_points
        const updatedMeta: BaseQuestionMeta = {
          location_points: allPoints,
          ...(featureNameParam && { feature_name: featureNameParam }),
        };

        // Build updated fact_meta with all required fields
        // Preserve any existing fact_meta values and add the new point
        const updatedFactMeta: FactMeta = {
          points: allPoints,
          radius: factMeta.radius || '',
          hider_location: factMeta.hider_location || '',
          split_direction: factMeta.split_direction || '',
          preferred_point: factMeta.preferred_point || '',
          area_op_type: factMeta.area_op_type || '',
          uploaded_area: factMeta.uploaded_area || '',
          text: factMeta.text || '',
          closer_further: factMeta.closer_further || '',
          selected_line_index: factMeta.selected_line_index || 0,
          polygon_geo_json: factMeta.polygon_geo_json || {},
          feature_name: featureNameParam || factMeta.feature_name || '',
        };

        console.log('Sending update with:', {
          question_meta: updatedMeta,
          fact_meta: updatedFactMeta,
        });

        try {
          const result = await updateAskedQuestion({
            gameId: gameId || '',
            askedQuestionId: question.question_id,
            body: {
              question_meta: updatedMeta,
              fact_meta: updatedFactMeta,
            },
          }).unwrap();
          
          console.log('Location updated, result:', result);
          console.log('Result question_meta:', result.question_meta);
          console.log('Result geo:', result.geo);
          
          // Refetch to update the UI with the new location count
          if (refetchAskedQuestions) {
            console.log('Refetching asked questions...');
            refetchAskedQuestions();
          }
        } catch (err) {
          console.error('Failed to update location', err);
          alert('Failed to update location.');
        } finally {
          setUpdatingLocationId(null);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setUpdatingLocationId(null);
        alert(
          'Failed to get location. Please ensure location services are enabled.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  // Form handling
  // Form handling
  const formSchema = useMemo(() => {
    return z
      .object({
        target_team_id: z.string().min(1, 'Please select a target team'),
        placeholders: z.record(z.string(), z.string()),
      })
      .superRefine((data, ctx) => {
        if (fullTemplate?.placeholders) {
          Object.entries(fullTemplate.placeholders).forEach(([key, config]) => {
            const value = data.placeholders[key];
            if (
              config.required &&
              (!value || (typeof value === 'string' && value.trim() === ''))
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'This field is required',
                path: ['placeholders', key],
              });
            }
          });
        }
      });
  }, [fullTemplate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      target_team_id: '',
      placeholders: {},
    },
  });

  // Reset form when template changes
  useEffect(() => {
    if (fullTemplate) {
      form.reset({
        target_team_id: '',
        placeholders: {},
      });
      setLastSelectedPOIName(null);
    }
  }, [fullTemplate, form]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedTemplateBasic(null);
    setTargetLocation(null);
    setLastSelectedPOIName(null);
  };

  const handleTemplateSelect = (template: QuestionTemplate) => {
    setSelectedTemplateBasic(template);
    setTargetLocation(null);
    setLastSelectedPOIName(null);
  };

  const sendQuestion = async (payload: GenericAskQuestionRequest) => {
    if (!gameId || !fullTemplate) return;
    try {
      await askQuestion({
        gameId,
        questionId: fullTemplate.question_id,
        body: payload,
      }).unwrap();

      // Reset after success
      setSelectedCategory(null);
      setSelectedTemplateBasic(null);
      setLocationErrorOpen(false);
      setPendingPayload(null);
      alert('Question asked successfully!');
    } catch (err) {
      console.error('Failed to ask question', err);
    }
  };

  /**
   * Find and resolve area selections from placeholders
   * Matching is done on featureIdentifier, not displayName (displayName is for UI only)
   */
  const resolveAreasFromPlaceholders = async (placeholders: Record<string, any>): Promise<string | null> => {
    // Check each placeholder value to see if it matches a feature identifier
    for (const [key, value] of Object.entries(placeholders)) {
      if (typeof value === 'string') {
        // First try to match by featureIdentifier (primary)
        const areaConfig = getAreaConfigByIdentifier(value);
        if (areaConfig) {
          // Found a matching area, resolve it to feature name from GeoJSON
          const resolved = await resolveAreaToFeatureName(areaConfig.displayName);
          if (resolved) {
            console.log('[AskQuestion] DEBUG: Resolved area selection:', value, '-> feature_name:', resolved.featureName);
            return resolved.featureName;
          }
        }
      }
    }
    return null;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('[AskQuestion] DEBUG: onSubmit called with values =', values);
    if (!gameId || !fullTemplate) return;

    // Get the category name and resolve to effective operation type
    const categoryName = selectedCategory?.category_name;
    const effectiveOperation = resolveCategory(categoryName);
    
    // Check if geo category requires target location using ASK phase config
    const askConfig = getAskConfig(categoryName || '');
    const askRequiredLocations = getAskRequiredLocations(categoryName || '');
    const requiresTargetLocation = askRequiredLocations.target && categoryName !== 'Radar';
    
    console.log('[AskQuestion] DEBUG: categoryName =', categoryName, 'effectiveOperation =', effectiveOperation, 'requiresTargetLocation =', requiresTargetLocation, 'targetLocation =', targetLocation);
    if (requiresTargetLocation && !targetLocation) {
      alert('Please select a target location on the map');
      return;
    }

    setIsAskingForLocation(true);

    // Resolve any area selections from placeholders
    const placeholders = values.placeholders || {};
    const resolvedFeatureName = featureNameParam || (await resolveAreasFromPlaceholders(placeholders)) || '';

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newSeekerLocation: LocationPoint = {
            lat: position.coords.latitude.toString(),
            lon: position.coords.longitude.toString(),
          };
          
          const categoryName = selectedCategory?.category_name;

          console.log('[AskQuestion] DEBUG: categoryName =', categoryName, 'effectiveOperation =', effectiveOperation, 'placeholders =', placeholders, 'resolvedFeatureName =', resolvedFeatureName);
          
          // Get ASK phase config for this category (resolves aliases)
          const askConfig = getAskConfig(categoryName || '');
          const askRequiredLocations = getAskRequiredLocations(categoryName || '');
          const placeholderMap = getPlaceholderMap(categoryName || '');
          
          // Start with default fact_meta values
          const factMeta: FactMeta = { ...DEFAULT_FACT_META, feature_name: resolvedFeatureName };
          
          // Collect location points based on ASK phase config only
          // Note: hider location is NOT collected here - it's provided during ANSWER phase
          const locationPoints: LocationPoint[] = [];
          
          // Helper to add location points based on ASK phase config
          if (askRequiredLocations.seeker) {
            locationPoints.push(newSeekerLocation);
          }
          if (askRequiredLocations.target && targetLocation) {
            locationPoints.push(targetLocation);
          }
          if (askRequiredLocations.center && placeholders.center_lat && placeholders.center_lon) {
            locationPoints.push({ lat: placeholders.center_lat, lon: placeholders.center_lon });
          }
          if (askRequiredLocations.previousLocation && placeholders.previous_lat && placeholders.previous_lon) {
            locationPoints.push({ lat: placeholders.previous_lat, lon: placeholders.previous_lon });
          }
          if (askRequiredLocations.currentLocation && placeholders.current_lat && placeholders.current_lon) {
            locationPoints.push({ lat: placeholders.current_lat, lon: placeholders.current_lon });
          }
          if (askRequiredLocations.linePoints && placeholders.line_points && Array.isArray(placeholders.line_points)) {
            locationPoints.push(...placeholders.line_points);
          }
          
          // Set points in fact_meta
          factMeta.points = locationPoints;
          
          // Map placeholders to fact_meta fields using ASK phase config
          if (placeholderMap) {
            for (const [placeholderName, factMetaField] of Object.entries(placeholderMap)) {
              if (placeholders[placeholderName] !== undefined) {
                const value = placeholders[placeholderName];
                // Special handling for numeric fields that need parsing
                if (factMetaField === 'selected_line_index' && typeof value === 'string') {
                  (factMeta as any)[factMetaField] = parseInt(value);
                } else if (factMetaField === 'polygon_geo_json') {
                  (factMeta as any)[factMetaField] = value; // Direct assignment for objects
                } else {
                  (factMeta as any)[factMetaField] = String(value);
                }
              }
            }
          }
          
          // Handle special cases not covered by config (backward compatibility)
          // For Circle/Radar: if category resolves to Circle, ensure seeker is used as center
          const canonicalName = getCanonicalCategory(categoryName);
          if (canonicalName === 'Circle' && factMeta.points.length === 0) {
            factMeta.points = [newSeekerLocation];
          }
          
          // Fallback for radius/distance if not set by config mapping
          if (!factMeta.radius && placeholders.radius !== undefined) {
            factMeta.radius = String(placeholders.radius);
          }
          if (!factMeta.radius && placeholders.distance !== undefined) {
            factMeta.radius = String(placeholders.distance);
          }
          if (placeholders.hiderLocation !== undefined) {
            factMeta.hider_location = placeholders.hiderLocation;
          }

          console.log('[AskQuestion] DEBUG: Final factMeta =', factMeta);
          console.log('[AskQuestion] DEBUG: Final locationPoints =', locationPoints);
          
          // Build final payload with proper separation:
          // - question_meta only contains location_points
          // - fact_meta contains all category-specific fields
          const finalPayload: GenericAskQuestionRequest = {
            target_team_id: values.target_team_id,
            chosen_placeholders: values.placeholders,
            question_meta: {
              location_points: locationPoints,
              ...((resolvedFeatureName || placeholders.feature_name) && {
                feature_name: resolvedFeatureName || placeholders.feature_name
              }),
            },
            fact_meta: factMeta,
          };

          console.log('[AskQuestion] DEBUG: SENDING payload =', finalPayload);
          
          setIsAskingForLocation(false);
          sendQuestion(finalPayload);
        },
        (error) => {
          console.error('[AskQuestion] DEBUG: Geolocation error:', error);
          console.log('[AskQuestion] DEBUG: values =', values);
          // Build a minimal payload without geolocation data using ASK phase config
          const minimalFactMeta: FactMeta = { ...DEFAULT_FACT_META, feature_name: resolvedFeatureName };
          const placeholders = values.placeholders || {};
          const placeholderMap = getPlaceholderMap(categoryName || '');
          
          // Apply placeholder mappings from ASK phase config
          if (placeholderMap) {
            for (const [placeholderName, factMetaField] of Object.entries(placeholderMap)) {
              if (placeholders[placeholderName] !== undefined) {
                const value = placeholders[placeholderName];
                if (factMetaField === 'selected_line_index' && typeof value === 'string') {
                  (minimalFactMeta as any)[factMetaField] = parseInt(value);
                } else if (factMetaField === 'polygon_geo_json') {
                  (minimalFactMeta as any)[factMetaField] = value;
                } else {
                  (minimalFactMeta as any)[factMetaField] = String(value);
                }
              }
            }
          }
          
          // Fallback for radius/distance
          if (!minimalFactMeta.radius && placeholders.radius !== undefined) {
            minimalFactMeta.radius = String(placeholders.radius);
          }
          if (!minimalFactMeta.radius && placeholders.distance !== undefined) {
            minimalFactMeta.radius = String(placeholders.distance);
          }
          if (placeholders.hiderLocation !== undefined) {
            minimalFactMeta.hider_location = placeholders.hiderLocation;
          }
          
          console.log('[AskQuestion] DEBUG: Error path minimalFactMeta =', minimalFactMeta);
          const minimalPayload: GenericAskQuestionRequest = {
            target_team_id: values.target_team_id,
            chosen_placeholders: values.placeholders,
            question_meta: {
              location_points: [],
              ...((resolvedFeatureName || placeholders.feature_name) && {
                feature_name: resolvedFeatureName || placeholders.feature_name
              }),
            },
            fact_meta: minimalFactMeta,
          };
          console.log('[AskQuestion] DEBUG: Error path SENDING payload =', minimalPayload);
          setPendingPayload(minimalPayload);
          setIsAskingForLocation(false);
          setLocationErrorOpen(true);
        },
      );
    } else {
      console.warn('[AskQuestion] DEBUG: Geolocation not available');
      console.log('[AskQuestion] DEBUG: values =', values);
      // Build a minimal payload without geolocation data using ASK phase config
      const minimalFactMeta: FactMeta = { ...DEFAULT_FACT_META, feature_name: resolvedFeatureName };
      const placeholders = values.placeholders || {};
      const placeholderMap = getPlaceholderMap(categoryName || '');
      
      // Apply placeholder mappings from ASK phase config
      if (placeholderMap) {
        for (const [placeholderName, factMetaField] of Object.entries(placeholderMap)) {
          if (placeholders[placeholderName] !== undefined) {
            const value = placeholders[placeholderName];
            if (factMetaField === 'selected_line_index' && typeof value === 'string') {
              (minimalFactMeta as any)[factMetaField] = parseInt(value);
            } else if (factMetaField === 'polygon_geo_json') {
              (minimalFactMeta as any)[factMetaField] = value;
            } else {
              (minimalFactMeta as any)[factMetaField] = String(value);
            }
          }
        }
      }
      
      // Fallback for radius/distance
      if (!minimalFactMeta.radius && placeholders.radius !== undefined) {
        console.log('[AskQuestion] DEBUG: Setting radius from placeholders.radius =', placeholders.radius);
        minimalFactMeta.radius = String(placeholders.radius);
      }
      if (!minimalFactMeta.radius && placeholders.distance !== undefined) {
        console.log('[AskQuestion] DEBUG: Setting radius from placeholders.distance =', placeholders.distance);
        minimalFactMeta.radius = String(placeholders.distance);
      }
      if (placeholders.hiderLocation !== undefined) {
        minimalFactMeta.hider_location = placeholders.hiderLocation;
      }
      
      console.log('[AskQuestion] DEBUG: No-geolocation path minimalFactMeta =', minimalFactMeta);
      const minimalPayload: GenericAskQuestionRequest = {
        target_team_id: values.target_team_id,
        chosen_placeholders: values.placeholders,
        question_meta: {
          location_points: [],
          ...((resolvedFeatureName || placeholders.feature_name) && {
            feature_name: resolvedFeatureName || placeholders.feature_name
          }),
        },
        fact_meta: minimalFactMeta,
      };
      console.log('[AskQuestion] DEBUG: No-geolocation path SENDING payload =', minimalPayload);
      setPendingPayload(minimalPayload);
      setIsAskingForLocation(false);
      setLocationErrorOpen(true);
    }
  };

  const handleLocationErrorProceed = () => {
    if (pendingPayload) {
      sendQuestion(pendingPayload);
    }
  };

  const handleLocationErrorCancel = () => {
    setLocationErrorOpen(false);
    setPendingPayload(null);
  };

  const handleAccept = async (question: AskedQuestion) => {
    if (!gameId) return;
    
    const categoryName = question.category.category_name;
    const isGeoQuestion = GEO_CATEGORIES.has(categoryName);
    
    if (isGeoQuestion) {
      // For geo questions, show confirmation modal first
      setQuestionForFactCreation(question);
      setShowFactCreationModal(true);
    } else {
      // For non-geo questions, accept directly
      await handleAcceptConfirmed(question);
    }
  };

  const handleAcceptConfirmed = async (question: AskedQuestion, shouldCreateFact: boolean = false) => {
    if (!gameId) return;
    setAcceptingId(question.question_id);
    
    try {
      // Accept the answer
      await acceptAnswer({
        gameId,
        askedQuestionId: question.question_id,
      }).unwrap();
    } catch (err) {
      console.error('Failed to accept answer', err);
      alert('Failed to accept answer.');
      setAcceptingId(null);
      setShowFactCreationModal(false);
      setQuestionForFactCreation(null);
      return;
    }
    
    // If this is a geo question and user wants to create a fact
    if (shouldCreateFact && questionForFactCreation) {
      try {
        await createFactFromQuestion(questionForFactCreation);
      } catch (err) {
        console.error('Failed to create fact from question', err);
        alert('Answer accepted, but failed to create fact. The answer was still accepted.');
      }
    }
    
    setAcceptingId(null);
    setShowFactCreationModal(false);
    setQuestionForFactCreation(null);
  };

  const createFactFromQuestion = async (question: AskedQuestion) => {
    if (!gameId || !myTeam) return;
    
    setIsCreatingFact(true);
    try {
      // Get tool type from config (resolves aliases automatically)
      const opType = getToolTypeForCategory(question.category.category_name) || question.category.category_name;
      
      // Collect all location points from various meta fields
      const allPoints: LocationPoint[] = [];
      const qMeta = question.question_meta || {};
      
      // Add location_points
      if (qMeta.location_points) {
        allPoints.push(...qMeta.location_points);
      }
      
      // Add seekerLocation if present
      if (qMeta.seekerLocation) {
        allPoints.push(qMeta.seekerLocation);
      }
      
      // Add targetLocation if present
      if (qMeta.targetLocation) {
        allPoints.push(qMeta.targetLocation);
      }
      
      // Add hiderLocation if present
      if (qMeta.hiderLocation) {
        allPoints.push(qMeta.hiderLocation);
      }
      
      // Map category-specific metadata to operation fields
      // For draw-circle: needs radius and hiderLocation
      // For split-by-direction: needs splitDirection
      // For hotter-colder: needs preferredPoint
      // For areas: needs areaOpType, selectedLineIndex, uploadedArea
      // For closer-to-line: needs closerFurther, selectedLineIndex, multiLineString
      // For polygon-location: needs polygonGeoJSON
      
      // Extract values from question_meta, preserving the backend's expected structure
      // The question_meta uses camelCase field names (seekerLocation, targetLocation, etc.)
      // which match what the fact backend expects
      await createFact({
        game_id: gameId,
        team_id: myTeam.team_id,
        fact_type: 'GEO',
        fact_info: {
          op_type: opType,
          op_meta: {
            // Core location data - all points collected
            points: allPoints,
            
            // Circle/Draw operations
            radius: qMeta.radius || '',
            
            // Direction operations
            splitDirection: qMeta.split_direction || qMeta.splitDirection || '',
            
            // Hotter/Colder operations
            preferredPoint: qMeta.preferred_point || qMeta.preferredPoint || '',
            
            // Area operations
            areaOpType: qMeta.area_op_type || qMeta.areaOpType || '',
            uploadedArea: qMeta.uploaded_area || qMeta.uploadedArea || '',
            
            // Line operations
            closerFurther: qMeta.closer_further || qMeta.closerFurther || '',
            multiLineString: qMeta.multi_line_string || qMeta.multiLineString || null,
            selectedLineIndex: qMeta.selected_line_index !== undefined ? qMeta.selected_line_index : 
                               (qMeta.selectedLineIndex !== undefined ? qMeta.selectedLineIndex : 0),
            
            // Polygon operations
            polygonGeoJSON: qMeta.polygon_geo_json || qMeta.polygonGeoJSON || {},
            
            // Feature naming
            featureName: qMeta.feature_name || qMeta.featureName || '',
            
            // Additional metadata for tracking
            sourceQuestionId: question.question_id,
            sourceQuestion: question.rendered_question,
            acceptedAnswer: question.answer_meta?.result,
            answerText: question.answer_meta?.metadata?.text,
            createdFrom: 'accepted_question',
          },
        },
      }).unwrap();
    } catch (err) {
      console.error('Failed to create fact from question', err);
      throw err; // Re-throw so caller can handle it
    } finally {
      setIsCreatingFact(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Use fullTemplate if available for rendering Step 3, otherwise fallback/loading
  const activeTemplate = fullTemplate || selectedTemplateBasic;

  // Filter questions for display (maybe sort by date desc?)
  const myAskedQuestions = askedQuestionsData?.results
    ? [...askedQuestionsData.results].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      {/* Header */}
      <Header
        title="Ask a Question"
        icon={<HelpCircle className="w-5 h-5 mr-2 text-indigo-600" />}
        onBack={handleBack}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Progress / Breadcrumbs */}
        {(selectedCategory || selectedTemplateBasic) && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedTemplateBasic(null);
              }}
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              Categories
            </button>
            {selectedCategory && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <button
                  onClick={() => setSelectedTemplateBasic(null)}
                  className={`font-medium transition-colors ${!selectedTemplateBasic ? 'text-indigo-600 font-bold' : 'hover:text-indigo-600'}`}
                >
                  {selectedCategory.category_name}
                </button>
              </>
            )}
            {selectedTemplateBasic && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <span className="text-indigo-600 font-bold truncate max-w-[150px]">
                  Ask
                </span>
              </>
            )}
          </div>
        )}

        {/* Step 1: Category Selection */}
        {!selectedCategory && (
          <>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 px-1 text-left">
                <LayoutGrid className="w-5 h-5 mr-2 text-indigo-600 inline" />
                Choose a Category
              </h2>
              {isLoadingCategories ? (
                <div className="flex justify-center p-12">
                  <Loader className="animate-spin text-indigo-600 w-8 h-8" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoriesData?.results.map((category) => (
                    <CategoryCard
                      key={category.category_id}
                      category={category}
                      onClick={handleCategorySelect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* History Section (Visible only when filtering categories/on initial screen) */}
            <div className="pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h2 className="text-lg font-semibold text-gray-900 px-1 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-500" />
                  Question History
                </h2>

                {/* Team Filter Dropdown */}
                <div className="w-full sm:w-64">
                  <div className="relative">
                    <select
                      value={selectedHistoryTeamId}
                      onChange={(e) => setSelectedHistoryTeamId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      disabled={isLoadingTeams}
                    >
                      {availableTeams.map((team) => (
                        <option key={team.team_id} value={team.team_id}>
                          {team.team_name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="space-y-3">
                  <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : myAskedQuestions.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">
                    You haven't asked any questions to this team yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myAskedQuestions.map((q) => (
                    <QuestionCard
                      key={q.question_id}
                      question={q}
                      gameId={gameId}
                      onAccept={handleAccept}
                      isAccepting={isAccepting}
                      acceptingId={acceptingId}
                      onAddLocation={handleAddLocation}
                      isUpdatingLocation={isUpdatingLocation}
                      updatingLocationId={updatingLocationId}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Template Selection */}
        {selectedCategory && !selectedTemplateBasic && (
          <div className="space-y-4">
            <h2 className="text-left text-lg font-semibold text-gray-900 px-1">
              Select a Question
            </h2>
            {isLoadingTemplates ? (
              <div className="flex justify-center p-12">
                <Loader className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : (
              <div className="space-y-3">
                {templatesData?.results.map((template) => (
                  <Card
                    key={template.question_id}
                    className="cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-[0.98] group"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="p-5">
                      <p className="text-gray-800 text-lg group-hover:text-indigo-700 transition-colors">
                        {template.template}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Ask Form */}
        {selectedCategory && selectedTemplateBasic && (
          <div className="space-y-6">
            {isLoadingTemplateDetails ? (
              <div className="flex justify-center p-12">
                <Loader className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : activeTemplate ? (
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-6">
                  {/* Question Preview */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Selected Question
                    </label>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900 font-medium text-lg">
                      {activeTemplate.template}
                    </div>
                  </div>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      {/* Target Team Selection */}
                      <FormField
                        control={form.control}
                        name="target_team_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Team</FormLabel>
                            {isLoadingTeams ? (
                              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                            ) : (
                              <div className="relative">
                                <FormControl>
                                  <select
                                    {...field}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                  >
                                    <option value="">Select a team...</option>
                                    {availableTeams.map((team) => (
                                      <option
                                        key={team.team_id}
                                        value={team.team_id}
                                      >
                                        {team.team_name}
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Placeholders */}
                      {activeTemplate.placeholders &&
                        Object.keys(activeTemplate.placeholders).length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="font-medium text-gray-900">
                              Fill Missing Details
                            </h3>
                            {Object.keys(activeTemplate.placeholders).map(
                              (key) => {
                                const config =
                                  activeTemplate.placeholders![key];
                                return (
                                  <FormField
                                    key={key}
                                    control={form.control}
                                    name={`placeholders.${key}`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="capitalize">
                                          {key.replace(/_/g, ' ')}{' '}
                                          {config.required && (
                                            <span className="text-red-500">
                                              *
                                            </span>
                                          )}
                                        </FormLabel>
                                        <FormControl>
                                          {config.allowed_values &&
                                          config.allowed_values.length > 0 ? (
                                            <div className="relative">
                                              <select
                                                {...field}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                                value={field.value || ''}
                                              >
                                                <option value="">
                                                  Select...
                                                </option>
                                                {config.allowed_values.map(
                                                  (val) => (
                                                    <option
                                                      key={val}
                                                      value={val}
                                                    >
                                                      {val}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                                            </div>
                                          ) : (
                                            <Input
                                              {...field}
                                              placeholder={`Type here...`}
                                              value={field.value || ''}
                                            />
                                          )}
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                );
                              },
                            )}
                          </div>
                        )}

                      {/* Map Picker for Geo Questions */}
                      {selectedCategory && GEO_CATEGORIES.has(selectedCategory.category_name) && 
                        selectedCategory.category_name !== 'Radar' &&
                        getAskRequiredLocations(selectedCategory.category_name).target && (
                        <div className="pt-4 border-t border-gray-100">
                          <h3 className="font-medium text-gray-900 mb-2">
                            Select Target Location
                          </h3>
                          <p className="text-sm text-gray-500 mb-3">
                            Click on a point of interest on the map to set the target location
                          </p>
                          <div className="h-64 rounded-lg overflow-hidden border border-gray-200 relative">
                            <MapComponent
                              action="select-target"
                              points={[]}
                              setPoints={() => {}}
                              setDistance={() => {}}
                              setHeading={() => {}}
                              radius={0}
                              hiderLocation="inside"
                              playArea={null}
                              splitDirection="North"
                              preferredPoint="p1"
                              areaOpType="inside"
                              uploadedAreaForOp={null}
                              multiLineStringForOp={null}
                              closerFurther="closer"
                              selectedLineIndex={0}
                              polygonGeoJSONForOp={null}
                              operations={[]}
                              currentLocation={null}
                              referencePoints={[]}
                              playerLocations={[]}
                              onLocationUpdate={() => {}}
                              onLocationError={() => {}}
                              onPointPOIInfoChange={(poiInfo) => {
                                if (poiInfo && poiInfo[0]) {
                                  const poi = poiInfo[0];
                                  // Extract coordinates from POI
                                  // Coordinates can be in properties.coordinates (added for select-target)
                                  // or we need to use the click position
                                  if (poi.properties && poi.properties.coordinates) {
                                    const [lon, lat] = poi.properties.coordinates;
                                    setTargetLocation({
                                      lat: lat.toString(),
                                      lon: lon.toString(),
                                    });
                                    
                                    // Auto-populate landmark placeholder if available
                                    const poiName = poi.name || null;
                                    
                                    // Clear previous POI name from placeholder if it was set
                                    // (this happens when clicking a new location, POI or not)
                                    if (lastSelectedPOIName) {
                                      const placeholderKeys = Object.keys(fullTemplate?.placeholders || {});
                                      for (const key of placeholderKeys) {
                                        if (form.getValues(`placeholders.${key}`) === lastSelectedPOIName) {
                                          form.setValue(`placeholders.${key}`, '');
                                          break;
                                        }
                                      }
                                      setLastSelectedPOIName(null);
                                    }
                                    
                                    // Only proceed with auto-population if we have a POI name
                                    if (poiName) {
                                      // Try to find a suitable placeholder for the POI name
                                      // Common names: landmark, location, target, place, destination
                                      const landmarkPlaceholderNames = ['landmark', 'location', 'target', 'place', 'destination', 'poi'];
                                      let placeholderToSet: string | null = null;
                                      
                                      for (const name of landmarkPlaceholderNames) {
                                        if (fullTemplate?.placeholders && fullTemplate.placeholders[name]) {
                                          placeholderToSet = name;
                                          break;
                                        }
                                      }
                                      
                                      // If no specific placeholder found, use the first text placeholder
                                      if (!placeholderToSet && fullTemplate?.placeholders) {
                                        const placeholderKeys = Object.keys(fullTemplate.placeholders);
                                        for (const key of placeholderKeys) {
                                          const config = fullTemplate.placeholders[key];
                                          // Only auto-populate if it's not a dropdown (has allowed_values)
                                          if (!config.allowed_values || config.allowed_values.length === 0) {
                                            placeholderToSet = key;
                                            break;
                                          }
                                        }
                                      }
                                      
                                      // Set the placeholder value if we found one
                                      if (placeholderToSet && poiName) {
                                        form.setValue(`placeholders.${placeholderToSet}`, poiName);
                                        setLastSelectedPOIName(poiName);
                                      }
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                          {targetLocation && (
                            <div className="mt-2 text-sm text-green-600 flex items-center">
                              <Check className="w-4 h-4 mr-1" />
                              Target selected: {targetLocation.lat}, {targetLocation.lon}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="pt-4">
                        {askError && (
                          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm mb-4">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>Failed to send. Please try again.</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={isAsking || isAskingForLocation}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-6 text-lg shadow-lg shadow-indigo-200"
                        >
                          {isAsking || isAskingForLocation ? (
                            <Loader className="w-6 h-6 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              <span>Send Question</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <div className="p-4 text-red-500 text-center">
                Failed to load question details.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location Error Modal */}
      {locationErrorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Location Access Needed
              </h3>
              <p className="text-gray-500">
                We couldn't get your location. Would you like to send the
                question without it?
              </p>
              <div className="flex flex-col w-full space-y-3 pt-2">
                <Button
                  onClick={handleLocationErrorProceed}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isAsking}
                >
                  Ask Without Location
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLocationErrorCancel}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fact Creation Confirmation Modal */}
      <Modal
        isOpen={showFactCreationModal}
        onClose={() => {
          setShowFactCreationModal(false);
          setQuestionForFactCreation(null);
        }}
        title="Create Fact from Question"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-left">
            This geographic question contains location data. Would you like to save it as a fact for your team?
          </p>
          
          {questionForFactCreation && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Question
              </p>
              <p className="text-gray-900 text-sm">
                {questionForFactCreation.rendered_question}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Category: {questionForFactCreation.category.category_name}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowFactCreationModal(false);
                setQuestionForFactCreation(null);
                // Accept without creating fact
                if (questionForFactCreation) {
                  handleAcceptConfirmed(questionForFactCreation, false);
                }
              }}
              disabled={isAccepting || isCreatingFact}
            >
              Accept Only
            </Button>
            <Button
              onClick={() => {
                if (questionForFactCreation) {
                  handleAcceptConfirmed(questionForFactCreation, true);
                }
              }}
              disabled={isAccepting || isCreatingFact}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isAccepting || isCreatingFact ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Accept & Create Fact'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
