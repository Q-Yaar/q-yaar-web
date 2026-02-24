import React from 'react';
import { Operation } from '../../utils/geoTypes';

interface OperationCardProps {
  op: Operation;
  index: number;
  onSave: () => void;
  onRemove: () => void;
}

export const OperationCard: React.FC<OperationCardProps> = ({ op, index, onSave, onRemove }) => {
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
    <li className="operation-card">
      <strong>
        {index + 1}. {getOperationDisplayName(op.type)} (Draft)
      </strong>
      <div className="help-text">{getOperationHelpText()}</div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          className="save-draft-btn"
          onClick={onSave}
        >
          Save
        </button>
        <button
          className="remove-op"
          onClick={onRemove}
          style={{ position: 'relative', right: 'auto', top: 'auto' }}
        >
          ×
        </button>
      </div>
    </li>
  );
};