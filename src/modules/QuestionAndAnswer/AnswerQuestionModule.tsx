import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useFetchAskedQuestionsQuery,
  useAnswerQuestionMutation,
} from '../../apis/qnaApi';
import { useFetchMyTeamQuery } from '../../apis/gameApi';
import { AskedQuestion } from '../../models/QnA';
import { LocationPoint, FactMeta } from '../../models/QuestionMeta';
import {
  GEO_CATEGORIES,
  resolveCategory,
  getOperationType,
  tryAutoAnswer,
  AutoAnswer,
  getAutomationConfig,
} from '../../config/questionCategories';
import {
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  Map,
  MapPin,
  Gift,
  Zap,
} from 'lucide-react';

import { QuestionCard } from './QuestionCard';
import { Modal } from '../../components/ui/modal';

import { Header } from '../../components/ui/header';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { cn } from 'utils/utils';
import { formatDate } from 'utils/dateUtils';
import type { Coord } from '../../utils/geo';

export function AnswerQuestionModule() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  // Using centralized GEO_CATEGORIES from constants/questionCategories

  const { data: myTeam } = useFetchMyTeamQuery(gameId || '', {
    skip: !gameId,
  });

  const { data: askedQuestionsData, isLoading, refetch: refetchAskedQuestions } = useFetchAskedQuestionsQuery(
    { gameId: gameId || '', targetTeamId: myTeam?.team_id || '' },
    { skip: !gameId || !myTeam, pollingInterval: 30000 },
  );

  const [answerQuestion, { isLoading: isAnswering }] =
    useAnswerQuestionMutation();
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

  // Automation state
  const [autoAnswerModalOpen, setAutoAnswerModalOpen] = useState(false);
  const [questionForAutoAnswer, setQuestionForAutoAnswer] = useState<AskedQuestion | null>(null);
  const [computedAutoAnswer, setComputedAutoAnswer] = useState<AutoAnswer | null>(null);
  const [isConfirmingAutoAnswer, setIsConfirmingAutoAnswer] = useState(false);
  
  // Track which questions we've already checked for auto-answer
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());

  const handleOpenLocation = (lat: string, lon: string) => {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
  };

  const handleAnswer = async (question: AskedQuestion, result: boolean) => {
    if (!gameId) return;

    setAnsweringId(question.question_id);
    const answerText = answerTexts[question.question_id]?.trim();

    try {
      await answerQuestion({
        gameId,
        askedQuestionId: question.question_id,
        body: {
          answer_meta: {
            result: result,
            metadata: {
              text: answerText || '',
            },
          },
        },
      }).unwrap();
      // Clear answer text after successful submission
      setAnswerTexts((prev) => {
        const next = { ...prev };
        delete next[question.question_id];
        return next;
      });
    } catch (err) {
      console.error('Failed to answer', err);
      alert('Failed to submit answer.');
    } finally {
      setAnsweringId(null);
    }
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswerTexts((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Check if a question can be auto-answered and show confirmation modal
  const checkAndShowAutoAnswer = useCallback(async (question: AskedQuestion) => {
    const config = getAutomationConfig();
    if (!config.enabled) return;

    // Skip if already checked or answered
    if (checkedQuestions.has(question.question_id) || question.answered) return;

    // For geo questions, we may need to get the user's current location
    // Convention: location_points[0] = seekerLocation, [1] = targetLocation, [2] = hiderLocation (answerer)
    const categoryName = question.category.category_name;
    const isGeoQuestion = GEO_CATEGORIES.has(categoryName);
    
    // Check if we need more location data for automation
    // Different categories need different numbers of points:
    // - Measuring: needs 3 points (seeker, target, hider)
    // - Circle/Radar: needs 2 points (center, target) + user location
    // - Other geo: needs at least 2 points
    const locationCount = question.question_meta?.location_points?.length || 0;
    
    // Measuring needs 3 points total, others need at least 2
    const requiresUserLocation = categoryName === 'Measuring' 
      ? locationCount < 3 
      : locationCount < 2;
    
    const needsUserLocation = isGeoQuestion && requiresUserLocation && navigator.geolocation;
    
    if (needsUserLocation) {
      // Get current location and check auto-answer with it
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLocation: LocationPoint = {
            lat: position.coords.latitude.toString(),
            lon: position.coords.longitude.toString(),
          };
          
          // Create a temporary question with user location added to fact_meta
          const existingFactMeta = question.fact_meta || {};
          const augmentedFactMeta: FactMeta = {
            points: [
              ...(existingFactMeta.points || []),
              userLocation,
            ],
            radius: existingFactMeta.radius || '',
            hider_location: existingFactMeta.hider_location || '',
            split_direction: existingFactMeta.split_direction || '',
            preferred_point: existingFactMeta.preferred_point || '',
            area_op_type: existingFactMeta.area_op_type || '',
            uploaded_area: existingFactMeta.uploaded_area || '',
            text: existingFactMeta.text || '',
            closer_further: existingFactMeta.closer_further || '',
            selected_line_index: existingFactMeta.selected_line_index || 0,
            polygon_geo_json: existingFactMeta.polygon_geo_json || {},
            feature_name: existingFactMeta.feature_name || '',
          };
          
          const augmentedQuestion: AskedQuestion = {
            ...question,
            question_meta: {
              ...question.question_meta,
              location_points: [
                ...(question.question_meta?.location_points || []),
                userLocation,
              ],
            },
            fact_meta: augmentedFactMeta,
          };
          
          const autoAnswer = await tryAutoAnswer(augmentedQuestion);
          if (autoAnswer) {
            // Mark as checked so we don't show modal repeatedly
            setCheckedQuestions(prev => new Set(prev).add(question.question_id));
            
            // Store the original question and computed answer for the modal
            setQuestionForAutoAnswer(question);
            setComputedAutoAnswer(autoAnswer);
            setAutoAnswerModalOpen(true);
          }
        },
        async (err) => {
          console.error('Failed to get location for auto-answer:', err);
          // If we can't get location, try without it (might work if locations already present)
          const autoAnswer = await tryAutoAnswer(question);
          if (autoAnswer) {
            setCheckedQuestions(prev => new Set(prev).add(question.question_id));
            setQuestionForAutoAnswer(question);
            setComputedAutoAnswer(autoAnswer);
            setAutoAnswerModalOpen(true);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
      return;
    }

    const autoAnswer = await tryAutoAnswer(question);
    if (autoAnswer) {
      // Mark as checked so we don't show modal repeatedly
      setCheckedQuestions(prev => new Set(prev).add(question.question_id));
      
      // Store the question and computed answer for the modal
      setQuestionForAutoAnswer(question);
      setComputedAutoAnswer(autoAnswer);
      setAutoAnswerModalOpen(true);
    }
  }, [checkedQuestions]);

  // Handle confirming an auto-answer
  const handleConfirmAutoAnswer = async () => {
    if (!gameId || !questionForAutoAnswer || !computedAutoAnswer) return;

    setIsConfirmingAutoAnswer(true);
    setAutoAnswerModalOpen(false);

    try {
      await answerQuestion({
        gameId,
        askedQuestionId: questionForAutoAnswer.question_id,
        body: {
          answer_meta: {
            result: computedAutoAnswer.result,
            metadata: {
              text: computedAutoAnswer.metadata.text || '',
              auto_answered: true,
              computation_method: computedAutoAnswer.metadata.computationMethod,
              confidence: computedAutoAnswer.metadata.confidence,
            },
          },
        },
      }).unwrap();

      // Clear the auto-answer state
      setQuestionForAutoAnswer(null);
      setComputedAutoAnswer(null);
    } catch (err) {
      console.error('Failed to submit auto-answer', err);
      alert('Failed to submit auto-answer. Please try again.');
      // Re-open modal so user can try again
      setAutoAnswerModalOpen(true);
    } finally {
      setIsConfirmingAutoAnswer(false);
    }
  };

  // Handle rejecting an auto-answer (go to manual flow)
  const handleRejectAutoAnswer = () => {
    setAutoAnswerModalOpen(false);
    setQuestionForAutoAnswer(null);
    setComputedAutoAnswer(null);
  };

  // Check all pending questions for auto-answers when they load
  useEffect(() => {
    if (!askedQuestionsData?.results) return;
    
    const pending = askedQuestionsData.results.filter(q => !q.answered);
    pending.forEach(question => {
      checkAndShowAutoAnswer(question);
    });
  }, [askedQuestionsData, checkAndShowAutoAnswer]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  const questions = askedQuestionsData?.results || [];
  const pendingQuestions = questions.filter((q) => !q.answered);
  const answeredQuestions = questions.filter((q) => q.answered);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      {/* Header */}
      <Header
        title="Answer Questions"
        icon={<MessageCircle className="w-5 h-5 mr-2 text-indigo-600" />}
        onBack={handleBack}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Pending Questions Section */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Pending Questions
          </h2>

          {pendingQuestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  All caught up! No questions to answer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingQuestions.map((question) => {
                // For UI badge, just check if it's a geo category (actual auto-answer computed async)
                const isAutoAnswerable = GEO_CATEGORIES.has(question.category.category_name);
                
                return (
                  <Card
                    key={question.question_id}
                    className="overflow-hidden hover:shadow-md transition-shadow relative"
                  >
                    {/* Auto-answerable indicator */}
                    {isAutoAnswerable && !question.answered && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Zap className="w-3 h-3 mr-1" />
                          Auto-answer
                        </span>
                      </div>
                    )}
                    
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-y-2 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {question.category.category_name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Auto: {isAutoAnswerable ? 'Yes' : 'No'}
                          </span>
                          {question.reward && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              <Gift className="w-3 h-3 mr-1" />
                              {question.reward.reward_name}
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-gray-400">
                          {formatDate(question.created)}
                        </span>
                      </div>

                      {/* Debug: Question metadata details */}
                      <details className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                          📋 Question Data
                        </summary>
                        <pre className="mt-2 text-gray-700 whitespace-pre-wrap text-left">
{JSON.stringify({
  category: question.category.category_name,
  question_meta: question.question_meta,
  fact_meta: question.fact_meta,
  answer_meta: question.answer_meta,
  answered: question.answered,
  accepted: question.accepted,
}, null, 2)}
                        </pre>
                      </details>

                    {/* Map Navigation Row */}
                    {question.question_meta?.location_points &&
                      question.question_meta.location_points.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 w-full overflow-x-auto pb-2">
                          <a
                            href={`/games/${gameId}/map?locations=${JSON.stringify(
                                question.question_meta.location_points.map(
                                  (p: LocationPoint) => [parseFloat(p.lon), parseFloat(p.lat)],
                                ),
                              )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-auto shrink-0"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                            >
                              <Map className="w-4 h-4 mr-2" />
                              View on Game Map
                            </Button>
                          </a>
                          {question.question_meta!.location_points!.length > 1 ? (
                            <div className="flex flex-auto shrink-0 gap-2">
                              {question.question_meta!.location_points!.map(
                                (point: LocationPoint, index: number) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenLocation(point.lat, point.lon)
                                    }
                                    className="flex-1 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2"
                                  >
                                    <MapPin className="w-3 h-3 mr-1" />
                                    Point {String.fromCharCode(65 + index)}
                                  </Button>
                                ),
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenLocation(
                                  question.question_meta!.location_points![0]
                                    .lat,
                                  question.question_meta!.location_points![0]
                                    .lon,
                                )
                              }
                              className="flex-auto shrink-0 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            >
                              <MapPin className="w-4 h-4 mr-2" />
                              Google Maps
                            </Button>
                          )}
                        </div>
                      )}

                    <h3 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed text-left">
                      {question.rendered_question}
                    </h3>

                    <div className="space-y-4">
                      <textarea
                        value={answerTexts[question.question_id] || ''}
                        onChange={(e) =>
                          handleTextChange(question.question_id, e.target.value)
                        }
                        placeholder="Add an optional comment..."
                        className={cn(
                          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
                        )}
                        disabled={
                          isAnswering && answeringId === question.question_id
                        }
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleAnswer(question, false)}
                          disabled={
                            isAnswering && answeringId === question.question_id
                          }
                          className="w-full py-6 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                          {isAnswering &&
                            answeringId === question.question_id ? (
                            <Loader className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 mr-2" />
                              No
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleAnswer(question, true)}
                          disabled={
                            isAnswering && answeringId === question.question_id
                          }
                          className="w-full py-6 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                          {isAnswering &&
                            answeringId === question.question_id ? (
                            <Loader className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Yes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );})}
            </div>
          )}
        </div>

        {/* History Section */}
        {answeredQuestions.length > 0 && (
          <div>
            <h2 className="flex items-center text-left text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 pt-6 border-t border-gray-200">
              <Clock className="w-4 h-4 mr-2" />
              History
            </h2>
            <div className="space-y-3">
              {answeredQuestions.map((q) => (
                <QuestionCard key={q.question_id} question={q} gameId={gameId} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auto-Answer Confirmation Modal */}
      <Modal
        isOpen={autoAnswerModalOpen}
        onClose={handleRejectAutoAnswer}
        title="Auto-Answer Available"
      >
        <div className="space-y-4">
          {questionForAutoAnswer && computedAutoAnswer && (
            <>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Question</p>
                <p className="text-gray-900">{questionForAutoAnswer.rendered_question}</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 text-blue-600 mr-2" />
                  <p className="text-sm font-medium text-blue-800">Computed Answer</p>
                </div>
                <p className="text-blue-900">
                  <strong>Result:</strong> {typeof computedAutoAnswer.result === 'boolean' 
                    ? (computedAutoAnswer.result ? 'Yes' : 'No') 
                    : String(computedAutoAnswer.result)}
                </p>
                {computedAutoAnswer.metadata.text && (
                  <p className="text-blue-900 text-sm mt-1">
                    <strong>Details:</strong> {computedAutoAnswer.metadata.text}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleRejectAutoAnswer}
                  disabled={isConfirmingAutoAnswer}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Answer Manually
                </Button>
                <Button
                  onClick={handleConfirmAutoAnswer}
                  disabled={isConfirmingAutoAnswer}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isConfirmingAutoAnswer ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm & Send
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
