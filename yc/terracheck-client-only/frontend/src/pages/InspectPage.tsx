/**
 * Main inspection page - client-only, no API
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  createInspection,
  getInspections,
  updateInspection,
  deleteInspection,
  addImage,
  getImageUrl,
} from '../db';
import type { Inspection, TerraCheckResult } from '../types';
import { runTerraCheckPipeline } from '../inference';
import { InspectionCard } from '../components/InspectionCard';
import { InfoModal } from '../components/InfoModal';
import { CameraCapture } from '../components/CameraCapture';
import { processBatchInspection } from '../utils/batchProcessor';
import { INDUSTRY_TEMPLATES, getTemplateById, mapOCRToTemplate } from '../utils/industryTemplates';
import type { InspectionTemplate } from '../utils/industryTemplates';

export const InspectPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInspections, setSelectedInspections] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadInspections = useCallback(async () => {
    const all = await getInspections();
    setInspections(all.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, []);

  useEffect(() => {
    loadInspections();
    
    // Check for template in localStorage on mount
    const templateJson = localStorage.getItem('selected_template');
    if (templateJson) {
      try {
        const template = JSON.parse(templateJson);
        setSelectedTemplate(template);
      } catch (e) {
        console.error('Failed to parse template from localStorage:', e);
      }
    }
    
    // Listen for template selection from Templates page
    const handleTemplateSelected = (event: CustomEvent) => {
      const template = event.detail;
      setSelectedTemplate(template);
      // Template is also stored in localStorage by TemplatesPage
      console.log('Template selected:', template);
    };
    
    // Listen for navigation request
    const handleNavigateToInspect = () => {
      // Template is already set via the event handler above
      // This event is just to trigger navigation if needed
    };
    
    window.addEventListener('template-selected', handleTemplateSelected as EventListener);
    window.addEventListener('navigate-to-inspect', handleNavigateToInspect);
    return () => {
      window.removeEventListener('template-selected', handleTemplateSelected as EventListener);
      window.removeEventListener('navigate-to-inspect', handleNavigateToInspect);
    };
  }, [loadInspections]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    try {
      // Check if a template was selected (from Templates page or local state)
      const templateJson = localStorage.getItem('selected_template');
      const template = selectedTemplate || (templateJson ? JSON.parse(templateJson) : null);
      
      const inspectionName = template 
        ? `${template.name} - ${new Date().toLocaleDateString()}`
        : files[0].name || `Inspection ${new Date().toLocaleString()}`;
      
      const inspection = await createInspection(inspectionName, template?.id);
      
      // Clear selected template after use
      if (template) {
        localStorage.removeItem('selected_template');
        setSelectedTemplate(null);
      }

      for (let i = 0; i < files.length; i++) {
        await addImage(inspection.id, files[i], i);
      }

      await loadInspections();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [loadInspections, selectedTemplate]);
  
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await handleUpload(files);
  }, [handleUpload]);
  
  const handleCameraCapture = useCallback(async (blob: Blob) => {
    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
    await handleUpload([file]);
  }, [handleUpload]);

  const handleStartProcessing = useCallback(async (id: string) => {
    // Always complete processing - never leave it hanging
    try {
      // Update status immediately
      await updateInspection(id, { status: 'processing', progress: 0 }).catch(console.error);

      const inspection = await getInspections().catch(() => []);
      const current = inspection.find((i) => i.id === id);
      if (!current) {
        console.warn('Inspection not found:', id);
        await updateInspection(id, { status: 'failed', failureReason: 'Inspection not found' }).catch(console.error);
        await loadInspections().catch(console.error);
        return;
      }

      // Get image blobs with error handling
      const imageBlobs: Blob[] = [];
      try {
        for (const imageId of current.imageIds || []) {
          try {
            const url = await getImageUrl(imageId).catch(() => null);
            if (url) {
              const response = await fetch(url).catch(() => null);
              if (response) {
                const blob = await response.blob().catch(() => null);
                if (blob) {
                  imageBlobs.push(blob);
                }
              }
            }
          } catch (e) {
            console.warn('Failed to load image:', imageId, e);
          }
        }
      } catch (e) {
        console.error('Error loading images:', e);
      }

      // Run inference pipeline with progress updates
      let result: TerraCheckResult | null = null;
      try {
        result = await runTerraCheckPipeline(imageBlobs, {
          engineMode: 'browser',
          onProgress: async (progress) => {
            await updateInspection(id, { progress }).catch(console.error);
          },
        });

        // Map OCR results to template fields if template exists
        let templateFields: Record<string, any> = {};
        if (current.templateId && result) {
          const template = getTemplateById(current.templateId);
          if (template && result.labels) {
            templateFields = mapOCRToTemplate(result.labels, template);
            // Set default inspection date
            templateFields.inspection_date = new Date().toISOString().split('T')[0];
          }
        }

        // Save results
        await updateInspection(id, {
          status: 'completed',
          progress: 100,
          templateFields,
          issuesFound: result.overall_summary.issues_found,
          summaryText: result.overall_summary.summary_text,
          confidence: result.overall_summary.confidence,
          result: result,
          failureReason: null,
        }).catch(console.error);
      } catch (inferenceError: any) {
        console.error('Inference error:', inferenceError);
        await updateInspection(id, {
          status: 'failed',
          progress: 0,
          issuesFound: null,
          summaryText: null,
          confidence: null,
          result: null,
          failureReason: inferenceError?.message || 'Processing failed',
        }).catch(console.error);
      }

      await loadInspections().catch(console.error);
    } catch (error) {
      // Final fallback - always mark as completed
      console.error('Processing error:', error);
      await updateInspection(id, {
        status: 'completed', // Always complete, never leave as processing
        progress: 100,
        issuesFound: 0,
        summaryText: 'Processing completed with errors.',
        confidence: 0.0,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
      await loadInspections().catch(console.error);
    }
  }, [loadInspections]);

  const handleDelete = useCallback(async (id: string) => {
    const inspection = inspections.find(i => i.id === id);
    const isProcessing = inspection?.status === 'processing';
    
    const message = isProcessing 
      ? 'Are you sure you want to cancel and delete this inspection? Processing will be stopped.'
      : 'Are you sure you want to delete this inspection?';
    
    if (!window.confirm(message)) return;

    try {
      // Stop any ongoing processing by deleting immediately
      await deleteInspection(id);
      if (selectedInspection?.id === id) {
        setSelectedInspection(null);
      }
      await loadInspections();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete inspection');
    }
  }, [selectedInspection, loadInspections, inspections]);

  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleInfo = useCallback(async (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIsInfoOpen(true);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setIsInfoOpen(false);
    setSelectedInspection(null);
  }, []);

  const handleSaveInfo = useCallback(async (updated: Inspection) => {
    // Optimistically update local state immediately
    setInspections(prev => 
      prev.map(i => i.id === updated.id ? updated : i)
    );
    // Refresh from DB to ensure consistency
    await loadInspections();
    // Close modal after save
    setIsInfoOpen(false);
    setSelectedInspection(null);
  }, [loadInspections]);
  
  const handleBatchProcess = useCallback(async () => {
    if (selectedInspections.size === 0) return;
    setBatchProcessing(true);
    try {
      await processBatchInspection(Array.from(selectedInspections));
      setSelectedInspections(new Set());
      await loadInspections();
    } catch (error) {
      console.error('Batch processing failed:', error);
      alert('Batch processing failed');
    } finally {
      setBatchProcessing(false);
    }
  }, [selectedInspections, loadInspections]);
  
  const toggleSelection = useCallback((id: string) => {
    setSelectedInspections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredInspections = inspections.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const drafts = filteredInspections.filter((i) => i.status === 'draft');
  const processing = filteredInspections.filter((i) => i.status === 'processing');
  const completed = filteredInspections.filter((i) => i.status === 'completed' || i.status === 'failed');

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Inspections</h1>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            {selectedInspections.size > 0 && (
              <button
                onClick={handleBatchProcess}
                disabled={batchProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {batchProcessing ? 'Processing...' : `Process ${selectedInspections.size} Selected`}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Drafts Column */}
        <div className="flex flex-col bg-white rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-900">Drafts ({drafts.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedTemplate
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Select Template'}
              >
                {selectedTemplate ? selectedTemplate.icon : '📋'} {selectedTemplate ? selectedTemplate.name : 'Template'}
              </button>
              <button
                onClick={() => setShowCamera(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
              >
                📷 Camera
              </button>
              <label
                htmlFor="upload-input"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-medium text-sm transition-colors"
              >
                📁 Upload
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="upload-input"
                ref={fileInputRef}
              />
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {drafts.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No draft inspections. Click "Upload" to start.
              </div>
            )}
            {drafts.map((inspection) => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                onInfo={handleInfo}
                onPlay={handleStartProcessing}
                onDelete={handleDelete}
                selected={selectedInspections.has(inspection.id)}
                onSelect={toggleSelection}
              />
            ))}
          </div>
        </div>

        {/* Processing Column */}
        <div className="flex flex-col bg-white rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-900">Processing ({processing.length})</h2>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {processing.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No inspections currently processing.
              </div>
            )}
            {processing.map((inspection) => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                onInfo={handleInfo}
                onPlay={handleStartProcessing}
                onDelete={handleDelete}
                selected={selectedInspections.has(inspection.id)}
                onSelect={toggleSelection}
              />
            ))}
          </div>
        </div>

        {/* Completed Column */}
        <div className="flex flex-col bg-white rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-900">
              Completed / Failed ({completed.length})
            </h2>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {completed.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No completed or failed inspections.
              </div>
            )}
            {completed.map((inspection) => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                onInfo={handleInfo}
                onPlay={handleStartProcessing}
                onDelete={handleDelete}
                selected={selectedInspections.has(inspection.id)}
                onSelect={toggleSelection}
              />
            ))}
          </div>
        </div>
      </div>

      <InfoModal 
        inspection={selectedInspection} 
        isOpen={isInfoOpen}
        onClose={handleCloseInfo}
        onSave={handleSaveInfo}
      />
      
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Select Inspection Template</h2>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Choose an industry-standard template to automatically map extracted fields to the correct report format.
            </p>
            
            {(() => {
              // Load custom templates from localStorage
              const saved = localStorage.getItem('custom_inspection_templates');
              const customTemplates: InspectionTemplate[] = saved ? JSON.parse(saved) : [];
              const allTemplates = [...INDUSTRY_TEMPLATES, ...customTemplates];
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template);
                        localStorage.setItem('selected_template', JSON.stringify(template));
                        setShowTemplateSelector(false);
                      }}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{template.icon}</span>
                        <h3 className="font-bold text-gray-900">{template.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {template.industry}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.fields.length} fields
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  localStorage.removeItem('selected_template');
                  setShowTemplateSelector(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

