import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DieConfig } from './types';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/utils';

interface CustomizeDiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  diceConfigs: DieConfig[];
  onSave: (configs: DieConfig[]) => void;
}

export function CustomizeDiceModal({
  isOpen,
  onClose,
  diceConfigs,
  onSave,
}: CustomizeDiceModalProps) {
  const [selectedConfigIndex, setSelectedConfigIndex] = useState<number>(0);
  const [editMax, setEditMax] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && diceConfigs.length > 0) {
      setSelectedConfigIndex(0);
      setEditMax(diceConfigs[0].max.toString());
      setIsDropdownOpen(false);
    }
  }, [isOpen]); // Intentionally omitting diceConfigs

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleColorSelect = (index: number) => {
    setSelectedConfigIndex(index);
    setEditMax(diceConfigs[index].max.toString());
    setIsDropdownOpen(false);
  };

  const saveDieConfig = () => {
    const max = parseInt(editMax);
    if (isNaN(max) || max < 2) {
      alert('Please enter a valid max value (2 or greater)');
      return;
    }

    const updatedConfigs = [...diceConfigs];
    const currentConfig = updatedConfigs[selectedConfigIndex];

    updatedConfigs[selectedConfigIndex] = {
      ...currentConfig,
      max: max,
      type: `d${max}`,
      label: `D${max}`,
    };

    onSave(updatedConfigs);
    onClose();
  };

  const selectedDie = diceConfigs[selectedConfigIndex];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Dice"
      className="max-h-[85vh] overflow-visible" // Allow dropdown to overflow if needed, though usually inside modal body is fine
    >
      <div className="space-y-6">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Die to Edit
          </label>

          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm',
                  selectedDie?.color,
                )}
              >
                {selectedDie?.label}
              </div>
              <span className="font-medium text-gray-900">
                {selectedDie?.label}
              </span>
              <span className="text-gray-400 text-xs">
                (Current Max: {selectedDie?.max})
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                isDropdownOpen && 'transform rotate-180',
              )}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-100 max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-100">
              {diceConfigs.map((die, index) => (
                <button
                  key={die.id}
                  type="button"
                  onClick={() => handleColorSelect(index)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
                    selectedConfigIndex === index && 'bg-indigo-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm',
                        die.color,
                      )}
                    >
                      {die.label}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {die.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        Current Max: {die.max}
                      </div>
                    </div>
                  </div>
                  {selectedConfigIndex === index && (
                    <Check className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Value for {selectedDie?.label}
          </label>
          <Input
            type="number"
            value={editMax}
            onChange={(e) => setEditMax(e.target.value)}
            placeholder="e.g. 20"
            min={2}
          />
          <p className="text-xs text-gray-500 mt-1">
            This die will roll a number between 1 and {editMax || '...'}.
          </p>
        </div>

        <div className="pt-2 flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveDieConfig}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}
