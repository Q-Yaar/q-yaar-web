import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useFetchCategoriesQuery,
  useFetchQuestionTemplatesQuery,
  useFetchQuestionTemplateDetailsQuery,
  useAskQuestionMutation,
} from '../../apis/qnaApi';
import { useFetchTeamsQuery } from '../../apis/gameApi';
import { Category, QuestionTemplate } from '../../models/QnA';
import {
  Loader,
  Send,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';

export function AskQuestionModule() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  // This stores the shallow template from list
  const [selectedTemplateBasic, setSelectedTemplateBasic] =
    useState<QuestionTemplate | null>(null);

  const [selectedTargetTeamId, setSelectedTargetTeamId] = useState<string>('');
  const [placeholders, setPlaceholders] = useState<Record<string, any>>({});

  // Queries
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useFetchCategoriesQuery();
  const { data: templatesData, isLoading: isLoadingTemplates } =
    useFetchQuestionTemplatesQuery(
      { categoryId: selectedCategory?.category_id || '', gameId },
      { skip: !selectedCategory },
    );

  // Fetch detailed template when one is selected
  const { data: fullTemplate, isLoading: isLoadingTemplateDetails } =
    useFetchQuestionTemplateDetailsQuery(
      {
        categoryId: selectedCategory?.category_id || '',
        questionId: selectedTemplateBasic?.question_id || '',
      },
      { skip: !selectedCategory || !selectedTemplateBasic },
    );

  const { data: teams, isLoading: isLoadingTeams } = useFetchTeamsQuery(
    gameId || '',
    { skip: !gameId },
  );
  const [askQuestion, { isLoading: isAsking, error: askError }] =
    useAskQuestionMutation();

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedTemplateBasic(null);
    setPlaceholders({});
  };

  const handleTemplateSelect = (template: QuestionTemplate) => {
    setSelectedTemplateBasic(template);
    setPlaceholders({});
  };

  const handleSubmit = async () => {
    if (!gameId || !fullTemplate || !selectedTargetTeamId) return;

    try {
      await askQuestion({
        gameId,
        questionId: fullTemplate.question_id,
        body: {
          target_team_id: selectedTargetTeamId,
          chosen_placeholders: placeholders,
          question_meta: {
            myLocation: 'Unknown',
          },
        },
      }).unwrap();

      // Reset after success
      setSelectedCategory(null);
      setSelectedTemplateBasic(null);
      setSelectedTargetTeamId('');
      alert('Question asked successfully!');
    } catch (err) {
      console.error('Failed to ask question', err);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Use fullTemplate if available for rendering Step 3, otherwise fallback/loading
  const activeTemplate = fullTemplate || selectedTemplateBasic;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-top">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2 text-indigo-600" />
            Ask a Question
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Progress / Breadcrumbs */}
        {(selectedCategory || selectedTemplateBasic) && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedTemplateBasic(null);
              }}
              className="hover:text-indigo-600 font-medium transition-colors"
            >
              Categories
            </button>
            {selectedCategory && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <button
                  onClick={() => setSelectedTemplateBasic(null)}
                  className={`font-medium transition-colors ${!selectedTemplateBasic ? 'text-indigo-600 font-bold' : 'hover:text-indigo-600'}`}
                >
                  {selectedCategory.category_name}
                </button>
              </>
            )}
            {selectedTemplateBasic && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <span className="text-indigo-600 font-bold truncate max-w-[150px]">
                  Ask
                </span>
              </>
            )}
          </div>
        )}

        {/* Step 1: Category Selection */}
        {!selectedCategory && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 px-1">
              Choose a Category
            </h2>
            {isLoadingCategories ? (
              <div className="flex justify-center p-12">
                <Loader className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoriesData?.results.map((category) => (
                  <button
                    key={category.category_id}
                    onClick={() => handleCategorySelect(category)}
                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 active:scale-[0.98] transition-all hover:border-indigo-500 hover:shadow-md text-left flex flex-col justify-between h-32 group"
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {category.category_name}
                      </span>
                      <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg self-start">
                      Reward:{' '}
                      <span className="font-medium text-gray-700">
                        {category.reward.reward_name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Template Selection */}
        {selectedCategory && !selectedTemplateBasic && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 px-1">
              Select a Question
            </h2>
            {isLoadingTemplates ? (
              <div className="flex justify-center p-12">
                <Loader className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : (
              <div className="space-y-3">
                {templatesData?.results.map((template) => (
                  <button
                    key={template.question_id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full bg-white p-5 rounded-xl shadow-sm border border-gray-200 active:scale-[0.98] transition-all hover:border-indigo-500 hover:shadow-md text-left group"
                  >
                    <p className="text-gray-800 text-lg group-hover:text-indigo-700 transition-colors">
                      {template.template}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Ask Form */}
        {selectedCategory && selectedTemplateBasic && (
          <div className="space-y-6">
            {isLoadingTemplateDetails ? (
              <div className="flex justify-center p-12">
                <Loader className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : activeTemplate ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                {/* Question Preview */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Selected Question
                  </label>
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900 font-medium text-lg">
                    {activeTemplate.template}
                  </div>
                </div>

                {/* Target Team Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Team
                  </label>
                  {isLoadingTeams ? (
                    <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedTargetTeamId}
                        onChange={(e) =>
                          setSelectedTargetTeamId(e.target.value)
                        }
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="">Select a team...</option>
                        {teams?.map((team) => (
                          <option key={team.team_id} value={team.team_id}>
                            {team.team_name}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Placeholders */}
                {activeTemplate.placeholders &&
                  Object.keys(activeTemplate.placeholders).length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h3 className="font-medium text-gray-900">
                        Fill Missing Details
                      </h3>
                      {Object.keys(activeTemplate.placeholders).map((key) => {
                        const config = activeTemplate.placeholders![key];
                        return (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                              {key.replace(/_/g, ' ')}{' '}
                              {config.required && (
                                <span className="text-red-500">*</span>
                              )}
                            </label>
                            {config.allowed_values &&
                            config.allowed_values.length > 0 ? (
                              <div className="relative">
                                <select
                                  value={placeholders[key] || ''}
                                  onChange={(e) =>
                                    setPlaceholders((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                                >
                                  <option value="">Select...</option>
                                  {config.allowed_values.map((val) => (
                                    <option key={val} value={val}>
                                      {val}
                                    </option>
                                  ))}
                                </select>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={placeholders[key] || ''}
                                onChange={(e) =>
                                  setPlaceholders((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder={`Type here...`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Submit Button */}
                <div className="pt-4">
                  {askError && (
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm mb-4">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>Failed to send. Please try again.</span>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isAsking || !selectedTargetTeamId}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                  >
                    {isAsking ? (
                      <Loader className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send Question</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-red-500 text-center">
                Failed to load question details.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
