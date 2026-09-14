import pandas as pd
import numpy as np
import joblib
from pathlib import Path
import os
import sys

# Add current directory to path to allow importing preprocess
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from preprocess import DataPreprocessor
except ImportError:
    # If running from pycharm/terminal where pythonpath might be different
    from ml.preprocess import DataPreprocessor

class VitalGuardPredictor:
    """
    Handles loading the model and making predictions for single patients
    """
    
    def __init__(self, models_dir='ml/models'):
        self.models_dir = Path(models_dir)
        self.model = None
        self.preprocessor = None
        self.feature_names = None
        self._load_artifacts()
        
    def _load_artifacts(self):
        """Load the saved model and preprocessor"""
        try:
            print(f"Loading artifacts from {self.models_dir}...")
            
            # CRITICAL FIX: Inject DataPreprocessor into __main__ 
            # This handles cases where the object was pickled by a script running as __main__
            import __main__
            if not hasattr(__main__, "DataPreprocessor"):
                try:
                    from .preprocess import DataPreprocessor
                except ImportError:
                     from ml.preprocess import DataPreprocessor
                setattr(__main__, "DataPreprocessor", DataPreprocessor)
            
            # Load basic artifacts
            self.model = joblib.load(self.models_dir / 'best_model.joblib')
            self.preprocessor = joblib.load(self.models_dir / 'preprocessor.joblib')
            
            # Try to load results to get metadata/thresholds if needed
            try:
                self.results = joblib.load(self.models_dir / 'test_results.joblib')
            except:
                print("Warning: Could not load test_results.joblib")
                
            print("[OK] Model and preprocessor loaded successfully")
            
        except Exception as e:
            print(f"Error loading artifacts: {e}")
            # Do not raise, just let it be None so API can still start
            # raise
            
    def _calculate_news_score(self, vitals):
        """
        Calculate NEWS (National Early Warning Score)
        This is a standard medical scoring system
        """
        score = 0
        
        # Respiratory Rate
        rr = vitals.get('respiratory_rate', 20)
        if rr <= 8 or rr >= 25: score += 3
        elif rr >= 21: score += 2
        elif rr >= 12: score += 0
        elif rr >= 9: score += 1
        
        # SpO2 (Oxygen Saturation)
        spo2 = vitals.get('spo2', 98)
        if spo2 <= 91: score += 3
        elif spo2 <= 93: score += 2
        elif spo2 <= 95: score += 1
        else: score += 0
        
        # Temperature
        temp = vitals.get('temperature', 37.0)
        if temp <= 35.0 or temp >= 39.1: score += 3
        elif temp >= 38.1: score += 1
        elif temp <= 36.0: score += 1
        else: score += 0
        
        # Systolic BP
        sbp = vitals.get('systolic_bp', 120)
        if sbp <= 90 or sbp >= 220: score += 3
        elif sbp <= 100: score += 2
        elif sbp <= 110: score += 1
        else: score += 0
        
        # Heart Rate
        hr = vitals.get('heart_rate', 75)
        if hr <= 40 or hr >= 131: score += 3
        elif hr >= 111: score += 2
        elif hr <= 50 or hr >= 91: score += 1
        else: score += 0
        
        cons = vitals.get('consciousness', 'Alert')
        if isinstance(cons, str):
            # 'Confusion' is a high-risk state in NEWS2, worth 3 points
            if cons.lower() != 'alert' or cons.lower() == 'confusion': 
                score += 3
        elif cons > 0: score += 3
            
        return score

    def predict(self, vitals_dict):
        """
        Predict health risk for a single patient
        
        Args:
            vitals_dict (dict): Dictionary containing patient vitals
                Required keys: heart_rate, systolic_bp, spo2, temperature, respiratory_rate
                Optional keys: age, gender (M/F), consciousness (Alert/Voice/Pain/Unresponsive)
        
        Returns:
            dict: Prediction results
        """
        # 1. Prepare input dataframe
        try:
            # Add defaults if missing
            defaults = {
                'age': 50,
                'gender': 'M',
                'consciousness': 'Alert',
                'heart_rate': 75,
                'systolic_bp': 120,
                'spo2': 98,
                'temperature': 37.0,
                'respiratory_rate': 16
            }
            
            # Sanitize consciousness labels
            # 'Confusion' is not in the training set (LabelEncoder classes)
            # We map it to 'Voice' to prevent crash while maintaining high-risk signal
            raw_cons = vitals_dict.get('consciousness', defaults['consciousness'])
            if raw_cons.lower() == 'confusion':
                sanitized_cons = 'Voice'
            else:
                sanitized_cons = raw_cons

            data = {k: [vitals_dict.get(k, defaults[k])] for k in defaults.keys()}
            data['consciousness'] = [sanitized_cons]
            
            # Calculate NEWS score if not provided
            if 'news_score' not in vitals_dict:
                data['news_score'] = [self._calculate_news_score(vitals_dict)]
            else:
                data['news_score'] = [vitals_dict['news_score']]
                
            df = pd.DataFrame(data)
            
            # 2. Engineering features (same as training)
            # Create a temporary dataframe with all columns needed for create_features
            # Note: create_features expects the raw dataframe structure
            
            # Apply feature engineering
            df_enriched = self.preprocessor.create_features(df)
            
            # 3. Categorical encoding
            df_encoded = self.preprocessor.encode_categorical(df_enriched, fit=False)
            
            # 4. Prepare feature vector (select columns expected by model)
            # We need to manually construct the feature vector based on names if available
            # or rely on the preprocessor's stored feature names
            
            if self.preprocessor.feature_names:
                X = df_encoded[self.preprocessor.feature_names]
            else:
                # Fallback list if not saved
                feature_cols = [
                    'age', 'gender_encoded',
                    'respiratory_rate', 'spo2', 'systolic_bp', 'heart_rate', 'temperature',
                    'consciousness_encoded', 'news_score',
                    'pulse_pressure', 'shock_index',
                    'hypothermia', 'hyperthermia', 'hypoxemia',
                    'tachycardia', 'bradycardia', 'hypotension', 'hypertension',
                    'tachypnea', 'bradypnea'
                ]
                X = df_encoded[feature_cols]
            
            # 5. Scale features
            X_scaled = self.preprocessor.scale_features(X, fit=False)
            
            # 6. Predict
            probability = self.model.predict_proba(X_scaled)[0][1]
            prediction = self.model.predict(X_scaled)[0]
            
            # 7. Format result (4-tier categorization based on probability)
            if probability >= 0.75:
                risk_level = "Critical"
            elif probability >= 0.50:
                risk_level = "High Risk"
            elif probability >= 0.25:
                risk_level = "Moderate"
            else:
                risk_level = "Stable"
            
            # Detailed analysis text
            reasons = []
            if data['news_score'][0] >= 5: reasons.append(f"High NEWS Score ({data['news_score'][0]})")
            if data['spo2'][0] < 94: reasons.append(f"Low Oxygen ({data['spo2'][0]}%)")
            if data['systolic_bp'][0] < 90: reasons.append(f"Hypotension ({data['systolic_bp'][0]} mmHg)")
            if data['heart_rate'][0] > 100: reasons.append(f"Tachycardia ({data['heart_rate'][0]} bpm)")
            
            analysis = f"Patient is {risk_level} (Prob: {probability:.1%}). "
            if reasons:
                analysis += "Key factors: " + ", ".join(reasons)
            
            return {
                'prediction': int(prediction),
                'risk_level': risk_level,
                'probability': float(probability),
                'news_score': int(data['news_score'][0]),
                'analysis': analysis,
                'timestamp': pd.Timestamp.now().isoformat()
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'risk_level': 'Error',
                'probability': 0.0
            }

if __name__ == "__main__":
    # Test run
    print("Testing Risk Predictor...")
    predictor = VitalGuardPredictor()
    
    # 1. Normal patient
    sample_normal = {
        'age': 45, 'gender': 'M', 'heart_rate': 72, 'systolic_bp': 120,
        'spo2': 98, 'temperature': 36.8, 'respiratory_rate': 14
    }
    print(f"\nNormal Patient: {predictor.predict(sample_normal)}")
    
    # 2. Critical patient (Sepsis-like)
    sample_critical = {
        'age': 65, 'gender': 'F', 'heart_rate': 115, 'systolic_bp': 88,
        'spo2': 92, 'temperature': 38.5, 'respiratory_rate': 24,
        'consciousness': 'Voice'
    }
    print(f"\nCritical Patient: {predictor.predict(sample_critical)}")
