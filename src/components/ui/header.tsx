import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../utils/utils';

interface HeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  onBack?: () => void;
  action?: React.ReactNode;
  className?: string;
  showBack?: boolean;
}

export function Header({
  title,
  icon,
  onBack,
  action,
  className,
  showBack = true,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={cn(
        'bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 safe-top',
        className,
      )}
    >
      <div className="max-w-13xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="-ml-2 text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 min-w-0">
            {icon && (
              <span className="flex-shrink-0 flex items-center justify-center">
                {icon}
              </span>
            )}
            <span className="truncate">{title}</span>
          </h1>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
