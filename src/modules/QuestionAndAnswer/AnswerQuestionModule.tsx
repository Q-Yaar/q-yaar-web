import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useFetchAskedQuestionsQuery,
  useAnswerQuestionMutation,
} from '../../apis/qnaApi';
import { useFetchMyTeamQuery } from '../../apis/gameApi';
import { AskedQuestion } from '../../models/QnA';
import {
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  MessageCircle,
  Map,
  MapPin,
  Gift,
} from 'lucide-react';

import { QuestionCard } from './QuestionCard';

import { Header } from '../../components/ui/header';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { cn } from 'utils/utils';

export function AnswerQuestionModule() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const { data: myTeam } = useFetchMyTeamQuery(gameId || '', {
    skip: !gameId,
  });

  const { data: askedQuestionsData, isLoading } = useFetchAskedQuestionsQuery(
    { gameId: gameId || '', targetTeamId: myTeam?.team_id || '' },
    { skip: !gameId || !myTeam, pollingInterval: 30000 },
  );

  const [answerQuestion, { isLoading: isAnswering }] =
    useAnswerQuestionMutation();
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

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
              {pendingQuestions.map((question) => (
                <Card
                  key={question.question_id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-y-2 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {question.category.category_name}
                        </span>
                        {question.reward && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <Gift className="w-3 h-3 mr-1" />
                            {question.reward.reward_name}
                          </span>
                        )}
                        {question.question_meta?.location_points &&
                          question.question_meta.location_points.length > 0 && (
                            <>
                              <a
                                href={`/games/${question.category.reward.created
                                  }/map?locations=${JSON.stringify(
                                    question.question_meta.location_points.map(
                                      (p) => [parseFloat(p.lon), parseFloat(p.lat)],
                                    ),
                                  )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 text-gray-400 hover:text-indigo-600 h-6 px-2"
                                title="View Locations on Map"
                              >
                                <Map className="w-3 h-3 mr-1" />
                                <span className="text-xs">Map</span>
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleOpenLocation(
                                    question.question_meta!.location_points![0]
                                      .lat,
                                    question.question_meta!.location_points![0]
                                      .lon,
                                  )
                                }
                                className="text-gray-400 hover:text-indigo-600 h-6 px-2"
                                title="View on Google Maps"
                              >
                                <MapPin className="w-3 h-3 mr-1" />
                                <span className="text-xs">Google Maps</span>
                              </Button>
                            </>
                          )}
                      </div>

                      <span className="text-xs text-gray-400">
                        {new Date(question.created).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

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
              ))}
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
                <QuestionCard key={q.question_id} question={q} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
