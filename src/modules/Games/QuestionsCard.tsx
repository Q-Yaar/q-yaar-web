import { Gift, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { useFetchCategoriesQuery } from '../../apis/qnaApi';

/**
 * Every question category available to ask from — informational only (no
 * ask/answer flow lives on this page anymore, that moved into the map).
 * Categories aren't game-scoped in the API (fetchCategories takes no
 * gameId), so this is the same global list regardless of which game it's
 * viewed from.
 */
export function QuestionsCard() {
  const { data, isLoading } = useFetchCategoriesQuery();
  const categories = [...(data?.results ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-500" /> Question Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-9 bg-gray-100 rounded-xl" />
            <div className="h-9 bg-gray-100 rounded-xl" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No question categories available.</p>
        ) : (
          categories.map((category) => (
            <div
              key={category.category_id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100"
            >
              <span className="text-xs font-bold text-gray-800 truncate">{category.category_name}</span>
              {category.reward && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shrink-0">
                  <Gift className="w-3 h-3" /> {category.reward.reward_name}
                </span>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
