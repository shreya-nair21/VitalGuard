import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
from pathlib import Path

class DataPreprocessor:
    """
    Preprocesses patient vital signs data for ML model training
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.consciousness_encoder = LabelEncoder()
        self.feature_names = None
        
    def load_data(self, filepath):
        """Load data from CSV"""
        df = pd.read_csv(filepath)
        print(f"Loaded {len(df):,} records from {filepath}")
        return df
    
    def create_features(self, df):
        """
        Create additional features from vital signs
        """
        df = df.copy()
        
        # Vital sign ratios and combinations
        df['pulse_pressure'] = df['systolic_bp'] - (df['systolic_bp'] * 0.4)  # Approximation
        df['shock_index'] = df['heart_rate'] / df['systolic_bp']
        
        # Temperature categories
        df['hypothermia'] = (df['temperature'] < 36.0).astype(int)
        df['hyperthermia'] = (df['temperature'] > 38.0).astype(int)
        
        # Oxygen saturation categories
        df['hypoxemia'] = (df['spo2'] < 94).astype(int)
        
        # Heart rate categories
        df['tachycardia'] = (df['heart_rate'] > 100).astype(int)
        df['bradycardia'] = (df['heart_rate'] < 60).astype(int)
        
        # Blood pressure categories
        df['hypotension'] = (df['systolic_bp'] < 90).astype(int)
        df['hypertension'] = (df['systolic_bp'] > 140).astype(int)
        
        # Respiratory categories
        df['tachypnea'] = (df['respiratory_rate'] > 20).astype(int)
        df['bradypnea'] = (df['respiratory_rate'] < 12).astype(int)
        
        return df
    
    def encode_categorical(self, df, fit=True):
        """Encode categorical variables"""
        df = df.copy()
        
        # Encode consciousness level
        # Alert=0, Voice=1, Pain=2, Unresponsive=3
        encoded_col = []
        for val in df['consciousness']:
            try:
                # Try to transform with existing fitted classes
                transformed = self.consciousness_encoder.transform([val])[0]
                encoded_col.append(transformed)
            except (ValueError, KeyError):
                # Fallback for unseen labels like 'Confusion' if not pre-mapped
                # Ensure it defaults to Alert (0) or similar to prevent crash
                try:
                    alert_idx = list(self.consciousness_encoder.classes_).index('Alert')
                    encoded_col.append(alert_idx)
                except ValueError:
                    encoded_col.append(0)
                    
        df['consciousness_encoded'] = encoded_col
        
        # Gender encoding
        df['gender_encoded'] = df['gender'].map({'M': 1, 'F': 0})
        
        return df
    
    def prepare_features_target(self, df):
        """
        Separate features and target variable
        """
        # Feature columns
        feature_cols = [
            'age', 'gender_encoded',
            'respiratory_rate', 'spo2', 'systolic_bp', 'heart_rate', 'temperature',
            'consciousness_encoded', 'news_score',
            'pulse_pressure', 'shock_index',
            'hypothermia', 'hyperthermia', 'hypoxemia',
            'tachycardia', 'bradycardia', 'hypotension', 'hypertension',
            'tachypnea', 'bradypnea'
        ]
        
        X = df[feature_cols]
        y = df['deterioration']
        
        self.feature_names = feature_cols
        
        return X, y
    
    def scale_features(self, X, fit=True):
        """Scale numerical features"""
        if fit:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)
        
        return pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
    
    def preprocess_pipeline(self, filepath, test_size=0.2, val_size=0.15, random_state=42):
        """
        Complete preprocessing pipeline
        """
        print("\n" + "="*70)
        print("DATA PREPROCESSING PIPELINE")
        print("="*70)
        
        # Load data
        df = self.load_data(filepath)
        
        # Create features
        print("\n1. Creating engineered features...")
        df = self.create_features(df)
        
        # Encode categorical variables
        print("2. Encoding categorical variables...")
        df = self.encode_categorical(df, fit=True)
        
        # Prepare features and target
        print("3. Preparing features and target...")
        X, y = self.prepare_features_target(df)
        
        print(f"   Features shape: {X.shape}")
        print(f"   Target shape: {y.shape}")
        print(f"   Class distribution:")
        print(f"      Stable: {(y==0).sum():,} ({(y==0).sum()/len(y)*100:.1f}%)")
        print(f"      Deteriorating: {(y==1).sum():,} ({(y==1).sum()/len(y)*100:.1f}%)")
        
        # Split data: train, validation, test
        print("\n4. Splitting data...")
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        val_size_adjusted = val_size / (1 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=val_size_adjusted, 
            random_state=random_state, stratify=y_temp
        )
        
        print(f"   Train set: {X_train.shape[0]:,} samples ({X_train.shape[0]/len(X)*100:.1f}%)")
        print(f"   Validation set: {X_val.shape[0]:,} samples ({X_val.shape[0]/len(X)*100:.1f}%)")
        print(f"   Test set: {X_test.shape[0]:,} samples ({X_test.shape[0]/len(X)*100:.1f}%)")
        
        # Scale features
        print("\n5. Scaling features...")
        X_train_scaled = self.scale_features(X_train, fit=True)
        X_val_scaled = self.scale_features(X_val, fit=False)
        X_test_scaled = self.scale_features(X_test, fit=False)
        
        # Save preprocessor
        print("\n6. Saving preprocessor...")
        Path('ml/models').mkdir(parents=True, exist_ok=True)
        joblib.dump(self, 'ml/models/preprocessor.joblib')
        print("   ✓ Saved preprocessor to ml/models/preprocessor.joblib")
        
        print("\n" + "="*70)
        print(" PREPROCESSING COMPLETE!")
        print("="*70)
        
        return {
            'X_train': X_train_scaled,
            'X_val': X_val_scaled,
            'X_test': X_test_scaled,
            'y_train': y_train,
            'y_val': y_val,
            'y_test': y_test,
            'feature_names': self.feature_names
        }

if __name__ == "__main__":
    # Run preprocessing
    preprocessor = DataPreprocessor()
    # Use the large dataset from the root data folder
    input_path = 'data/patient_vitals.csv'
    if not Path(input_path).exists():
        # Fallback to relative path if running from root
        input_path = '../data/patient_vitals.csv'
        if not Path(input_path).exists():
            # Fallback to absolute path or original if not found
            input_path = 'ml/data/patient_vitals.csv'
            
    print(f"Preprocessing data from: {input_path}")
    data = preprocessor.preprocess_pipeline(input_path)
    
    # Save processed data
    print("\n Saving processed datasets...")
    # Save to ml/data for training script consistency
    output_path = 'ml/data/processed_data.joblib'
    joblib.dump(data, output_path)
    print(f"✓ Saved to {output_path}")
    
    print("\n Next step: python ml/train_model.py")