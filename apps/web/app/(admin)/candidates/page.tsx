import { listCandidates } from "../../../lib/candidate-repository";
import CandidatesClient from "./candidates-client";

export default async function CandidatesPage() {
  const candidates = await listCandidates();
  return <CandidatesClient initialCandidates={candidates} />;
}
