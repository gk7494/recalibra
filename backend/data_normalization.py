"""
Enhanced Pandas pipelines for data normalization
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from sklearn.preprocessing import StandardScaler, RobustScaler
import logging

logger = logging.getLogger(__name__)


class DataNormalizer:
    """Pandas-based data normalization pipeline"""
    
    def __init__(self):
        self.scalers = {}
        self.normalization_stats = {}
    
    def normalize_molecule_data(
        self,
        df: pd.DataFrame,
        columns: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Normalize molecule data from Benchling/MOE/LIMS
        
        Args:
            df: Input DataFrame
            columns: Columns to normalize (defaults to numeric columns)
        
        Returns:
            Normalized DataFrame
        """
        df = df.copy()
        
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        for col in columns:
            if col in df.columns:
                # Handle missing values
                df[col] = df[col].fillna(df[col].median())
                
                # Normalize using robust scaler (handles outliers better)
                if col not in self.scalers:
                    self.scalers[col] = RobustScaler()
                    df[col] = self.scalers[col].fit_transform(df[[col]]).flatten()
                else:
                    df[col] = self.scalers[col].transform(df[[col]]).flatten()
        
        return df
    
    def normalize_assay_results(
        self,
        df: pd.DataFrame,
        value_column: str = "measured_value",
        group_by: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Normalize experimental results by assay version, reagent batch, etc.
        
        Args:
            df: Input DataFrame with experimental results
            value_column: Column containing measured values
            group_by: Columns to group by for normalization (e.g., ['assay_version', 'reagent_batch'])
        
        Returns:
            Normalized DataFrame
        """
        df = df.copy()
        
        if group_by and all(col in df.columns for col in group_by):
            # Normalize within groups
            df['normalized_value'] = df.groupby(group_by)[value_column].transform(
                lambda x: (x - x.mean()) / x.std() if x.std() > 0 else x - x.mean()
            )
        else:
            # Global normalization
            mean_val = df[value_column].mean()
            std_val = df[value_column].std()
            if std_val > 0:
                df['normalized_value'] = (df[value_column] - mean_val) / std_val
            else:
                df['normalized_value'] = df[value_column] - mean_val
        
        return df
    
    def match_predictions_to_results(
        self,
        predictions_df: pd.DataFrame,
        results_df: pd.DataFrame,
        match_keys: List[str] = ['molecule_id', 'assay_version', 'reagent_batch']
    ) -> pd.DataFrame:
        """
        Match model predictions to experimental results using multiple keys
        
        Args:
            predictions_df: DataFrame with predictions
            results_df: DataFrame with experimental results
            match_keys: Columns to use for matching
        
        Returns:
            Merged DataFrame with matched pairs
        """
        # Ensure all match keys exist
        pred_keys = [k for k in match_keys if k in predictions_df.columns]
        result_keys = [k for k in match_keys if k in results_df.columns]
        
        if not pred_keys or not result_keys:
            logger.warning("Missing match keys, using molecule_id only")
            pred_keys = ['molecule_id'] if 'molecule_id' in predictions_df.columns else []
            result_keys = ['molecule_id'] if 'molecule_id' in results_df.columns else []
        
        # Merge on matching keys
        merged = pd.merge(
            predictions_df,
            results_df,
            left_on=pred_keys,
            right_on=result_keys,
            how='inner',
            suffixes=('_pred', '_result')
        )
        
        return merged
    
    def create_longitudinal_dataset(
        self,
        df: pd.DataFrame,
        time_column: str = "created_at",
        group_by: List[str] = ['molecule_id', 'assay_version']
    ) -> pd.DataFrame:
        """
        Create longitudinal dataset for drift tracking
        
        Args:
            df: Input DataFrame
            time_column: Column with timestamp
            group_by: Columns to group by for longitudinal tracking
        
        Returns:
            DataFrame sorted by time with grouping
        """
        df = df.copy()
        
        # Convert time column to datetime
        if time_column in df.columns:
            df[time_column] = pd.to_datetime(df[time_column])
            df = df.sort_values(time_column)
        
        # Add time-based features
        if group_by and all(col in df.columns for col in group_by):
            df['time_since_first'] = df.groupby(group_by)[time_column].transform(
                lambda x: (x - x.min()).dt.total_seconds() / 86400  # days
            )
            df['observation_number'] = df.groupby(group_by).cumcount() + 1
        
        return df
    
    def compute_drift_features(
        self,
        df: pd.DataFrame,
        value_column: str = "measured_value",
        window_size: int = 100
    ) -> pd.DataFrame:
        """
        Compute rolling statistics for drift detection
        
        Args:
            df: Input DataFrame
            value_column: Column to analyze
            window_size: Rolling window size
        
        Returns:
            DataFrame with drift features
        """
        df = df.copy()
        
        if value_column in df.columns:
            # Rolling statistics
            df['rolling_mean'] = df[value_column].rolling(window=window_size, min_periods=1).mean()
            df['rolling_std'] = df[value_column].rolling(window=window_size, min_periods=1).std()
            df['rolling_median'] = df[value_column].rolling(window=window_size, min_periods=1).median()
            
            # Change from baseline
            baseline = df[value_column].iloc[:window_size].mean()
            df['deviation_from_baseline'] = df[value_column] - baseline
            df['percent_change'] = (df['deviation_from_baseline'] / baseline * 100) if baseline != 0 else 0
        
        return df


# Global instance
data_normalizer = DataNormalizer()








