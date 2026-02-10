import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Label } from '../../components/ui/label';

interface AddFactCardProps {
  onAddFact: (e: React.FormEvent) => void;
  newFactText: string;
  setNewFactText: (text: string) => void;
  currentUserTeamId?: string;
  isCreating: boolean;
}

export function AddFactCard({
  onAddFact,
  newFactText,
  setNewFactText,
  currentUserTeamId,
  isCreating,
}: AddFactCardProps) {
  return (
    <Card className="border-indigo-100 shadow-md">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-white">
        <CardDescription className="text-left">
          Share a new event or discovery with the game history.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={onAddFact} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fact-text" className="sr-only">
              Fact Text
            </Label>
            <Input
              id="fact-text"
              placeholder={
                !currentUserTeamId
                  ? 'Loading team info...'
                  : "What happened? e.g. 'We found a secret door...'"
              }
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              className="min-h-[80px] text-lg py-3"
              disabled={!currentUserTeamId || isCreating}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              disabled={!currentUserTeamId || !newFactText.trim() || isCreating}
            >
              {isCreating ? 'Posting...' : 'Post Fact'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
