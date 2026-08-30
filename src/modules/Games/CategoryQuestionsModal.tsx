import { Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/modal';
import { useFetchQuestionTemplatesQuery } from '../../apis/qnaApi';
import { Category } from '../../models/QnA';
import { isGeoTemplate, questionTemplateId, QuestionTemplateV2 } from '../MapV2/factsV2/questionPipelineTypes';

interface CategoryQuestionsModalProps {
  /** Null closes the modal (also passed straight through as Modal's
   * isOpen). */
  category: Category | null;
  gameId: string;
  onClose: () => void;
}

/**
 * Every question template in one category, with each placeholder's full
 * set of options — pure preview, no ask/submit action here (that flow
 * moved into the map). Opened by clicking a category row in
 * QuestionsCard.tsx.
 *
 * The real API nests each template's answer plan under
 * answer_instruction_meta (see MapV2's "Ask to Fact — Templates v2
 * Contract"); this endpoint's legacy TypeScript return type
 * (models/QnA.ts's QuestionTemplate) doesn't declare that field, so the
 * raw result is cast before filtering — the same cast MapV2's own
 * useGetQuestionTemplateDetail uses. A pre-v2 row (no
 * answer_instruction_meta) is dropped — there's nothing to preview for one.
 */
export function CategoryQuestionsModal({ category, gameId, onClose }: CategoryQuestionsModalProps) {
  const { data, isFetching } = useFetchQuestionTemplatesQuery(
    { categoryId: category?.category_id ?? '', gameId },
    { skip: !category },
  );

  const templates = (data?.results ?? [])
    .map((wire) => wire as unknown as QuestionTemplateV2)
    .filter(isGeoTemplate);

  return (
    <Modal
      isOpen={!!category}
      onClose={onClose}
      title={category?.category_name}
      className="max-w-xl w-full max-h-[85vh] overflow-y-auto text-left"
    >
      {isFetching ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading questions…
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-6 text-center">No questions in this category yet.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const placeholders = Object.entries(template.answer_instruction_meta.placeholders);
            return (
              <div key={questionTemplateId(template)} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800">{template.template}</p>
                {placeholders.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {placeholders.map(([key, spec]) => (
                      <div key={key}>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          {key}
                          {spec.required && <span className="text-rose-500 normal-case font-normal"> (required)</span>}
                        </span>
                        {spec.allowed_values && spec.allowed_values.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {spec.allowed_values.map((option, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-gray-600"
                              >
                                {option.display_name}
                              </span>
                            ))}
                          </div>
                        )}
                        {spec.allow_free_text && (
                          <span className="block mt-1 text-[10px] text-gray-400 italic">Free text also allowed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
