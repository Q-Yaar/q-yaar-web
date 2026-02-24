import React, { useState } from 'react';
import { Operation } from '../../utils/geoTypes';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface OperationCardProps {
  op: Operation;
  index: number;
  onSave: () => void | Promise<void>;
  onRemove: () => void;
}

export const OperationCard: React.FC<OperationCardProps> = ({ op, index, onSave, onRemove }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const getOperationDisplayName = (type: Operation['type']) => {
    switch (type) {
      case 'areas':
        return 'Area Operations';
      case 'closer-to-line':
        return 'Distance from Metro Line';
      default:
        return type.replace(/-/g, ' ');
    }
  };

  const getOperationHelpText = () => {
    switch (op.type) {
      case 'draw-circle':
        return `${op.radius}km · Hider ${op.hiderLocation}`;
      case 'split-by-direction':
        return `Hider is ${op.splitDirection}`;
      case 'hotter-colder':
        return `Closer to ${op.preferredPoint}`;
      case 'areas':
        return `${op.areaOpType}${op.featureName ? ` (${op.featureName})` : op.selectedLineIndex !== undefined ? ` (Area ${op.selectedLineIndex + 1})` : ''}`;
      case 'closer-to-line':
        return `${op.closerFurther} than Seeker ${op.featureName ? ` (${op.featureName})` : op.selectedLineIndex !== undefined ? `(Line ${op.selectedLineIndex + 1})` : ''}`;
      case 'polygon-location':
        return `In polygon`;
      default:
        return '';
    }
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden relative mb-3">
      {/* Decorative left border for draft */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl"></div>
      <CardContent className="p-4 pl-5 flex flex-col items-start text-left">
        <div className="font-semibold text-sm mb-1.5 text-gray-800 tracking-tight">
          {index + 1}. {getOperationDisplayName(op.type)} <span className="text-amber-600 text-xs ml-1 font-medium">(Draft)</span>
        </div>
        <div className="text-sm text-gray-600 mb-3 leading-relaxed">
          {getOperationHelpText()}
        </div>
        <div className="flex gap-2 w-full mt-1">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : null}
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={isSaving}
            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};