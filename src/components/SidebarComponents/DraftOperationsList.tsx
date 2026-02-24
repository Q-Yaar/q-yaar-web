import React from 'react';
import { OperationCard } from './OperationCard';
import { Operation } from '../../utils/geoTypes';
import { Team } from '../../models/Team';

interface DraftOperationsListProps {
  operations: Operation[];
  serverOperations: any[];
  teamsData: Team[];
  selectedTeamFilter: string;
  currentUserEmail: string;
  gameId: string;
  createFactMutation: ((arg: any) => Promise<any>) | null;
  refetchFacts: () => void;
  removeOperation: (id: string) => void;
}

export const DraftOperationsList: React.FC<DraftOperationsListProps> = ({
  operations,
  serverOperations,
  teamsData,
  selectedTeamFilter,
  currentUserEmail,
  gameId,
  createFactMutation,
  refetchFacts,
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
      <ul className="operations-list">
        {draftOperations.map((op, index) => (
          <OperationCard
            key={op.id}
            op={op}
            index={index}
            onSave={async () => {
              if (!createFactMutation || !gameId) return;
              
              try {
                // Use the selected team from the dropdown as the target team
                if (teamsData.length === 0) {
                  alert('No teams available. Please try again later.');
                  return;
                }
                
                // Check if a team is selected
                if (!selectedTeamFilter) {
                  alert('Please select a team from the dropdown.');
                  return;
                }
                
                // Find the selected team (target team)
                const targetTeam = teamsData.find(team => team.team_id === selectedTeamFilter);
                
                if (!targetTeam) {
                  alert('Selected team not found. Please try again.');
                  return;
                }
                
                // Find the current user's team for op_meta
                const currentUserTeam = teamsData.find(team => 
                  team.players.some((player: any) => player.user_profile.email === currentUserEmail)
                );
                
                if (!currentUserTeam) {
                  alert('Could not determine your team. Please try again.');
                  return;
                }
                
                const targetTeamId = targetTeam.team_id;
                const currentUserTeamId = currentUserTeam.team_id;
                const currentUserTeamName = currentUserTeam.team_name;
                
                // Convert operation to fact info for GEO facts
                const { convertOperationToFactInfo } = require('../../utils/factUtils');
                const factInfo = convertOperationToFactInfo(op);
                
                // Add feature name to op_meta if available
                const enhancedFactInfo = { ...factInfo };
                
                // For operations with feature names, add them to the fact
                if (op.featureName) {
                  enhancedFactInfo.featureName = op.featureName;
                }
                
                // Create GEO fact
                await createFactMutation({
                  game_id: gameId,
                  fact_type: 'GEO',
                  team_id: targetTeamId,
                  fact_info: {
                    op_type: op.type,
                    op_meta: {
                      ...enhancedFactInfo,
                      team_id: currentUserTeamId,
                      team_name: currentUserTeamName,
                      player_name: currentUserEmail
                    }
                  }
                });
                
                // Remove the draft from local operations since it's now saved
                removeOperation(op.id);
                
                // Refetch facts to update the list
                refetchFacts();
                console.log('Fact saved successfully, refetching facts...');
                alert('Fact saved successfully!');
              } catch (error) {
                console.error('Failed to save fact:', error);
                alert('Failed to save fact. Please try again.');
              }
            }}
            onRemove={() => removeOperation(op.id)}
          />
        ))}
      </ul>
    </div>
  );
};