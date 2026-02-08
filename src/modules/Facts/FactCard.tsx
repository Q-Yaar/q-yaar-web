import React from 'react';
import { Calendar, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '../../components/ui/card';
import { Fact } from '../../models/Fact';
import { TeamAvatar } from 'components/TeamAvatar';

interface FactCardProps {
  fact: Fact;
  currentUserId?: string;
  editingFactId: string | null;
  editFactText: string;
  isUpdating: boolean;
  isDeleting: boolean;
  onEdit: (fact: Fact) => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: (factId: string) => void;
  setEditFactText: (text: string) => void;
}

export function FactCard({
  fact,
  currentUserId,
  editingFactId,
  editFactText,
  isUpdating,
  isDeleting,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  setEditFactText,
}: FactCardProps) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative flex items-start gap-6 group">
      {/* Timeline Icon/Dot with Time */}
      <div className="flex flex-col items-center z-10">
        <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-slate-100 shadow-md shrink-0 text-center">
          <span
            className={`text-xs font-bold leading-none ${fact.fact_info.teamColor?.split(' ')[2] || 'text-gray-600'}`}
          >
            {new Date(fact.created)
              .toLocaleTimeString(undefined, {
                hour: 'numeric',
                hour12: true,
              })
              .replace(' ', '')}
          </span>
        </div>
      </div>

      {/* Card */}
      <Card
        className={`flex-1 p-0 border-l-4 shadow-sm hover:shadow-md transition-shadow ${fact.fact_info.teamColor?.replace('bg-', 'border-l-').split(' ')[0] || 'border-l-gray-300'}`}
      >
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-gray-50/50 rounded-t-lg">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TeamAvatar
                teamName={fact.fact_info.op_meta.team_name || 'Select Team'}
                teamColor={fact.fact_info.op_meta.team_color || 'gray'}
                className="w-4 h-4 inline-block"
              />
              <span
                className={`text-left text-xs font-bold uppercase tracking-wider ${fact.fact_info.teamColor?.split(' ')[2] || 'text-gray-600'}`}
              >
                {fact.fact_info.op_meta.team_name || 'Unknown Team'}
              </span>
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(fact.created)}
            </span>
          </div>
          {fact.fact_info.op_meta.player_id === currentUserId && (
            <div className="flex gap-1">
              {editingFactId === fact.fact_id ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-50"
                    onClick={onUpdate}
                    disabled={isUpdating}
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    onClick={onCancelEdit}
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => onEdit(fact)}
                    title="Edit fact"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onDelete(fact.fact_id)}
                    disabled={isDeleting}
                    title="Delete fact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="py-4 px-4">
          {editingFactId === fact.fact_id ? (
            <Input
              value={editFactText}
              onChange={(e) => setEditFactText(e.target.value)}
              className="w-full"
              autoFocus
            />
          ) : (
            <p className="text-gray-800 text-base leading-relaxed text-left">
              {fact.fact_info.op_meta.text}
            </p>
          )}
        </CardContent>
        <CardFooter className="py-2 px-4 bg-gray-50/30 border-t flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {fact.fact_info.op_meta.player_name?.charAt(0) || '?'}
            </div>
            <span className="text-xs font-medium text-gray-600">
              {fact.fact_info.op_meta.player_name || 'Unknown Player'}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
