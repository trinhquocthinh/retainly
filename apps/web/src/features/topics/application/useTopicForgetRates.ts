import { useQuery } from '@tanstack/react-query';

import {
  buildAdvice,
  buildForgetRateReport,
  type ForgetRateResponse,
  type ForgetRateReport,
} from '../domain/forgetRate';

type ForgetRatePorts = {
  fetchTopicForgetRates: () => Promise<ForgetRateResponse>;
};

const EMPTY_REPORT: ForgetRateReport = { rows: [], totalReviews: 0, topicCount: 0 };

export function useTopicForgetRates(deps: ForgetRatePorts) {
  const query = useQuery({
    queryKey: ['topics', 'forget-rate'],
    queryFn: deps.fetchTopicForgetRates,
    staleTime: 60_000,
  });

  const report = query.data ? buildForgetRateReport(query.data.topics) : EMPTY_REPORT;

  return {
    report,
    advice: buildAdvice(report.rows),
    loading: query.isPending,
    failed: query.isError,
    reload: () => void query.refetch(),
  };
}
