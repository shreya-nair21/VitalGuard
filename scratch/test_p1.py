import urllib.request
import json

def api_call(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} for {url}: {error_msg}")
        raise

print("--- [1] Admin Login & Doctor Reset ---")
admin_token = api_call("http://localhost:8000/token", "POST", {"username": "admin", "password": "password123"})["access_token"]

for doc_user in ["dr.walker", "dr.smith", "dr.lewis"]:
    try:
        dtok = api_call("http://localhost:8000/token", "POST", {"username": doc_user, "password": "password123"})["access_token"]
        api_call("http://localhost:8000/doctor/availability", "PUT", {"availability": "available"}, token=dtok)
    except Exception as ex:
        print(f"Could not reset {doc_user}: {ex}")

patients = api_call("http://localhost:8000/patients/", "GET", token=admin_token)
jim = next((p for p in patients if "jim" in p["name"].lower()), None)
assert jim is not None, "Patient Jim must exist"
jim_id = jim["id"]

# Clean start
stable_vitals = {
    "patient_id": jim_id,
    "heart_rate": 72.0,
    "systolic_bp": 120.0,
    "respiratory_rate": 14.0,
    "temperature": 36.8,
    "spo2": 99.0,
    "consciousness": "Alert",
    "news_score": 0.0
}
api_call("http://localhost:8000/assessments/", "POST", stable_vitals, token=admin_token)

print("\n--- [2] Generating Critical Dispatch for Patient Jim ---")
critical_vitals = {
    "patient_id": jim_id,
    "heart_rate": 145.0,
    "systolic_bp": 72.0,
    "respiratory_rate": 34.0,
    "temperature": 39.4,
    "spo2": 82.0,
    "consciousness": "Pain",
    "news_score": 12.0
}
res_crit = api_call("http://localhost:8000/assessments/", "POST", critical_vitals, token=admin_token)

triage = api_call("http://localhost:8000/admin/emergency-triage", "GET", token=admin_token)
jim_card = next((cp for cp in triage["critical_patients"] if cp["id"] == jim_id), None)
assert jim_card is not None, "Jim should appear in critical_patients"
initial_doc_id = jim_card["doctor_id"]
initial_doc_name = jim_card["doctor_name"]
assignment_id = jim_card["assignment_id"]
print(f"Initial assignment: Patient Jim assigned to {initial_doc_name} (ID: {initial_doc_id}), Assignment #{assignment_id}")
assert assignment_id is not None, "assignment_id must be populated in critical_patients"

# Find an available alternative doctor
all_doctors = triage["doctors_status"]
target_doctor = next((d for d in all_doctors if d["id"] != initial_doc_id), None)
assert target_doctor is not None, "Must have an alternative doctor to reassign to"
print(f"Target doctor for manual admin override: {target_doctor['full_name']} (ID: {target_doctor['id']})")

print("\n--- [3] Testing Admin Manual Reassignment Override ---")
reassign_payload = {
    "patient_id": jim_id,
    "doctor_id": target_doctor["id"],
    "assignment_id": assignment_id
}
reassign_res = api_call("http://localhost:8000/admin/emergency-triage/reassign", "POST", reassign_payload, token=admin_token)
print("Reassign Response:", reassign_res)
assert reassign_res["doctor_id"] == target_doctor["id"]
assert reassign_res["status"] == "pending"

# Verify triage board reflects updated doctor and reset timer
triage_updated = api_call("http://localhost:8000/admin/emergency-triage", "GET", token=admin_token)
jim_updated = next((cp for cp in triage_updated["critical_patients"] if cp["id"] == jim_id), None)
assert jim_updated is not None
print(f"Updated triage record: Doctor = {jim_updated['doctor_name']}, Status = {jim_updated['assignment_status']}, Seconds Left = {jim_updated['seconds_remaining']}s")
assert jim_updated["doctor_id"] == target_doctor["id"], f"Expected doctor {target_doctor['id']}, got {jim_updated['doctor_id']}"
assert jim_updated["assignment_status"] == "pending", f"Expected pending status, got {jim_updated['assignment_status']}"
assert jim_updated["seconds_remaining"] is not None and jim_updated["seconds_remaining"] >= 50, f"Expected fresh countdown (~60s), got {jim_updated['seconds_remaining']}s"
print(">>> PASS: Admin manual reassignment override verified! Patient reallocated and countdown reset.")

print("\n--- [4] Testing Non-Admin Authorization Guard ---")
doc_token = api_call("http://localhost:8000/token", "POST", {"username": "dr.walker", "password": "password123"})["access_token"]
try:
    api_call("http://localhost:8000/admin/emergency-triage/reassign", "POST", reassign_payload, token=doc_token)
    assert False, "Non-admin should have received HTTP 403 Forbidden!"
except urllib.error.HTTPError as e:
    assert e.code == 403, f"Expected 403, got {e.code}"
    print(">>> PASS: Non-admin correctly blocked with HTTP 403 Forbidden.")

# Cleanup
api_call("http://localhost:8000/assessments/", "POST", stable_vitals, token=admin_token)
print("\n=== ALL P1 CLINICAL RESPONSIVENESS & REASSIGNMENT TESTS PASSED! ===")
