import React, { memo } from 'react';
import { Fact } from '../../models/Fact';
import { formatDate } from '../../utils/dateUtils';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface SavedFactsListProps {
  allFacts: Fact[];
  deletingId: string | null;
  onDeleteFact: (fact: Fact) => void;
  isLoadingFacts?: boolean;
}

export const SavedFactsList: React.FC<SavedFactsListProps> = ({
  allFacts,
  deletingId,
  onDeleteFact,
  isLoadingFacts = false
}) => {
  if (isLoadingFacts) {
    return (
      <div className="mt-4 border-t border-gray-100 pt-5 text-left">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Facts</h3>
        <ul className="flex flex-col space-y-3">
          {[1, 2].map((i) => (
            <Card key={`loading-fact-${i}`} className="w-full shadow-sm border border-gray-100 rounded-xl overflow-hidden relative opacity-60">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 rounded-l-xl"></div>
              <CardContent className="p-4 pl-5 flex justify-between items-start text-left">
                <div className="flex-1 pr-4 w-full">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
                  <div className="h-10 bg-gray-100 rounded w-full mb-3 animate-pulse"></div>
                  <div className="flex gap-2">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </ul>
      </div>
    );
  }

  if (!allFacts || allFacts.length === 0) return null;

  const getFactMetadata = (fact: Fact) => {
    let playerName = 'System';
    let teamName = '';
    let createdDate = fact.created ? formatDate(fact.created) : 'Unknown Date';

    if (fact.fact_info?.op_meta?.player_name) {
      playerName = fact.fact_info.op_meta.player_name;
    } else if (fact.fact_info?.player_email) {
      playerName = fact.fact_info.player_email;
    }

    if (fact.fact_info?.op_meta?.team_name) {
      teamName = fact.fact_info.op_meta.team_name;
    }

    return { playerName, teamName, createdDate };
  };

  const getFactDisplayName = (fact: Fact) => {
    if (fact.fact_type === 'TEXT') return 'Text Fact';
    if (fact.fact_type === 'GEO' && fact.fact_info?.op_type) {
      const opType = fact.fact_info.op_type;
      if (opType === 'areas') return 'Area Operation';
      if (opType === 'closer-to-line') return 'Distance from Line';
      return opType.replace(/-/g, ' ');
    }
    return fact.fact_type || 'Unknown Fact';
  };

  const { playerName, teamName, createdDate } = getFactMetadata();

  return (
    <li key={fact.fact_id} className="operation-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <strong>{index + 1}. {getFactDisplayName()}</strong>
          <div className="help-text" style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#333' }}>
            {getFactContent()}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
            {playerName} - {teamName}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#999', marginTop: '2px' }}>
            {createdDate}
          </div>
        </div>
        <button
          className="delete-fact-btn"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </li>
  );
});

// Memoize the entire list component to prevent re-renders when props don't change
export const SavedFactsList: React.FC<SavedFactsListProps> = memo(({
  allFacts,
  deleteFactMutation,
  refetchFacts
}) => {
  if (!allFacts || allFacts.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-5 text-left">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Facts</h3>
      <ul className="flex flex-col space-y-3">
        {allFacts.map((fact: Fact, index: number) => {
          const { playerName, teamName, createdDate } = getFactMetadata(fact);

          return (
            <Card key={fact.fact_id} className="w-full shadow-sm hover:shadow-md transition-shadow border border-gray-100 rounded-xl overflow-hidden relative">
              {/* Decorative left border */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>
              <CardContent className="p-4 pl-5 flex justify-between items-start text-left">
                <div className="flex-1 pr-4">
                  <div className="font-semibold text-sm mb-1.5 text-gray-800 tracking-tight">
                    {index + 1}. {getFactDisplayName(fact)}
                  </div>
                  <div className="text-sm text-gray-600 mb-3 leading-relaxed bg-gray-50/80 p-2.5 rounded-lg border border-gray-100 inline-block w-full">
                    {getFactContent(fact)}
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                      {playerName}
                    </span>
                    {teamName && (
                      <span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-gray-200">
                        {teamName}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {createdDate}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteFact(fact)}
                  disabled={deletingId === fact.fact_id}
                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-1 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Delete Fact"
                >
                  {deletingId === fact.fact_id ? (
                    <svg className="w-4 h-4 animate-spin text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </ul>
    </div>
  );
};

export const renderOperationDetails = (opType: string, opMeta: any) => {
  switch (opType) {
    case 'plain_text':
      return opMeta.text || 'No text content';
    case 'draw-circle':
      return `${opMeta.radius}km · Hider ${opMeta.hiderLocation}`;
    case 'split-by-direction':
      return `Hider is ${opMeta.splitDirection}`;
    case 'hotter-colder':
      return `Closer to ${opMeta.preferredPoint}`;
    case 'areas':
      if (opMeta.featureName) {
        return `${opMeta.areaOpType} (${opMeta.featureName})`;
      }
      return `${opMeta.areaOpType}${opMeta.selectedLineIndex !== undefined ? ` (Area ${opMeta.selectedLineIndex + 1})` : ''}`;
    case 'closer-to-line':
      if (opMeta.featureName) {
        return `${opMeta.closerFurther} than Seeker (${opMeta.featureName})`;
      }
      return `${opMeta.closerFurther} than Seeker ${opMeta.selectedLineIndex !== undefined ? `(Line ${opMeta.selectedLineIndex + 1})` : ''}`;
    case 'polygon-location':
      return `In polygon`;
    default:
      return opType.replace(/-/g, ' ');
  }
};

export const getFactContent = (fact: Fact) => {
  if (fact.fact_type === 'TEXT') {
    return fact.fact_info?.op_meta?.text || 'No text content';
  } else if (fact.fact_type === 'GEO' && fact.fact_info?.op_type && fact.fact_info?.op_meta) {
    return renderOperationDetails(fact.fact_info.op_type, fact.fact_info.op_meta);
  }
  return 'No details available';
};
