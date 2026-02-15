import React from 'react';
import { Fact } from '../../models/Fact';
import { formatDate } from '../../utils/dateUtils';

interface SavedFactsListProps {
  allFacts: Fact[];
  deleteFactMutation: ((factId: string) => Promise<any>) | null;
  refetchFacts: () => void;
}

export const SavedFactsList: React.FC<SavedFactsListProps> = ({
  allFacts,
  deleteFactMutation,
  refetchFacts
}) => {
  if (!allFacts || allFacts.length === 0) return null;

  const getFactDisplayName = (fact: Fact) => {
    if (fact.fact_type === 'GEO') {
      const opType = fact.fact_info.op_type;
      if (opType) {
        return opType.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
      }
      return 'Map Operation';
    }
    return 'Text Fact';
  };

  const getFactContent = (fact: Fact) => {
    if (fact.fact_type === 'GEO') {
      return renderOperationDetails(fact.fact_info.op_type || '', fact.fact_info.op_meta || {});
    }
    return fact.fact_info.op_meta?.text || 'No text content';
  };

  const getFactMetadata = (fact: Fact) => {
    const opMeta = fact.fact_info.op_meta || {};
    return {
      playerName: opMeta.player_name || 'Unknown',
      teamName: opMeta.team_name || 'Unknown Team',
      createdDate: formatDate(fact.created)
    };
  };

  const renderOperationDetails = (opType: string, opMeta: any) => {
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

  return (
    <div
      className="operations-container"
      style={{
        marginTop: '10px',
        borderTop: '2px solid #eee',
        paddingTop: '20px',
      }}
    >
      <h3>Saved Facts</h3>
      <ul className="operations-list" style={{ marginTop: '10px' }}>
        {allFacts.map((fact: Fact, index: number) => {
          const handleDeleteFact = async () => {
            if (!deleteFactMutation) return;
            
            if (window.confirm('Are you sure you want to delete this fact?')) {
              try {
                await deleteFactMutation(fact.fact_id);
                console.log('Fact deleted successfully');
                refetchFacts();
              } catch (error) {
                console.error('Failed to delete fact:', error);
                alert('Failed to delete fact. Please try again.');
              }
            }
          };
          
          const { playerName, teamName, createdDate } = getFactMetadata(fact);

          return (
            <li key={fact.fact_id} className="operation-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <strong>{index + 1}. {getFactDisplayName(fact)}</strong>
                  <div className="help-text" style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#333' }}>
                    {getFactContent(fact)}
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
                  onClick={handleDeleteFact}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};