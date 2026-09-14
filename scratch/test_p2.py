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

print("--- [1] Doctor Login & Patient Setup ---")
doc_token = api_call("http://localhost:8000/token", "POST", {"username": "dr.walker", "password": "password123"})["access_token"]
admin_token = api_call("http://localhost:8000/token", "POST", {"username": "admin", "password": "password123"})["access_token"]

patients = api_call("http://localhost:8000/patients/", "GET", token=admin_token)
jim = next((p for p in patients if "jim" in p["name"].lower()), None)
assert jim is not None, "Patient Jim must exist"
jim_id = jim["id"]

print("\n--- [2] Prescribing Emergency Medication for Patient Jim ---")
presc_payload = {
    "patient_id": jim_id,
    "medication_name": "Furosemide",
    "dosage": "40mg IV",
    "route": "Intravenous (IV)",
    "frequency": "STAT (Immediate)",
    "duration": "1 dose",
    "instructions": "Administer IV push over 2 minutes immediately"
}
presc = api_call("http://localhost:8000/prescriptions/", "POST", presc_payload, token=doc_token)
print(f"Prescription created #{presc['id']}: {presc['medication_name']} ({presc['dosage']}) - Status: {presc.get('status')}")
assert presc["status"] == "ordered", f"Expected status 'ordered', got {presc.get('status')}"
assert presc.get("administered_at") is None

# Verify Admin triage reflects status == "ordered"
triage = api_call("http://localhost:8000/admin/emergency-triage", "GET", token=admin_token)
recent_p = next((p for p in triage["recent_prescriptions"] if p["id"] == presc["id"]), None)
assert recent_p is not None
print(f"Audit log status: {recent_p['status']}")
assert recent_p["status"] == "ordered"

print("\n--- [3] Simulating Nurse Bedside Administration (e-MAR) ---")
admin_payload = {
    "administered_by": "Nurse Jordan, RN",
    "notes": "Administered IV push over 2 minutes in left forearm IV. Patient BP 118/76, tolerated well."
}
admin_res = api_call(f"http://localhost:8000/prescriptions/{presc['id']}/administer", "POST", admin_payload, token=admin_token)
print("Administration Response:", admin_res)
assert admin_res["status"] == "administered", f"Expected status 'administered', got {admin_res['status']}"
assert admin_res["administered_by"] == "Nurse Jordan, RN"
assert admin_res["administered_at"] is not None
assert "BP 118/76" in admin_res["administration_notes"]
print(">>> PASS: Prescription successfully transitioned to 'administered' in e-MAR.")

print("\n--- [4] Verifying Closed-Loop Visibility in Triage & Prescriptions API ---")
# Check patient-specific prescriptions
pat_prescs = api_call(f"http://localhost:8000/prescriptions/?patient_id={jim_id}", "GET", token=doc_token)
verified_p = next((p for p in pat_prescs if p["id"] == presc["id"]), None)
assert verified_p is not None
print(f"Prescription query verification: Status = {verified_p['status']}, Administered by = {verified_p['administered_by']} at {verified_p['administered_at']}")
assert verified_p["status"] == "administered"
assert verified_p["administered_by"] == "Nurse Jordan, RN"

# Check triage oversight board
triage_after = api_call("http://localhost:8000/admin/emergency-triage", "GET", token=admin_token)
recent_p_after = next((p for p in triage_after["recent_prescriptions"] if p["id"] == presc["id"]), None)
assert recent_p_after is not None
print(f"Triage audit trail verified: Status = {recent_p_after['status']}, Nurse = {recent_p_after['administered_by']}")
assert recent_p_after["status"] == "administered"

print("\n=== ALL P2 e-MAR MEDICATION ADMINISTRATION TESTS PASSED SUCCESSFULLY! ===")
