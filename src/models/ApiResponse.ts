export interface ListResponse<R> {
  count: number;
  next: string;
  previous: string;
  results: R[];
}
