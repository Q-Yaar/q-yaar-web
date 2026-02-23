import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';
import { QuestionCard } from './QuestionCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useFetchCategoriesQuery,
  useFetchQuestionTemplatesQuery,
  useFetchQuestionTemplateDetailsQuery,
  useAskQuestionMutation,
  useFetchAskedQuestionsQuery,
  useAcceptAnswerMutation,
  useUpdateAskedQuestionMutation,
} from '../../apis/qnaApi';
import { useFetchTeamsQuery, useFetchMyTeamQuery } from '../../apis/gameApi';
import { Category, QuestionTemplate, AskedQuestion } from '../../models/QnA';
import {
  Loader,
  Send,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Clock,
  LayoutGrid,
} from 'lucide-react';

import { Header } from '../../components/ui/header';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from 'components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'components/ui/form';

export function AskQuestionModule() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  // This stores the shallow template from list
  const [selectedTemplateBasic, setSelectedTemplateBasic] =
    useState<QuestionTemplate | null>(null);

  const [locationErrorOpen, setLocationErrorOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [isAskingForLocation, setIsAskingForLocation] = useState(false);

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

  const { data: myTeam } = useFetchMyTeamQuery(gameId || '', {
    skip: !gameId,
  });

  const availableTeams = useMemo(() => {
    if (!teams || !myTeam) return [];
    return teams.filter((t) => t.team_id !== myTeam.team_id);
  }, [teams, myTeam]);

  const [selectedHistoryTeamId, setSelectedHistoryTeamId] =
    useState<string>('');

  useEffect(() => {
    if (availableTeams.length > 0 && !selectedHistoryTeamId) {
      setSelectedHistoryTeamId(availableTeams[0].team_id);
    }
  }, [availableTeams, selectedHistoryTeamId]);

  // Fetch asked questions for history
  const { data: askedQuestionsData, isLoading: isLoadingHistory } =
    useFetchAskedQuestionsQuery(
      { gameId: gameId || '', targetTeamId: selectedHistoryTeamId },
      { skip: !gameId || !selectedHistoryTeamId, pollingInterval: 15000 },
    );

  const [askQuestion, { isLoading: isAsking, error: askError }] =
    useAskQuestionMutation();

  const [acceptAnswer, { isLoading: isAccepting }] = useAcceptAnswerMutation();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [updateAskedQuestion, { isLoading: isUpdatingLocation }] =
    useUpdateAskedQuestionMutation();
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(
    null,
  );

  const handleAddLocation = (question: AskedQuestion) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setUpdatingLocationId(question.question_id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newPoint = {
          lat: latitude.toString(),
          lon: longitude.toString(),
        };

        const currentPoints = question.question_meta?.location_points || [];
        const updatedPoints = [...currentPoints, newPoint];

        try {
          await updateAskedQuestion({
            gameId: gameId || '',
            askedQuestionId: question.question_id,
            body: {
              question_meta: {
                location_points: updatedPoints,
              },
            },
          }).unwrap();
        } catch (err) {
          console.error('Failed to update location', err);
          alert('Failed to update location.');
        } finally {
          setUpdatingLocationId(null);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setUpdatingLocationId(null);
        alert(
          'Failed to get location. Please ensure location services are enabled.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  // Form handling
  // Form handling
  const formSchema = useMemo(() => {
    return z
      .object({
        target_team_id: z.string().min(1, 'Please select a target team'),
        placeholders: z.record(z.string(), z.string()),
      })
      .superRefine((data, ctx) => {
        if (fullTemplate?.placeholders) {
          Object.entries(fullTemplate.placeholders).forEach(([key, config]) => {
            const value = data.placeholders[key];
            if (
              config.required &&
              (!value || (typeof value === 'string' && value.trim() === ''))
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'This field is required',
                path: ['placeholders', key],
              });
            }
          });
        }
      });
  }, [fullTemplate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      target_team_id: '',
      placeholders: {},
    },
  });

  // Reset form when template changes
  useEffect(() => {
    if (fullTemplate) {
      form.reset({
        target_team_id: '',
        placeholders: {},
      });
    }
  }, [fullTemplate, form]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedTemplateBasic(null);
  };

  const handleTemplateSelect = (template: QuestionTemplate) => {
    setSelectedTemplateBasic(template);
  };

  const sendQuestion = async (payload: any) => {
    if (!gameId || !fullTemplate) return;
    try {
      await askQuestion({
        gameId,
        questionId: fullTemplate.question_id,
        body: payload,
      }).unwrap();

      // Reset after success
      setSelectedCategory(null);
      setSelectedTemplateBasic(null);
      setLocationErrorOpen(false);
      setPendingPayload(null);
      alert('Question asked successfully!');
    } catch (err) {
      console.error('Failed to ask question', err);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!gameId || !fullTemplate) return;

    setIsAskingForLocation(true);

    const basePayload = {
      target_team_id: values.target_team_id,
      chosen_placeholders: values.placeholders,
      question_meta: {
        location_points: [],
      },
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload = {
            ...basePayload,
            question_meta: {
              ...basePayload.question_meta,
              location_points: [
                {
                  lat: position.coords.latitude.toString(),
                  lon: position.coords.longitude.toString(),
                },
              ],
            },
          };
          setIsAskingForLocation(false);
          sendQuestion(payload);
        },
        (error) => {
          console.error('Error getting location', error);
          setPendingPayload(basePayload);
          setIsAskingForLocation(false);
          setLocationErrorOpen(true);
        },
      );
    } else {
      console.warn('Geolocation not available');
      setPendingPayload(basePayload);
      setIsAskingForLocation(false);
      setLocationErrorOpen(true);
    }
  };

  const handleLocationErrorProceed = () => {
    if (pendingPayload) {
      sendQuestion(pendingPayload);
    }
  };

  const handleLocationErrorCancel = () => {
    setLocationErrorOpen(false);
    setPendingPayload(null);
  };

  const handleAccept = async (question: AskedQuestion) => {
    if (!gameId) return;
    setAcceptingId(question.question_id);
    try {
      await acceptAnswer({
        gameId,
        askedQuestionId: question.question_id,
      }).unwrap();
    } catch (err) {
      console.error('Failed to accept answer', err);
      alert('Failed to accept answer.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Use fullTemplate if available for rendering Step 3, otherwise fallback/loading
  const activeTemplate = fullTemplate || selectedTemplateBasic;

  // Filter questions for display (maybe sort by date desc?)
  const myAskedQuestions = askedQuestionsData?.results
    ? [...askedQuestionsData.results].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      {/* Header */}
      <Header
        title="Ask a Question"
        icon={<HelpCircle className="w-5 h-5 mr-2 text-indigo-600" />}
        onBack={handleBack}
      />

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
          <>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 px-1 text-left">
                <LayoutGrid className="w-5 h-5 mr-2 text-indigo-600 inline" />
                Choose a Category
              </h2>
              {isLoadingCategories ? (
                <div className="flex justify-center p-12">
                  <Loader className="animate-spin text-indigo-600 w-8 h-8" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoriesData?.results.map((category) => (
                    <CategoryCard
                      key={category.category_id}
                      category={category}
                      onClick={handleCategorySelect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* History Section (Visible only when filtering categories/on initial screen) */}
            <div className="pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h2 className="text-lg font-semibold text-gray-900 px-1 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-500" />
                  Question History
                </h2>

                {/* Team Filter Dropdown */}
                <div className="w-full sm:w-64">
                  <div className="relative">
                    <select
                      value={selectedHistoryTeamId}
                      onChange={(e) => setSelectedHistoryTeamId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      disabled={isLoadingTeams}
                    >
                      {availableTeams.map((team) => (
                        <option key={team.team_id} value={team.team_id}>
                          {team.team_name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="space-y-3">
                  <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : myAskedQuestions.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">
                    You haven't asked any questions to this team yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myAskedQuestions.map((q) => (
                    <QuestionCard
                      key={q.question_id}
                      question={q}
                      gameId={gameId}
                      onAccept={handleAccept}
                      isAccepting={isAccepting}
                      acceptingId={acceptingId}
                      onAddLocation={handleAddLocation}
                      isUpdatingLocation={isUpdatingLocation}
                      updatingLocationId={updatingLocationId}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Template Selection */}
        {selectedCategory && !selectedTemplateBasic && (
          <div className="space-y-4">
            <h2 className="text-left text-lg font-semibold text-gray-900 px-1">
              Select a Question
            </h2>
            {isLoadingTemplates ? (
              <div className="flex justify-center p-12">
                <Loader className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            ) : (
              <div className="space-y-3">
                {templatesData?.results.map((template) => (
                  <Card
                    key={template.question_id}
                    className="cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-[0.98] group"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="p-5">
                      <p className="text-gray-800 text-lg group-hover:text-indigo-700 transition-colors">
                        {template.template}
                      </p>
                    </CardContent>
                  </Card>
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
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-6">
                  {/* Question Preview */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Selected Question
                    </label>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900 font-medium text-lg">
                      {activeTemplate.template}
                    </div>
                  </div>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      {/* Target Team Selection */}
                      <FormField
                        control={form.control}
                        name="target_team_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Team</FormLabel>
                            {isLoadingTeams ? (
                              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                            ) : (
                              <div className="relative">
                                <FormControl>
                                  <select
                                    {...field}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                  >
                                    <option value="">Select a team...</option>
                                    {teams?.map((team) => (
                                      <option
                                        key={team.team_id}
                                        value={team.team_id}
                                      >
                                        {team.team_name}
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Placeholders */}
                      {activeTemplate.placeholders &&
                        Object.keys(activeTemplate.placeholders).length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="font-medium text-gray-900">
                              Fill Missing Details
                            </h3>
                            {Object.keys(activeTemplate.placeholders).map(
                              (key) => {
                                const config =
                                  activeTemplate.placeholders![key];
                                return (
                                  <FormField
                                    key={key}
                                    control={form.control}
                                    name={`placeholders.${key}`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="capitalize">
                                          {key.replace(/_/g, ' ')}{' '}
                                          {config.required && (
                                            <span className="text-red-500">
                                              *
                                            </span>
                                          )}
                                        </FormLabel>
                                        <FormControl>
                                          {config.allowed_values &&
                                          config.allowed_values.length > 0 ? (
                                            <div className="relative">
                                              <select
                                                {...field}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                                value={field.value || ''}
                                              >
                                                <option value="">
                                                  Select...
                                                </option>
                                                {config.allowed_values.map(
                                                  (val) => (
                                                    <option
                                                      key={val}
                                                      value={val}
                                                    >
                                                      {val}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                                            </div>
                                          ) : (
                                            <Input
                                              {...field}
                                              placeholder={`Type here...`}
                                              value={field.value || ''}
                                            />
                                          )}
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                );
                              },
                            )}
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

                        <Button
                          type="submit"
                          disabled={isAsking || isAskingForLocation}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-6 text-lg shadow-lg shadow-indigo-200"
                        >
                          {isAsking || isAskingForLocation ? (
                            <Loader className="w-6 h-6 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              <span>Send Question</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <div className="p-4 text-red-500 text-center">
                Failed to load question details.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location Error Modal */}
      {locationErrorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Location Access Needed
              </h3>
              <p className="text-gray-500">
                We couldn't get your location. Would you like to send the
                question without it?
              </p>
              <div className="flex flex-col w-full space-y-3 pt-2">
                <Button
                  onClick={handleLocationErrorProceed}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isAsking}
                >
                  Ask Without Location
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLocationErrorCancel}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
