import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Category } from '../../models/QnA';

interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
  className?: string; // Allow overriding styles if needed
}

export function CategoryCard({
  category,
  onClick,
  className,
}: CategoryCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-[0.98] group ${className || ''}`}
      onClick={() => onClick(category)}
    >
      <CardContent className="p-5 flex flex-col justify-between h-32">
        <div className="flex justify-between items-start w-full">
          <span className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
            {category.category_name}
          </span>
          <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg self-start">
          Reward:{' '}
          <span className="font-medium text-gray-700">
            {category.reward.reward_name}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
