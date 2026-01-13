/**
 * Industry-standard inspection templates
 */

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  ocrMapping?: string[]; // OCR field names that map to this field
  options?: string[]; // For select type
}

export interface InspectionTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: string;
  fields: TemplateField[];
  icon: string;
}

/**
 * Standard industry templates
 */
export const INDUSTRY_TEMPLATES: InspectionTemplate[] = [
  {
    id: 'electrical-panel',
    name: 'Electrical Panel',
    description: 'Standard electrical panel inspection for circuit breakers, wiring, and safety compliance',
    industry: 'Electrical',
    category: 'electrical',
    icon: '⚡',
    fields: [
      { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, ocrMapping: ['serial_number'] },
      { id: 'model_number', label: 'Model Number', type: 'text', required: true, ocrMapping: ['model_number'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, ocrMapping: ['manufacturer'] },
      { id: 'voltage', label: 'Voltage', type: 'text', required: true, ocrMapping: ['voltage'] },
      { id: 'amperage', label: 'Amperage', type: 'text', required: true, ocrMapping: ['amperage'] },
      { id: 'frequency', label: 'Frequency', type: 'text', required: false, ocrMapping: ['frequency'] },
      { id: 'circuit_breaker_type', label: 'Circuit Breaker Type', type: 'text', required: false },
      { id: 'wiring_condition', label: 'Wiring Condition', type: 'select', required: true, options: ['Good', 'Fair', 'Poor', 'Needs Replacement'] },
      { id: 'safety_labels_visible', label: 'Safety Labels Visible', type: 'boolean', required: true },
      { id: 'grounding_status', label: 'Grounding Status', type: 'select', required: true, options: ['Properly Grounded', 'Not Grounded', 'Unknown'] },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'inspection_date', label: 'Inspection Date', type: 'date', required: true },
    ],
  },
  {
    id: 'hvac-equipment',
    name: 'HVAC Equipment',
    description: 'HVAC system inspection including compressors, air handlers, and ductwork',
    industry: 'HVAC',
    category: 'hvac',
    icon: '❄️',
    fields: [
      { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, ocrMapping: ['serial_number'] },
      { id: 'model_number', label: 'Model Number', type: 'text', required: true, ocrMapping: ['model_number'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, ocrMapping: ['manufacturer'] },
      { id: 'voltage', label: 'Voltage', type: 'text', required: true, ocrMapping: ['voltage'] },
      { id: 'amperage', label: 'Amperage', type: 'text', required: true, ocrMapping: ['amperage'] },
      { id: 'wattage', label: 'Wattage', type: 'text', required: false, ocrMapping: ['wattage'] },
      { id: 'cfm', label: 'CFM (Air Flow)', type: 'text', required: false, ocrMapping: ['cfm'] },
      { id: 'refrigerant_type', label: 'Refrigerant Type', type: 'text', required: false },
      { id: 'filter_condition', label: 'Filter Condition', type: 'select', required: true, options: ['Clean', 'Dirty', 'Needs Replacement'] },
      { id: 'coil_condition', label: 'Coil Condition', type: 'select', required: true, options: ['Clean', 'Dirty', 'Frozen', 'Damaged'] },
      { id: 'operating_pressure', label: 'Operating Pressure', type: 'text', required: false, ocrMapping: ['pressure'] },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'inspection_date', label: 'Inspection Date', type: 'date', required: true },
    ],
  },
  {
    id: 'mechanical-actuator',
    name: 'Mechanical Actuator',
    description: 'Valve actuators, damper controls, and mechanical control systems',
    industry: 'Mechanical',
    category: 'mechanical',
    icon: '⚙️',
    fields: [
      { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, ocrMapping: ['serial_number'] },
      { id: 'model_number', label: 'Model Number', type: 'text', required: true, ocrMapping: ['model_number'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, ocrMapping: ['manufacturer'] },
      { id: 'voltage', label: 'Voltage', type: 'text', required: true, ocrMapping: ['voltage'] },
      { id: 'frequency', label: 'Frequency', type: 'text', required: false, ocrMapping: ['frequency'] },
      { id: 'va', label: 'VA (Volt-Amperes)', type: 'text', required: false, ocrMapping: ['va'] },
      { id: 'wattage', label: 'Wattage', type: 'text', required: false, ocrMapping: ['wattage'] },
      { id: 'torque', label: 'Torque', type: 'text', required: false, ocrMapping: ['torque'] },
      { id: 'operating_time', label: 'Operating Time', type: 'text', required: false, ocrMapping: ['time'] },
      { id: 'manual_override', label: 'Manual Override Functional', type: 'boolean', required: true },
      { id: 'position_indicator', label: 'Position Indicator Working', type: 'boolean', required: true },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'inspection_date', label: 'Inspection Date', type: 'date', required: true },
    ],
  },
  {
    id: 'pump-system',
    name: 'Pump System',
    description: 'Water pumps, pressure systems, and fluid handling equipment',
    industry: 'Mechanical',
    category: 'mechanical',
    icon: '💧',
    fields: [
      { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, ocrMapping: ['serial_number'] },
      { id: 'model_number', label: 'Model Number', type: 'text', required: true, ocrMapping: ['model_number'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, ocrMapping: ['manufacturer'] },
      { id: 'voltage', label: 'Voltage', type: 'text', required: true, ocrMapping: ['voltage'] },
      { id: 'amperage', label: 'Amperage', type: 'text', required: true, ocrMapping: ['amperage'] },
      { id: 'pressure', label: 'Operating Pressure (PSI)', type: 'text', required: true, ocrMapping: ['pressure'] },
      { id: 'flow_rate', label: 'Flow Rate (GPM)', type: 'text', required: false },
      { id: 'pump_type', label: 'Pump Type', type: 'select', required: false, options: ['Centrifugal', 'Positive Displacement', 'Submersible', 'Other'] },
      { id: 'seal_condition', label: 'Seal Condition', type: 'select', required: true, options: ['Good', 'Leaking', 'Needs Replacement'] },
      { id: 'vibration_level', label: 'Vibration Level', type: 'select', required: true, options: ['Normal', 'Elevated', 'Excessive'] },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'inspection_date', label: 'Inspection Date', type: 'date', required: true },
    ],
  },
  {
    id: 'compressor',
    name: 'Compressor',
    description: 'Air compressors and compressed air systems',
    industry: 'Mechanical',
    category: 'mechanical',
    icon: '💨',
    fields: [
      { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, ocrMapping: ['serial_number'] },
      { id: 'model_number', label: 'Model Number', type: 'text', required: true, ocrMapping: ['model_number'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, ocrMapping: ['manufacturer'] },
      { id: 'voltage', label: 'Voltage', type: 'text', required: true, ocrMapping: ['voltage'] },
      { id: 'amperage', label: 'Amperage', type: 'text', required: true, ocrMapping: ['amperage'] },
      { id: 'cfm', label: 'CFM (Air Flow)', type: 'text', required: true, ocrMapping: ['cfm'] },
      { id: 'pressure', label: 'Operating Pressure (PSI)', type: 'text', required: true, ocrMapping: ['pressure'] },
      { id: 'tank_size', label: 'Tank Size (Gallons)', type: 'text', required: false },
      { id: 'oil_level', label: 'Oil Level', type: 'select', required: true, options: ['Full', 'Low', 'Empty'] },
      { id: 'air_filter_condition', label: 'Air Filter Condition', type: 'select', required: true, options: ['Clean', 'Dirty', 'Needs Replacement'] },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'inspection_date', label: 'Inspection Date', type: 'date', required: true },
    ],
  },
  {
    id: 'general-equipment',
    name: 'General Equipment',
    description: 'Generic equipment inspection template for any industrial equipment',
    industry: 'General',
    category: 'equipment',
    icon: '🔧',
    fields: [
      { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, ocrMapping: ['serial_number'] },
      { id: 'model_number', label: 'Model Number', type: 'text', required: true, ocrMapping: ['model_number'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', required: false, ocrMapping: ['manufacturer'] },
      { id: 'voltage', label: 'Voltage', type: 'text', required: false, ocrMapping: ['voltage'] },
      { id: 'amperage', label: 'Amperage', type: 'text', required: false, ocrMapping: ['amperage'] },
      { id: 'wattage', label: 'Wattage', type: 'text', required: false, ocrMapping: ['wattage'] },
      { id: 'frequency', label: 'Frequency', type: 'text', required: false, ocrMapping: ['frequency'] },
      { id: 'pressure', label: 'Pressure', type: 'text', required: false, ocrMapping: ['pressure'] },
      { id: 'equipment_type', label: 'Equipment Type', type: 'text', required: false },
      { id: 'condition', label: 'Overall Condition', type: 'select', required: true, options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'] },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'inspection_date', label: 'Inspection Date', type: 'date', required: true },
      { id: 'notes', label: 'Notes', type: 'text', required: false },
    ],
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): InspectionTemplate | undefined {
  return INDUSTRY_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by industry
 */
export function getTemplatesByIndustry(industry: string): InspectionTemplate[] {
  return INDUSTRY_TEMPLATES.filter(t => t.industry === industry);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): InspectionTemplate[] {
  return INDUSTRY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Map OCR results to template fields
 */
export function mapOCRToTemplate(
  ocrLabels: Record<string, string>,
  template: InspectionTemplate
): Record<string, string> {
  const mapped: Record<string, string> = {};
  
  for (const field of template.fields) {
    if (field.ocrMapping) {
      // Try each OCR mapping
      for (const ocrKey of field.ocrMapping) {
        if (ocrLabels[ocrKey]) {
          mapped[field.id] = ocrLabels[ocrKey];
          break; // Use first match
        }
      }
    }
  }
  
  return mapped;
}

/**
 * Get all unique industries
 */
export function getAllIndustries(): string[] {
  return Array.from(new Set(INDUSTRY_TEMPLATES.map(t => t.industry)));
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(INDUSTRY_TEMPLATES.map(t => t.category)));
}


