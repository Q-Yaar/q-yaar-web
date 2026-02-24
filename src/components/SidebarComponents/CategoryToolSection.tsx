import React from 'react';
import { Label } from '../ui/label';

interface CategoryToolSectionProps {
  selectedCategory: string;
  selectedOption: string;
  handleCategoryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleOptionChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const CategoryToolSection: React.FC<CategoryToolSectionProps> = ({
  selectedCategory,
  selectedOption,
  handleCategoryChange,
  handleOptionChange
}) => {
  return (
    <>
      <section className="flex flex-col space-y-2 mt-4">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Category</Label>
        <select
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">Select Category</option>
          <option value="questions">Questions</option>
          <option value="facts">Facts</option>
        </select>
      </section>

      <section className="flex flex-col space-y-2 mt-4">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Tool</Label>
        <select
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedOption}
          onChange={handleOptionChange}
          disabled={!selectedCategory}
        >
          <option value="">Select Action</option>
          {selectedCategory === 'questions' && (
            <>
              <option value="distance">Distance Measurement</option>
              <option value="heading">Relative Heading</option>
              <option value="polygon-location">Polygon Location</option>
            </>
          )}
          {selectedCategory === 'facts' && (
            <>
              <option value="text">Text Fact</option>
              <option value="draw-circle">Draw Circle</option>
              <option value="split-by-direction">Split by Direction</option>
              <option value="hotter-colder">Hotter / Colder</option>
              <option value="areas">Area Operations</option>
              <option value="closer-to-line">Distance from Metro Line</option>
            </>
          )}
        </select>
      </section>
    </>
  );
};