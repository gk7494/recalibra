/**
 * Inspection templates management
 */

import React, { useState, useEffect } from 'react';
import { INDUSTRY_TEMPLATES, getAllCategories } from '../utils/industryTemplates';
import type { InspectionTemplate } from '../utils/industryTemplates';

// Use the industry template type
type Template = InspectionTemplate;

interface TemplateModalProps {
  template: Template | null;
  onClose: () => void;
  onSave: (template: Template) => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ template, onClose, onSave }) => {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'equipment');
  const [industry, setIndustry] = useState(template?.industry || 'General');
  const [fields, setFields] = useState<string[]>(template?.fields?.map(f => f.id) || []);
  const [newField, setNewField] = useState('');

  const availableFields = [
    'serial_number', 'model_number', 'manufacturer', 'voltage', 'amperage', 'wattage',
    'frequency', 'pressure', 'location', 'inspector', 'date', 'safety_issues',
    'compliance_status', 'equipment_id', 'last_maintenance', 'next_maintenance',
    'condition', 'notes', 'circuit_breaker', 'wiring_condition', 'safety_labels'
  ];

  const handleAddField = () => {
    if (newField && !fields.includes(newField)) {
      setFields([...fields, newField]);
      setNewField('');
    }
  };

  const handleRemoveField = (field: string) => {
    setFields(fields.filter(f => f !== field));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }
    // Convert field IDs to TemplateField objects
    const templateFields = fields.map(fieldId => {
      // Try to find in available fields or create basic field
      const availableField = availableFields.find(af => af === fieldId);
      return {
        id: fieldId,
        label: availableField ? availableField.replace(/_/g, ' ') : fieldId,
        type: 'text' as const,
        required: false,
        ocrMapping: [fieldId],
      };
    });
    
    const newTemplate: Template = {
      id: template?.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      industry,
      category,
      fields: templateFields,
      icon: '📋',
    };
    
    onSave(newTemplate);
    onClose();
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Template name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Template description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="General">General</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="Mechanical">Mechanical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="equipment">Equipment</option>
                <option value="safety">Safety</option>
                <option value="maintenance">Maintenance</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="mechanical">Mechanical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fields</label>
            <div className="flex gap-2 mb-2">
              <select
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a field...</option>
                {availableFields.filter(f => !fields.includes(f)).map(field => (
                  <option key={field} value={field}>{field.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <button
                onClick={handleAddField}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((field, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                >
                  {field.replace(/_/g, ' ')}
                  <button
                    onClick={() => handleRemoveField(field)}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Use industry templates as default, allow custom templates to be added
    const saved = localStorage.getItem('custom_inspection_templates');
    const customTemplates: Template[] = saved ? JSON.parse(saved) : [];
    
    // Combine industry templates with custom templates
    setTemplates([...INDUSTRY_TEMPLATES, ...customTemplates]);
  }, []);

  const categories = ['all', ...getAllCategories()];
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveTemplate = (template: Template) => {
    // Only save custom templates (not industry templates)
    const isIndustryTemplate = INDUSTRY_TEMPLATES.some(t => t.id === template.id);
    if (isIndustryTemplate) {
      alert('Industry templates cannot be modified. Create a custom template instead.');
      return;
    }
    
    const saved = localStorage.getItem('custom_inspection_templates');
    const customTemplates: Template[] = saved ? JSON.parse(saved) : [];
    const existingIndex = customTemplates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      customTemplates[existingIndex] = template;
    } else {
      customTemplates.push(template);
    }
    
    localStorage.setItem('custom_inspection_templates', JSON.stringify(customTemplates));
    
    // Update state with combined templates
    setTemplates([...INDUSTRY_TEMPLATES, ...customTemplates]);
    setEditingTemplate(null);
    setShowCreateModal(false);
  };

  const handleDeleteTemplate = (id: string) => {
    // Only allow deleting custom templates
    const isIndustryTemplate = INDUSTRY_TEMPLATES.some(t => t.id === id);
    if (isIndustryTemplate) {
      alert('Industry templates cannot be deleted.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    const saved = localStorage.getItem('custom_inspection_templates');
    const customTemplates: Template[] = saved ? JSON.parse(saved) : [];
    const updated = customTemplates.filter(t => t.id !== id);
    
    localStorage.setItem('custom_inspection_templates', JSON.stringify(updated));
    setTemplates([...INDUSTRY_TEMPLATES, ...updated]);
  };

  const handleUseTemplate = (template: Template) => {
    // Store selected template in localStorage
    localStorage.setItem('selected_template', JSON.stringify(template));
    // Dispatch event to InspectPage to set the selected template
    window.dispatchEvent(new CustomEvent('template-selected', { detail: template }));
    // Show confirmation
    alert(`Template "${template.name}" has been selected. It will be used for your next inspection.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Inspection Templates</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Create Template
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {template.industry}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {template.category}
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Fields ({template.fields.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {template.fields.slice(0, 6).map((field, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {field.label}
                    </span>
                  ))}
                  {template.fields.length > 6 && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                      +{template.fields.length - 6} more
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Use Template
                </button>
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium text-sm"
                  title="Delete Template"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500">No templates found</p>
          </div>
        )}
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={handleSaveTemplate}
        />
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <TemplateModal
          template={null}
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
};

