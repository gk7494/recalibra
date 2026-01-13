/**
 * Centralized type definitions for TerraCheck
 */

export interface TerraCheckResult {
  text_blocks: Array<{ text: string; bbox: [number, number, number, number] }>;
  tables: Array<{ title: string | null; table_markdown: string }>;
  labels: Record<string, string>;
  detected_issues: Array<{
    type: string;
    description: string;
    bbox: [number, number, number, number];
    severity: 'low' | 'medium' | 'high';
    confidence: number;
  }>;
  overall_summary: {
    issues_found: number;
    confidence: number;
    summary_text: string;
  };
}

export interface Inspection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  progress: number;
  issuesFound: number | null;
  summaryText: string | null;
  confidence: number | null;
  result: TerraCheckResult | null;
  failureReason: string | null;
  imageIds: string[];
  templateId?: string; // Link to inspection template
  templateFields?: Record<string, any>; // Field values mapped to template
}

