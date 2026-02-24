import React from 'react';
import { OperationCard } from './OperationCard';
import { Operation } from '../../utils/geoTypes';

interface DraftOperationsListProps {
  operations: Operation[];
  serverOperations: any[];
  onSaveOperation: (op: Operation) => void;
  removeOperation: (id: string) => void;
}

export const DraftOperationsList: React.FC<DraftOperationsListProps> = ({
  operations,
  serverOperations,
  onSaveOperation,
  removeOperation
}) => {
  const draftOperations = operations.filter(op => !serverOperations.some(serverOp => serverOp.id === op.id));

  if (draftOperations.length === 0) return null;

  return (
    <div
      className="operations-container"
      style={{
        marginTop: '20px',
        borderTop: '1px solid #eee',
        paddingTop: '15px',
      }}
    >
      <h3>Draft Operations</h3>
      <ul className="flex flex-col space-y-0">
        {draftOperations.map((op, index) => (
          <OperationCard
            key={op.id}
            op={op}
            index={index}
            onSave={() => onSaveOperation(op)}
            onRemove={() => removeOperation(op.id)}
          />
        ))}
      </ul>
    </div>
  );
};