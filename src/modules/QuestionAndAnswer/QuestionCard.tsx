import { AskedQuestion } from '../../models/QnA';
import { Card, CardContent } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { formatDate } from 'utils/dateUtils';
import { Gift, Map } from 'lucide-react';

interface QuestionCardProps {
  question: AskedQuestion;
  onAccept?: (question: AskedQuestion) => void;
  isAccepting?: boolean;
  acceptingId?: string | null;
}

export function QuestionCard({
  question,
  onAccept,
  isAccepting = false,
  acceptingId = null,
}: QuestionCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        {/* Status Badge */}
        {question.accepted ? (
          <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            ACCEPTED
          </div>
        ) : question.answered ? (
          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            ANSWERED
          </div>
        ) : (
          <div className="absolute top-0 right-0 bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            PENDING
          </div>
        )}

        <div className="pr-16">
          <p className="font-semibold text-gray-900 text-lg mb-1 text-left">
            {question.rendered_question}
          </p>
          <div className="flex items-center text-xs text-gray-500 space-x-2">
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              {question.category.category_name}
            </span>
            {question.reward && (
              <span
                className={`flex items-center px-2 py-0.5 rounded font-medium ${
                  question.accepted
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Gift className="w-3 h-3 mr-1" />
                {question.reward.reward_name}
              </span>
            )}
            <span>{formatDate(question.created)}</span>
            {question.question_meta?.location_points &&
              question.question_meta.location_points.length > 0 && (
                <a
                  href={`/games/${question.category.reward.created}/map?locations=${JSON.stringify(
                    question.question_meta.location_points.map((p) => [
                      parseFloat(p.lon),
                      parseFloat(p.lat),
                    ]),
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
                  title="View Locations on Map"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click if any
                  }}
                >
                  <Map className="w-3.5 h-3.5 ml-2" />
                </a>
              )}
          </div>
        </div>

        {/* Action / Result */}
        {question.answered && (
          <>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Answer:</span>
                {question?.answer_meta?.result ? (
                  <span className="flex items-center font-bold text-green-600">
                    Yes
                  </span>
                ) : (
                  <span className="flex items-center font-bold text-red-600">
                    No
                  </span>
                )}
              </div>

              {!question.accepted && onAccept && (
                <Button
                  onClick={() => onAccept(question)}
                  disabled={isAccepting}
                  variant="outline"
                  size="sm"
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {isAccepting && acceptingId === question.question_id
                    ? 'Accepting...'
                    : 'Accept Answer'}
                </Button>
              )}
            </div>
            {question?.answer_meta?.metadata?.text && (
              <p className="text-sm text-gray-600 text-left border-l-2 border-indigo-500 pl-2 mt-2">
                {question?.answer_meta?.metadata?.text}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
