import React from 'react';

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
      <section className="tool-section">
        <label>Category</label>
        <select value={selectedCategory} onChange={handleCategoryChange}>
          <option value="">Select Category</option>
          <option value="questions">Questions</option>
          <option value="facts">Facts</option>
        </select>
      </section>

      <section className="tool-section">
        <label>Tool</label>
        <select
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