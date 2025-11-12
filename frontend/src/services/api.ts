import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Model {
  id: string;
  name: string;
  model_type: string;
  source_system: string;
  version?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_retrained_at?: string;
}

export interface DriftCheck {
  id: string;
  model_id: string;
  check_timestamp: string;
  drift_detected: boolean | string;  // Can be boolean or "YES"/"NO"
  ks_statistic?: number;
  ks_stat?: number;  // Alternative field name
  psi_value?: number;
  psi?: number;  // Alternative field name
  kl_divergence?: number;
  rmse?: number;
  mae?: number;
  r_squared?: number;
  details?: any;
  created_at?: string;
}

export interface Prediction {
  id: string;
  model_id: string;
  molecule_id: string;
  predicted_value: number;
  confidence_score?: number;
  metadata?: any;
  created_at: string;
}

export interface ExperimentalResult {
  id: string;
  molecule_id: string;
  assay_id: string;
  measured_value: number;
  uncertainty?: number;
  metadata?: any;
  created_at: string;
}

