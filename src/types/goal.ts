export interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  targetDate: string;
  linkedAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalDto {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  monthlyContribution?: number;
  targetDate: string;
  linkedAccountId?: string | null;
}

export interface UpdateGoalDto {
  name?: string;
  targetAmount?: number;
  savedAmount?: number;
  monthlyContribution?: number;
  targetDate?: string;
  linkedAccountId?: string | null;
}

export interface GoalResponse {
  _id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  targetDate: string;
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}
