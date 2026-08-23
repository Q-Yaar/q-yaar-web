import React from 'react';
import { BottomSheet } from './BottomSheet';
import { LayerControlPanel } from './LayerControlPanel';

interface LayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The zone-visibility list (city corporations + metro line regions),
 * opened from the top bar's zones icon instead of permanently occupying a
 * 280px floating card — there's no room for that on a phone-width map. */
export const LayersSheet: React.FC<LayersSheetProps> = ({ isOpen, onClose }) => (
  <BottomSheet isOpen={isOpen} title="Zones" leftAction={{ label: 'Close', onClick: onClose }}>
    <LayerControlPanel />
  </BottomSheet>
);
