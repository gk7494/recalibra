/**
 * Editable Info modal - client-only
 */

import React, { useState, useEffect } from 'react';
import { getInspectionImages, getImageUrl, updateInspectionFull } from '../db';
import type { Inspection, TerraCheckResult } from '../types';
import { exportReport } from '../utils/reportGenerator';
import { InspectionForm } from './InspectionForm';

interface InfoModalProps {
  inspection: Inspection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Inspection) => void;
}

const ISSUE_TYPES = [
  'crack',
  'corrosion',
  'deformation',
  'misalignment',
  'gap',
  'missing_component',
  'foreign_object',
  'text_warning',
  'other',
] as const;

const SEVERITY_LEVELS = ['low', 'medium', 'high'] as const;

export const InfoModal: React.FC<InfoModalProps> = ({ inspection, isOpen, onClose, onSave }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageBlobs, setImageBlobs] = useState<Blob[]>([]);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'raw'>('form'); // 'form' or 'raw'
  
  // Editable state
  const [editedResult, setEditedResult] = useState<TerraCheckResult | null>(null);
  const [status, setStatus] = useState<Inspection['status']>('draft');
  const [editedLabels, setEditedLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [newLabelKey, setNewLabelKey] = useState('');
  const [newLabelValue, setNewLabelValue] = useState('');

  // Initialize editable state when inspection changes
  useEffect(() => {
    if (inspection && isOpen) {
      setStatus(inspection.status);
      if (inspection.result) {
        setEditedResult(JSON.parse(JSON.stringify(inspection.result))); // Deep copy
        // Convert labels object to array for editing
        const labelEntries = Object.entries(inspection.result.labels);
        setEditedLabels(labelEntries.map(([key, value]) => ({ key, value })));
      } else {
        setEditedResult({
          text_blocks: [],
          tables: [],
          labels: {},
          detected_issues: [],
          overall_summary: {
            issues_found: 0,
            confidence: 0.0,
            summary_text: '',
          },
        });
        setEditedLabels([]);
      }
      setNewLabelKey('');
      setNewLabelValue('');
    }
  }, [inspection?.id, isOpen]);

  useEffect(() => {
    if (inspection && isOpen) {
      getInspectionImages(inspection.id).then(setImageUrls);
      
      // Load image blobs for export
      Promise.all(
        inspection.imageIds.map(async (id) => {
          const url = await getImageUrl(id);
          if (url) {
            const response = await fetch(url);
            return response.blob();
          }
          return null;
        })
      ).then(blobs => setImageBlobs(blobs.filter(Boolean) as Blob[]));
    }
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [inspection?.id, isOpen]);
  
  const handleExport = async (format: 'pdf' | 'word' | 'excel') => {
    if (!inspection || !inspection.result) return;
    
    setExporting(true);
    try {
      await exportReport({
        inspectionName: inspection.name,
        inspectionDate: new Date(inspection.createdAt).toLocaleString(),
        images: imageBlobs,
        ocrResult: inspection.result,
      }, format);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleLabelChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...editedLabels];
    updated[index] = { ...updated[index], [field]: value };
    setEditedLabels(updated);
  };

  const handleRemoveLabel = (index: number) => {
    setEditedLabels(editedLabels.filter((_, i) => i !== index));
  };

  const handleAddLabel = () => {
    if (newLabelKey.trim() && newLabelValue.trim()) {
      setEditedLabels([...editedLabels, { key: newLabelKey.trim(), value: newLabelValue.trim() }]);
      setNewLabelKey('');
      setNewLabelValue('');
    }
  };

  const handleIssueChange = (index: number, field: string, value: any) => {
    if (!editedResult) return;
    const updated = [...editedResult.detected_issues];
    updated[index] = { ...updated[index], [field]: value };
    setEditedResult({ ...editedResult, detected_issues: updated });
  };

  const handleAddIssue = () => {
    if (!editedResult) return;
    const newIssue = {
      type: 'other',
      description: '',
      bbox: [0, 0, 100, 100] as [number, number, number, number],
      severity: 'low' as const,
      confidence: 0.5,
    };
    setEditedResult({
      ...editedResult,
      detected_issues: [...editedResult.detected_issues, newIssue],
    });
  };

  const handleRemoveIssue = (index: number) => {
    if (!editedResult) return;
    const updated = editedResult.detected_issues.filter((_, i) => i !== index);
    setEditedResult({ ...editedResult, detected_issues: updated });
  };

  const handleSummaryChange = (field: string, value: any) => {
    if (!editedResult) return;
    setEditedResult({
      ...editedResult,
      overall_summary: {
        ...editedResult.overall_summary,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!inspection || !editedResult) return;

    setSaving(true);
    try {
      // Convert labels array back to object
      const labelsObj: Record<string, string> = {};
      editedLabels.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          labelsObj[key.trim()] = value.trim();
        }
      });

      // Auto-fill issues_found if empty
      const issuesFound = editedResult.overall_summary.issues_found || editedResult.detected_issues.length;
      
      // Clamp confidence between 0 and 1
      const confidence = Math.max(0, Math.min(1, editedResult.overall_summary.confidence || 0));

      // Update result with labels
      const updatedResult: TerraCheckResult = {
        ...editedResult,
        labels: labelsObj,
        overall_summary: {
          ...editedResult.overall_summary,
          issues_found: issuesFound,
          confidence,
        },
      };

      const updatedInspection: Inspection = {
        ...inspection,
        status,
        issuesFound,
        summaryText: updatedResult.overall_summary.summary_text || null,
        confidence,
        result: updatedResult,
        updatedAt: new Date().toISOString(),
      };

      await updateInspectionFull(updatedInspection);

      if (onSave) {
        onSave(updatedInspection);
      }

      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!inspection || !isOpen) return null;

  const result = editedResult || inspection.result;
  const isEditable = inspection.status === 'completed' && editedResult !== null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-900">Inspection Details</h2>
          <div className="flex gap-2 items-center">
            {isEditable && (
              <div className="flex gap-2 mr-2">
                <button
                  onClick={() => setViewMode('form')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'form'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Standard Form
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'raw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Raw Data
                </button>
              </div>
            )}
            {inspection.status === 'completed' && inspection.result && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {exporting ? '...' : 'PDF'}
                </button>
                <button
                  onClick={() => handleExport('word')}
                  disabled={exporting}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {exporting ? '...' : 'Word'}
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {exporting ? '...' : 'Excel'}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="space-y-4 text-gray-700">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Name:</label>
            <p className="text-base">{inspection.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Created At:</label>
              <p className="text-base">{new Date(inspection.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Status:</label>
              {isEditable ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Inspection['status'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              ) : (
                <p
                  className={`text-base capitalize font-medium ${
                    inspection.status === 'completed'
                      ? 'text-green-600'
                      : inspection.status === 'processing'
                      ? 'text-blue-600'
                      : inspection.status === 'failed'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {inspection.status}
                </p>
              )}
            </div>
          </div>

          {inspection.status === 'processing' && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Progress:</label>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${inspection.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{inspection.progress}% complete</p>
            </div>
          )}

          {inspection.failureReason && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Failure Reason:
              </label>
              <p className="text-red-600 text-base">{inspection.failureReason}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Images ({inspection.imageIds.length}):
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
              {imageUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Inspection image ${idx + 1}`}
                  className="w-full h-24 object-cover rounded border border-gray-200"
                />
              ))}
            </div>
          </div>

          {/* Standard Form View */}
          {isEditable && viewMode === 'form' && (
            <InspectionForm
              inspection={inspection}
              readOnly={false}
            />
          )}

          {/* Raw Editable Results Section */}
          {isEditable && viewMode === 'raw' && result && (
            <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
                AI Analysis Results (Editable)
              </h3>

              {/* Labels Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Labels:
                </label>
                <div className="space-y-2">
                  {editedLabels.map((label, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={label.key}
                        onChange={(e) => handleLabelChange(idx, 'key', e.target.value)}
                        placeholder="Key"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={label.value}
                        onChange={(e) => handleLabelChange(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleRemoveLabel(idx)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLabelKey}
                      onChange={(e) => setNewLabelKey(e.target.value)}
                      placeholder="New key"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newLabelValue}
                      onChange={(e) => setNewLabelValue(e.target.value)}
                      placeholder="New value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddLabel}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Detected Issues Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Detected Issues:
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.detected_issues.map((issue, idx) => (
                    <div key={idx} className="p-3 border rounded-md bg-white">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Type:</label>
                          <select
                            value={issue.type}
                            onChange={(e) => handleIssueChange(idx, 'type', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {ISSUE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Severity:</label>
                          <select
                            value={issue.severity}
                            onChange={(e) => handleIssueChange(idx, 'severity', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {SEVERITY_LEVELS.map((sev) => (
                              <option key={sev} value={sev}>
                                {sev}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs text-gray-600 mb-1">Description:</label>
                        <textarea
                          value={issue.description}
                          onChange={(e) => handleIssueChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Confidence:</label>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={issue.confidence}
                            onChange={(e) =>
                              handleIssueChange(idx, 'confidence', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveIssue(idx)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddIssue}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add Issue
                  </button>
                </div>
              </div>

              {/* Overall Summary Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Overall Summary:
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Issues Found:</label>
                      <input
                        type="number"
                        min="0"
                        value={result.overall_summary.issues_found}
                        onChange={(e) =>
                          handleSummaryChange('issues_found', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Confidence (0-1):</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={result.overall_summary.confidence}
                        onChange={(e) =>
                          handleSummaryChange('confidence', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Summary Text:</label>
                    <textarea
                      value={result.overall_summary.summary_text}
                      onChange={(e) => handleSummaryChange('summary_text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Read-only view for non-completed inspections */}
          {!isEditable && result && (
            <div className="space-y-3 mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">AI Analysis Results</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Overall Summary:
                </label>
                <p className="text-base">{result.overall_summary.summary_text}</p>
                <p className="text-sm text-gray-600">
                  Issues Found: {result.overall_summary.issues_found}, Confidence:{' '}
                  {Math.round(result.overall_summary.confidence * 100)}%
                </p>
              </div>

              {Object.keys(result.labels).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Extracted Labels:
                  </label>
                  <ul className="list-disc list-inside text-base">
                    {Object.entries(result.labels).map(([key, value]) => (
                      <li key={key}>
                        <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.detected_issues.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Detected Issues:
                  </label>
                  <div className="space-y-2 mt-2">
                    {result.detected_issues.map((issue, idx) => (
                      <div key={idx} className="p-3 border rounded-md bg-white">
                        <p
                          className={`font-medium ${
                            issue.severity === 'high'
                              ? 'text-red-600'
                              : issue.severity === 'medium'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {issue.type.replace(/_/g, ' ').toUpperCase()} - {issue.severity.toUpperCase()}
                        </p>
                        <p className="text-sm">{issue.description}</p>
                        <p className="text-xs text-gray-500">
                          Confidence: {Math.round(issue.confidence * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save/Cancel Buttons */}
        {isEditable && (
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
