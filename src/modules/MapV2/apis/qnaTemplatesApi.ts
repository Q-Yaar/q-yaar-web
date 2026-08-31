/**
 * The one v2 endpoint that has no legacy counterpart to reuse — "Ask to
 * Fact — Templates v2 Contract" §4's List templates
 * (`GET /api/v1/qna/questions/`, no category prefix, category_id as an
 * optional query param instead) is a different URL shape from the
 * existing src/apis/qnaApi.ts's fetchQuestionTemplates
 * (`categories/{categoryId}/questions/`). The *detail* endpoint, by
 * contrast, is identical to that file's fetchQuestionTemplateDetails — see
 * qnaPipelineApi.ts, which calls that one directly rather than duplicating
 * it here.
 *
 * Injects into the same shared `api` slice qnaApi.ts and deckApi.ts do
 * (RTK Query's injectEndpoints is designed for exactly this — adding
 * endpoints from a different file without editing the original), so this
 * never touches src/apis/qnaApi.ts itself.
 */
import { api } from '../../../apis/api';
import { QNA_API } from '../../../constants/api-endpoints';
import { QNA_MODULE } from '../../../constants/modules';
import { ListResponse } from '../../../models/ApiResponse';
import { QuestionTemplateV2 } from '../factsV2/questionPipelineTypes';

export interface FetchQuestionTemplatesV2Params {
  category_id?: string;
  game_id?: string;
}

export const qnaTemplatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /** Pages through the whole catalog and returns it flat — nothing
     * downstream (the wizard's template list) has any notion of pagination,
     * and a real template catalog is small enough (an authored set, not
     * user-generated content) that loading it all at once is the simpler,
     * correct choice here. Per the contract doc's own worked example,
     * `next` is a bare page number ("2"), not a URL, so this pages by
     * number rather than following `next` as a link. */
    fetchQuestionTemplatesV2: builder.query<QuestionTemplateV2[], FetchQuestionTemplatesV2Params | void>({
      async queryFn(params, _queryApi, _extraOptions, baseQuery) {
        const results: QuestionTemplateV2[] = [];
        let page = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const response = await baseQuery({
            url: `${QNA_API}questions/`,
            method: 'GET',
            params: {
              ...(params?.category_id ? { category_id: params.category_id } : {}),
              ...(params?.game_id ? { game_id: params.game_id } : {}),
              page,
            },
          });
          if (response.error) return { error: response.error };
          const data = response.data as ListResponse<QuestionTemplateV2>;
          results.push(...data.results);
          if (!data.next) break;
          page += 1;
        }
        return { data: results };
      },
      providesTags: [QNA_MODULE],
    }),
  }),
});

export const { useFetchQuestionTemplatesV2Query } = qnaTemplatesApi;
