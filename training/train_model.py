# train_model.py
import os
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.utils import to_categorical
from sklearn.metrics import classification_report
from sklearn.utils.class_weight import compute_class_weight

DATA_PATH = "../data/training_data.csv"   # relative to training/
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Load
df = pd.read_csv(DATA_PATH)
print("Columns:", df.columns.tolist())
print("Sample rows:\n", df.head())

# 2. Inspect how symptoms are stored
if 'symptoms' in df.columns:
    # case: symptoms text, e.g., "fever,cough,headache"
    print("Detected 'symptoms' text column.")
    # build vocabulary of symptom tokens
    df['symptoms_list'] = df['symptoms'].astype(str).str.lower().str.replace(';', ',').str.split(',')
    # strip whitespace
    df['symptoms_list'] = df['symptoms_list'].apply(lambda arr: [s.strip() for s in arr if s and len(s.strip())>0])
    symptom_set = sorted({s for arr in df['symptoms_list'] for s in arr})
    print(f"Detected {len(symptom_set)} unique symptoms.")
    symptom_list = symptom_set
    # create multi-hot encoding
    def encode_row(symptoms):
        vec = np.zeros(len(symptom_list), dtype=int)
        for s in symptoms:
            if s in symptom_list:
                vec[symptom_list.index(s)] = 1
        return vec
    X = np.vstack(df['symptoms_list'].apply(encode_row).values)
elif any(col.lower() in ['fever','headache','cough','nausea'] for col in df.columns):
    # case: many symptom columns (boolean)
    print("Detected symptom columns per feature.")
    # choose columns that look like symptoms (heuristic: non-label, not report)
    # assume 'disease' is the label column
    label_col = 'disease' if 'disease' in df.columns else df.columns[-1]
    symptom_cols = [c for c in df.columns if c != label_col]
    print("Using symptom columns:", symptom_cols[:20], "...")
    symptom_list = symptom_cols
    X = df[symptom_cols].fillna(0).astype(int).values
else:
    raise ValueError("Could not find symptom column. Please ensure CSV has 'symptoms' text column or symptom boolean columns.")


# -------------------------
# Handle very rare labels by mapping them to 'other'
# (Insert this BEFORE "# 3. Labels")
# -------------------------
# choose label column name used later
label_col = 'prognosis' if 'prognosis' in df.columns else ('disease' if 'disease' in df.columns else df.columns[-1])

# compute counts
label_counts = df[label_col].astype(str).str.strip().value_counts()
rare_threshold = 2  # minimum samples required to keep label separate
rare_labels = label_counts[label_counts < rare_threshold].index.tolist()

if len(rare_labels) > 0:
    print(f"Mapping {len(rare_labels)} rare labels to 'other' (threshold < {rare_threshold}):", rare_labels)
    # create a mapped column for labels
    df['_mapped_label'] = df[label_col].astype(str).str.strip().apply(lambda x: 'other' if x in rare_labels else x)
    used_label_col = '_mapped_label'
else:
    print("No rare labels found.")
    used_label_col = label_col

# then continue to label encoding using used_label_col instead of label_col
# -------------------------


## 3. Labels
y_raw = df[used_label_col].astype(str).str.strip()
le = LabelEncoder()
y_enc = le.fit_transform(y_raw)
class_names = le.classes_.tolist()
print("Classes detected:", len(class_names))

# 4. Save symptom list and labels mapping for client usage
with open(os.path.join(OUTPUT_DIR, 'symptoms.json'), 'w', encoding='utf-8') as f:
    json.dump(symptom_list, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUTPUT_DIR, 'labels.json'), 'w', encoding='utf-8') as f:
    json.dump(class_names, f, ensure_ascii=False, indent=2)

# just before train_test_split
import collections
print("Label column:", label_col)
label_counts = pd.Series(y_raw).value_counts()
print("Label counts (top 20):\n", label_counts.head(20))
rare = label_counts[label_counts < 2]
print("Rare labels (count < 2):", rare.to_dict())

# 5. Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.15, random_state=42)

# 6. Build a simple Keras model (multi-class classification)
num_features = X_train.shape[1]
num_classes = len(class_names)
print("num_features:", num_features, "num_classes:", num_classes)

y_train_cat = to_categorical(y_train, num_classes=num_classes)
y_test_cat = to_categorical(y_test, num_classes=num_classes)

model = Sequential([
    Dense(256, input_shape=(num_features,), activation='relu'),
    Dropout(0.3),
    Dense(128, activation='relu'),
    Dropout(0.2),
    Dense(num_classes, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.summary()

from sklearn.utils.class_weight import compute_class_weight
class_weights = compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
class_weight_dict = {i: w for i, w in enumerate(class_weights, start=0)}
# Note: if enumerate start must match label integers; if classes aren't 0..n-1 adjust accordingly


# 7. Train
history = model.fit(X_train, y_train_cat, validation_split=0.1, epochs=25, batch_size=32, class_weight=class_weight_dict)

# 8. Evaluate
loss, acc = model.evaluate(X_test, y_test_cat, verbose=0)
print(f"Test accuracy: {acc:.4f}")

# predictions
y_pred = model.predict(X_test)
y_pred_labels = np.argmax(y_pred, axis=1)

# --- start: robust classification report for only present classes ---
import numpy as np

# which labels appear in either true or predicted
present_labels = np.unique(np.concatenate([y_test, y_pred_labels]))
present_labels.sort()  # ascending order

# matching human-readable names for those labels
present_names = [class_names[i] for i in present_labels]

# debug prints (optional)
print("Present labels (integers):", present_labels)
print("Present label names:", present_names)

# print the report only for present labels
print("Classification report (for labels present in test/pred):")
print(classification_report(y_test, y_pred_labels,
                            labels=present_labels,
                            target_names=present_names,
                            zero_division=0))
# --- end: robust classification report ---
print("Present labels in test:", np.unique(y_test))
print("Present labels in pred:", np.unique(y_pred_labels))


# 9. Save model (Keras HDF5) and artifacts
model_h5 = os.path.join(OUTPUT_DIR, "model.h5")
model.save(model_h5)
print(f"Saved Keras model to {model_h5}")

print("Saved artifacts to", OUTPUT_DIR)
