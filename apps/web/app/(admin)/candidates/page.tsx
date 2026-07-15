import { listCandidates } from "../../../lib/candidate-repository";
import type { CandidateFocusFilter } from "../../../lib/candidate-repository";
import CandidatesClient from "./candidates-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; focus?: string }>;
}) {
  const { page, focus: requestedFocus } = await searchParams;
  const focus: CandidateFocusFilter = [
    "Claude Code K12",
    "K12",
    "Bug Team",
    "ALL",
  ].includes(requestedFocus ?? "")
    ? requestedFocus as CandidateFocusFilter
    : "Claude Code K12";
  try {
    const initialPage = await listCandidates({
      page: Number(page ?? 1),
      focus,
    });
    return <CandidatesClient initialPage={initialPage} initialFocus={focus} />;
  } catch {
    return (
      <CandidatesClient
        initialPage={{ items: [], page: 1, pageSize: 50, total: 0 }}
        initialFocus={focus}
        initialError="数据库连接暂时繁忙，请稍后刷新页面。"
      />
    );
  }
}
