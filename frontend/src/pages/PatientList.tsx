import { useState, useEffect } from 'react';
import { Search, X, UserPlus, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPatients, createPatient, updatePatient, deletePatient, getPatientHistory, getNextAllotment, type Patient, type NextAllotment } from '../services/api';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { RiskBadge } from '../utils/riskBadge';
import { useAuth } from '../context/AuthContext';

// Zod Schema (Healthcare workers only fill Name, Age, Gender)
const patientSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(0, "Age must be >= 0").max(120, "Please enter a valid age under 120"),
  gender: z.enum(["M", "F"]),
  mrn: z.string().optional(),
  room_number: z.string().optional()
});
type PatientFormValues = z.infer<typeof patientSchema>;
// Subcomponent to load patient's latest risk status badge
const PatientStatusBadge = ({ patientId }: { patientId: number }) => {
  const [latest, setLatest] = useState<{ risk_level: string; prediction_prob: number } | null>(null);

  useEffect(() => {
    getPatientHistory(patientId).then(history => {
      if (history && history.length > 0) {
        setLatest(history[0]);
      }
    }).catch(() => {});
  }, [patientId]);

  if (!latest) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>Pending</span>;
  }

  return <RiskBadge probability={latest.prediction_prob} riskLevel={latest.risk_level} />;
};

const PatientList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nextAllotment, setNextAllotment] = useState<NextAllotment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: { gender: 'M' }
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      const sorted = [...data].sort((a, b) => b.id - a.id);
      setPatients(sorted);
    } catch (error) {
      toast.error("Failed to load patient records");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = async () => {
    setEditMode(false);
    setSelectedPatient(null);
    reset({ name: '', age: undefined, gender: 'M' });
    setShowForm(true);
    try {
      const info = await getNextAllotment();
      setNextAllotment(info);
    } catch (err) {
      console.error("Failed to load next allotment info", err);
    }
  };

  const openEditForm = (patient: Patient) => {
    setEditMode(true);
    setSelectedPatient(patient);
    reset({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      mrn: patient.mrn,
      room_number: patient.room_number
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this patient? All their assessments will be lost.")) return;
    try {
      await deletePatient(id);
      setPatients(patients.filter(p => p.id !== id));
      toast.success("Patient successfully deleted (Room freed up)");
    } catch (error) {
      toast.error("Failed to delete patient");
    }
  };

  const onSubmitForm = async (data: any) => {
    try {
      const payload: any = {
        name: data.name,
        age: Number(data.age),
        gender: data.gender as 'M' | 'F'
      };

      if (editMode && data.id) {
        if (data.mrn) payload.mrn = data.mrn;
        if (data.room_number) payload.room_number = data.room_number;
        await updatePatient(data.id, payload);
        toast.success("Patient updated successfully");
      } else {
        await createPatient(payload);
        toast.success("New patient registered and room allotted automatically");
      }
      
      await fetchPatients();
      setShowForm(false);
    } catch (error) {
      toast.error(`Failed to ${editMode ? 'update' : 'create'} patient`);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().includes(searchTerm) ||
    (p.room_number && p.room_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: '1600px', margin: '0 auto' }}
    >
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Patient Records</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isAdmin ? 'Manage and view patient status across all departments.' : 'Directory of admitted hospital patients and their telemetry records.'}
          </p>
        </div>
        {isAdmin && (
          <button 
              className="btn btn-primary" 
              onClick={openCreateForm}
              style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600,
                  borderRadius: '999px', boxShadow: 'var(--shadow)'
              }}
          >
            <UserPlus size={18} />
            Add New Patient
          </button>
        )}
      </div>

      {showForm && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card" 
              style={{ width: '400px', maxWidth: '90%', borderRadius: '16px', backgroundColor: 'var(--surface)' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {editMode ? 'Edit Patient' : 'Add New Patient'}
                    </h3>
                    <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmitForm)}>
                    {!editMode ? (
                        <div style={{
                            padding: '0.875rem 1rem',
                            backgroundColor: 'rgba(14, 165, 233, 0.08)',
                            border: '1px solid rgba(14, 165, 233, 0.25)',
                            borderRadius: '12px',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>Auto-Allotted Patient ID</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    #{nextAllotment ? nextAllotment.next_id : '...'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>Assigned Room</div>
                                <span style={{ 
                                    display: 'inline-block',
                                    padding: '0.25rem 0.65rem',
                                    backgroundColor: '#4338ca',
                                    color: '#fff',
                                    borderRadius: '999px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700
                                }}>
                                    {nextAllotment ? `Room ${nextAllotment.next_room}` : 'Allotting...'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem'
                        }}>
                            <span>Patient ID: <strong style={{ color: 'var(--text-main)' }}>#{selectedPatient?.id}</strong></span>
                            <span>Assigned Room: <strong style={{ color: 'var(--text-main)' }}>Room {selectedPatient?.room_number || 'N/A'}</strong></span>
                        </div>
                    )}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Full Name</label>
                        <input 
                            type="text" className="input-field" 
                            {...register("name")}
                            placeholder="e.g. Sarah Jenkins"
                        />
                        {errors.name && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.name.message}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Age</label>
                            <input 
                                type="number" className="input-field" 
                                {...register("age")}
                                placeholder="45"
                            />
                            {errors.age && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.age.message}</p>}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Gender</label>
                            <select 
                                className="input-field" 
                                {...register("gender")}
                            >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                            {errors.gender && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.gender.message}</p>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button type="button" className="btn" onClick={() => setShowForm(false)} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Register Patient')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', width: '100%' }}>
                <div style={{
                    position: 'absolute',
                    left: '1.15rem',
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)'
                }}>
                    <Search size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search by name, room, or patient ID..." 
                  className="input-field"
                  style={{ 
                      width: '100%',
                      display: 'block',
                      boxSizing: 'border-box',
                      paddingLeft: '3.25rem',
                      marginBottom: 0, 
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '999px',
                      height: '48px',
                      color: 'var(--text-main)'
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div>Loading patient records...</div>
            </div>
        ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Patient Name</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Room No.</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Patient ID</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Risk Status</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPatients.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No patients found.
                            </td>
                        </tr>
                    ) : (
                        filteredPatients.map((patient, index) => (
                        <motion.tr 
                          key={patient.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                        >
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{patient.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{patient.age} yrs • {patient.gender}</div>
                            </td>
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '0.3rem 0.75rem', borderRadius: '999px',
                                    fontSize: '0.8rem', fontWeight: 600,
                                    backgroundColor: 'rgba(67, 56, 202, 0.08)', color: '#4338ca',
                                    border: '1px solid rgba(67, 56, 202, 0.18)'
                                }}>
                                    Room {patient.room_number || 'N/A'}
                                </span>
                            </td>
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <span style={{
                                    fontWeight: 700,
                                    color: 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace',
                                    backgroundColor: 'var(--input-bg)',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}>
                                    #{patient.id}
                                </span>
                            </td>
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <PatientStatusBadge patientId={patient.id} />
                            </td>
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button 
                                        onClick={() => navigate('/app/history', { state: { patient_id: patient.id } })}
                                        className="btn btn-primary" 
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '999px' }}
                                    >
                                        View Telemetry
                                    </button>
                                    {isAdmin && (
                                      <>
                                        <button 
                                            onClick={() => navigate('/app/assessment', { state: { patient_id: patient.id } })}
                                            className="btn" 
                                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '999px', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }}
                                        >
                                            Assess
                                        </button>
                                        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)', margin: '0 0.5rem' }}></div>
                                        <button 
                                            onClick={() => openEditForm(patient)}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex', padding: '0.25rem' }}
                                            title="Edit Patient"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(patient.id)}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: '0.25rem' }}
                                            title="Delete Patient"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                      </>
                                    )}
                                </div>
                            </td>
                        </motion.tr>
                        ))
                    )}
                </tbody>
              </table>
            </div>
        )}
      </div>
    </motion.div>
  );
};

export default PatientList;
