import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useFetchAskedQuestionsQuery,
  useAnswerQuestionMutation,
} from '../../apis/qnaApi';
import { AskedQuestion } from '../../models/QnA';
import {
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

export function AnswerQuestionModule() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { data: askedQuestionsData, isLoading } = useFetchAskedQuestionsQuery(
    { gameId: gameId || '' },
    { skip: !gameId, pollingInterval: 30000 },
  );

  const [answerQuestion, { isLoading: isAnswering }] =
    useAnswerQuestionMutation();
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  const handleAnswer = async (question: AskedQuestion, result: string) => {
    if (!gameId) return;
    setAnsweringId(question.question_id);

    try {
      await answerQuestion({
        gameId,
        askedQuestionId: question.question_id,
        body: {
          answer_meta: {
            answered: true,
            result: result,
          },
        },
      }).unwrap();
    } catch (err) {
      console.error('Failed to answer', err);
      alert('Failed to submit answer.');
    } finally {
      setAnsweringId(null);
    }
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
  const pendingQuestions = questions.filter((q) => !q.answer_meta?.answered);
  const answeredQuestions = questions.filter((q) => q.answer_meta?.answered);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-top">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-indigo-600" />
            Answer Questions
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Pending Questions Section */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Pending Questions
          </h2>

          {pendingQuestions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-dashed border-gray-300">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">
                All caught up! No questions to answer.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQuestions.map((question) => (
                <div
                  key={question.question_id}
                  className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {question.category.category_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(question.created).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
                    {question.rendered_question}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAnswer(question, 'HIT')}
                      disabled={isAnswering}
                      className="py-3 px-4 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-xl font-bold transition-all active:scale-[0.98] flex justify-center items-center"
                    >
                      {isAnswering && answeringId === question.question_id ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          HIT
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAnswer(question, 'MISS')}
                      disabled={isAnswering}
                      className="py-3 px-4 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all active:scale-[0.98] flex justify-center items-center"
                    >
                      {isAnswering && answeringId === question.question_id ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 mr-2" />
                          MISS
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Section */}
        {answeredQuestions.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 pt-6 border-t border-gray-200">
              History
            </h2>
            <div className="space-y-3">
              {answeredQuestions.map((question) => (
                <div
                  key={question.question_id}
                  className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-gray-900 font-medium truncate">
                      {question.rendered_question}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                        {question.category.category_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(question.modified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {question.answer_meta?.result === 'HIT' ? (
                      <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> HIT
                      </span>
                    ) : (
                      <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3 mr-1" /> MISS
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
