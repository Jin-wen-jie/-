import { listCandidates } from "../../../lib/candidate-repository";
import CandidatesClient from "./candidates-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const initialPage = await listCandidates({ page: Number(page ?? 1) });
  return <CandidatesClient initialPage={initialPage} />;
}
