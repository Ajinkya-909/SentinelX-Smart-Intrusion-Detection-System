"""
Unit tests for Preprocessing service.
Tests feature scaling and normalization.
"""

import pytest
import numpy as np

from app.services.preprocessing_service import preprocessing_service, PreprocessingService


class TestPreprocessingService:
    """Test suite for PreprocessingService"""
    
    @pytest.fixture
    def sample_data(self):
        """Create sample data for preprocessing"""
        return np.array([
            [1.0, 10.0, 100.0],
            [2.0, 20.0, 200.0],
            [3.0, 30.0, 300.0],
            [4.0, 40.0, 400.0],
            [5.0, 50.0, 500.0]
        ])
    
    def test_initialization_standard_scaler(self):
        """Test service initialization with StandardScaler"""
        service = PreprocessingService(method="StandardScaler")
        assert service.method == "StandardScaler"
        assert service.scaler is not None
    
    def test_initialization_minmax_scaler(self):
        """Test service initialization with MinMaxScaler"""
        service = PreprocessingService(method="MinMaxScaler")
        assert service.method == "MinMaxScaler"
        assert service.scaler is not None
    
    def test_fit_transform_shape(self, sample_data):
        """Test that fit_transform maintains shape"""
        service = PreprocessingService()
        scaled = service.fit_transform(sample_data)
        
        assert scaled.shape == sample_data.shape
    
    def test_fit_transform_returns_array(self, sample_data):
        """Test that fit_transform returns numpy array"""
        service = PreprocessingService()
        scaled = service.fit_transform(sample_data)
        
        assert isinstance(scaled, np.ndarray)
    
    def test_standard_scaler_output(self, sample_data):
        """Test StandardScaler output properties"""
        service = PreprocessingService(method="StandardScaler")
        scaled = service.fit_transform(sample_data)
        
        # StandardScaler should approximately center data at 0
        assert np.abs(scaled.mean(axis=0)).max() < 1e-10
        # And scale to unit variance
        assert np.abs(scaled.std(axis=0) - 1.0).max() < 1e-10
    
    def test_minmax_scaler_output(self, sample_data):
        """Test MinMaxScaler output properties"""
        service = PreprocessingService(method="MinMaxScaler")
        scaled = service.fit_transform(sample_data)
        
        # MinMaxScaler should scale to [0, 1]
        assert scaled.min() >= 0
        assert scaled.max() <= 1
    
    def test_transform_after_fit(self, sample_data):
        """Test transform method after fitting"""
        service = PreprocessingService()
        service.fit_transform(sample_data)
        
        # Transform same data again
        scaled = service.transform(sample_data)
        
        assert scaled.shape == sample_data.shape
    
    def test_nan_handling(self):
        """Test handling of NaN values"""
        data_with_nan = np.array([
            [1.0, np.nan, 100.0],
            [2.0, 20.0, 200.0],
            [3.0, 30.0, np.nan],
            [4.0, 40.0, 400.0]
        ])
        
        service = PreprocessingService()
        scaled = service.fit_transform(data_with_nan)
        
        # Should not have NaN in output
        assert not np.isnan(scaled).any()
    
    def test_inf_handling(self):
        """Test handling of Inf values"""
        data_with_inf = np.array([
            [1.0, np.inf, 100.0],
            [2.0, 20.0, 200.0],
            [3.0, 30.0, -np.inf],
            [4.0, 40.0, 400.0]
        ])
        
        service = PreprocessingService()
        scaled = service.fit_transform(data_with_inf)
        
        # Should not have Inf in output
        assert not np.isinf(scaled).any()
    
    def test_single_sample(self):
        """Test with single sample"""
        single_sample = np.array([[1.0, 2.0, 3.0]])
        
        service = PreprocessingService()
        scaled = service.fit_transform(single_sample)
        
        assert scaled.shape == (1, 3)
    
    def test_single_feature(self):
        """Test with single feature"""
        single_feature = np.array([[1.0], [2.0], [3.0], [4.0], [5.0]])
        
        service = PreprocessingService()
        scaled = service.fit_transform(single_feature)
        
        assert scaled.shape == (5, 1)
    
    def test_large_dataset(self):
        """Test with large dataset"""
        large_data = np.random.randn(1000, 50)
        
        service = PreprocessingService()
        scaled = service.fit_transform(large_data)
        
        assert scaled.shape == (1000, 50)
    
    def test_zero_variance_handling(self):
        """Test handling of zero variance features"""
        data_zero_var = np.array([
            [1.0, 5.0, 100.0],
            [2.0, 5.0, 200.0],
            [3.0, 5.0, 300.0],  # Second column has zero variance
            [4.0, 5.0, 400.0]
        ])
        
        service = PreprocessingService()
        scaled = service.fit_transform(data_zero_var)
        
        assert scaled.shape == data_zero_var.shape
    
    def test_global_service_instance(self):
        """Test that global service instance works"""
        data = np.array([
            [1.0, 10.0, 100.0],
            [2.0, 20.0, 200.0],
            [3.0, 30.0, 300.0]
        ])
        
        scaled = preprocessing_service.fit_transform(data)
        
        assert scaled.shape == data.shape
    
    def test_consistent_scaling(self, sample_data):
        """Test that scaling is consistent"""
        service1 = PreprocessingService()
        service2 = PreprocessingService()
        
        scaled1 = service1.fit_transform(sample_data)
        scaled2 = service2.fit_transform(sample_data)
        
        # Both should produce similar scaled values
        assert np.allclose(scaled1, scaled2)
    
    def test_negative_values(self):
        """Test handling of negative values"""
        data_negative = np.array([
            [-5.0, -50.0, -500.0],
            [-3.0, -30.0, -300.0],
            [0.0, 0.0, 0.0],
            [3.0, 30.0, 300.0],
            [5.0, 50.0, 500.0]
        ])
        
        service = PreprocessingService()
        scaled = service.fit_transform(data_negative)
        
        assert not np.isnan(scaled).any()
        assert not np.isinf(scaled).any()
    
    def test_very_small_values(self):
        """Test handling of very small values"""
        data_small = np.array([
            [1e-10, 1e-10, 1e-10],
            [2e-10, 2e-10, 2e-10],
            [3e-10, 3e-10, 3e-10]
        ])
        
        service = PreprocessingService()
        scaled = service.fit_transform(data_small)
        
        assert scaled.shape == data_small.shape
    
    def test_very_large_values(self):
        """Test handling of very large values"""
        data_large = np.array([
            [1e10, 1e10, 1e10],
            [2e10, 2e10, 2e10],
            [3e10, 3e10, 3e10]
        ])
        
        service = PreprocessingService()
        scaled = service.fit_transform(data_large)
        
        assert not np.isnan(scaled).any()
        assert not np.isinf(scaled).any()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
