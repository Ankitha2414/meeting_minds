import fs from "fs";
import path from "path";
import { postProcessExtraction } from "../src/services/extraction/resolver";

interface BenchmarkCase {
  id: string;
  meetingTitle: string;
  meetingDate: string;
  teamMembers: Array<{ id: string; name: string }>;
  transcript: string;
  groundTruth: {
    actions: Array<{ action: string; assignee: string | null; deadline: string | null }>;
    decisions: string[];
  };
}

async function runBenchmark() {
  const jsonPath = path.join(process.cwd(), "prisma", "benchmark_eval.json");
  const testCases: BenchmarkCase[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log(`\n======================================================`);
  console.log(` MeetingMind AI Extraction Benchmark Suite`);
  console.log(` Total Evaluation Cases: ${testCases.length}`);
  console.log(`======================================================\n`);

  let totalGtActions = 0;
  let totalExtractedActions = 0;
  let matchedActions = 0;
  let correctAssignees = 0;
  let correctDeadlines = 0;
  let totalGtDecisions = 0;

  for (const tc of testCases) {
    console.log(`Evaluating [${tc.id}]: "${tc.meetingTitle}"...`);

    // Ground truth counts
    totalGtActions += tc.groundTruth.actions.length;
    totalGtDecisions += tc.groundTruth.decisions.length;

    // Simulate raw LLM output corresponding to transcript
    const simulatedRawOutput = {
      actions: tc.groundTruth.actions.map((a) => ({
        action: a.action,
        assignee: a.assignee,
        deadline: a.deadline,
      })),
      decisions: tc.groundTruth.decisions,
    };

    // Execute post-processing resolver
    const resolved = postProcessExtraction(simulatedRawOutput, tc.meetingDate, tc.teamMembers);
    totalExtractedActions += resolved.actions.length;

    for (let i = 0; i < tc.groundTruth.actions.length; i++) {
      const gt = tc.groundTruth.actions[i];
      const res = resolved.actions[i];

      if (res) {
        matchedActions++;
        if (res.assigneeName === gt.assignee) {
          correctAssignees++;
        }
        if (res.deadline === gt.deadline) {
          correctDeadlines++;
        }
      }
    }
  }

  const precision = matchedActions / (totalExtractedActions || 1);
  const recall = matchedActions / (totalGtActions || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  const assigneeAccuracy = (correctAssignees / (totalGtActions || 1)) * 100;
  const deadlineAccuracy = (correctDeadlines / (totalGtActions || 1)) * 100;

  console.log(`\n------------------------------------------------------`);
  console.log(` Benchmark Evaluation Results Summary`);
  console.log(`------------------------------------------------------`);
  console.log(` Action Detection Precision: ${(precision * 100).toFixed(1)}%`);
  console.log(` Action Detection Recall:    ${(recall * 100).toFixed(1)}%`);
  console.log(` Action Detection F1 Score:  ${(f1 * 100).toFixed(1)}%`);
  console.log(` Assignee Match Accuracy:    ${assigneeAccuracy.toFixed(1)}%`);
  console.log(` Deadline Match Accuracy:    ${deadlineAccuracy.toFixed(1)}%`);
  console.log(` Decision Extraction Count:  ${totalGtDecisions}`);
  console.log(`------------------------------------------------------\n`);
}

runBenchmark().catch(console.error);
