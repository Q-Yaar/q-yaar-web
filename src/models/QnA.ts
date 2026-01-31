export interface Reward {
  reward_id: string;
  reward_name: string;
  reward_type: string;
  reward_meta: {
    draw: number;
    pick: number;
    // Add other fields if necessary
  };
  created: string;
  modified: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  reward: Reward;
  priority: number;
  created: string;
  modified: string;
}

export interface QuestionPlaceholder {
  required: boolean;
  allowed_values: string[];
}

export interface QuestionTemplate {
  question_id: string;
  template: string;
  category: Category;
  created: string;
  modified: string;
  placeholders?: Record<string, QuestionPlaceholder>; // Optional as it might not be in all responses
}

export interface AskedQuestion {
  question_id: string;
  question_template_id: string;
  rendered_question: string;
  template: string;
  category: Category;
  question_meta: {
    myLocation: string; // Or generic Record<string, any> if diverse
  };
  answer_meta?: {
    answered?: boolean;
    result?: string;
  };
  created: string;
  modified: string;
}

export interface AskQuestionRequest {
  target_team_id: string;
  chosen_placeholders: Record<string, any>;
  question_meta: Record<string, any>;
}

export interface AnswerQuestionRequest {
  answer_meta: {
    answered: boolean;
    result: string; // e.g., "HIT", "MISS"
  };
}
