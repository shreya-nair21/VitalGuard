import { useState, useEffect } from 'react';
import { Search, X, UserPlus, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPatients, createPatient, updatePatient, deletePatient, getPatientHistory, type Patient } from '../services/api';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Zod Schema
const patientSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(0, "Age must be >= 0").max(120, "Please enter a valid age under 120"),
  gender: z.enum(["M", "F"]),
  mrn: z.string().min(3, "MRN must be at least 3 characters")
});
type PatientFormValues = z.infer<typeof patientSchema>;

// Subcomponent to load sparkline asynchronously
const PatientSparkline = ({ patientId }: { patientId: number }) => {
  const [data, setData] = useState<{ hr: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientHistory(patientId).then(history => {
      // Get last 5, reversed for chronological order
      const recent = history.slice(0, 5).reverse().map(h => ({ hr: h.heart_rate }));
      setData(recent);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [patientId]);

  if (loading || data.length < 2) return <div style={{ width: '80px', height: '30px', color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>No trend</div>;

  return (
    <div style={{ width: '80px', height: '30px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
          <Line type="monotone" dataKey="hr" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const PatientList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
      setPatients(data);
    } catch (error) {
      toast.error("Failed to load patient records");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditMode(false);
    reset({ name: '', age: undefined, gender: 'M', mrn: '' });
    setShowForm(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditMode(true);
    reset({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      mrn: patient.mrn
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this patient? All their assessments will be lost.")) return;
    try {
      await deletePatient(id);
      setPatients(patients.filter(p => p.id !== id));
      toast.success("Patient successfully deleted");
    } catch (error) {
      toast.error("Failed to delete patient");
    }
  };

  const onSubmitForm = async (data: any) => {
    try {
      const payload = {
        name: data.name,
        age: Number(data.age),
        gender: data.gender as 'M' | 'F',
        mrn: data.mrn
      };

      if (editMode && data.id) {
        await updatePatient(data.id, payload);
        toast.success("Patient updated successfully");
      } else {
        await createPatient(payload);
        toast.success("New patient added successfully");
      }
      
      await fetchPatients();
      setShowForm(false);
    } catch (error) {
      toast.error(`Failed to ${editMode ? 'update' : 'create'} patient`);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().includes(searchTerm)
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage and view patient status across all departments.</p>
        </div>
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
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Full Name</label>
                        <input 
                            type="text" className="input-field" 
                            {...register("name")}
                            placeholder="e.g. Sarah Jenkins"
                        />
                        {errors.name && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.name.message}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
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
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>MRN (Medical Record #)</label>
                        <input 
                            type="text" className="input-field" 
                            {...register("mrn")}
                            placeholder="e.g. VG-1001"
                        />
                        {errors.mrn && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.mrn.message}</p>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button type="button" className="btn" onClick={() => setShowForm(false)} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Save Patient')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', width: '100%' }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by name, MRN, or ID..." 
                  className="input-field"
                  style={{ 
                      paddingLeft: '3rem', marginBottom: 0, 
                      backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)',
                      borderRadius: '999px', height: '48px', color: 'var(--text-main)'
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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Patient Name</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>MRN / ID</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Vitals Trend</th>
                        <th style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPatients.length === 0 ? (
                        <tr>
                            <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{patient.mrn}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {patient.id}</div>
                            </td>
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <PatientSparkline patientId={patient.id} />
                            </td>
                            <td style={{ padding: '1.25rem 2rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button 
                                        onClick={() => navigate('/app/history', { state: { patient_id: patient.id } })}
                                        className="btn" 
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderRadius: '999px' }}
                                    >
                                        History
                                    </button>
                                    <button 
                                        onClick={() => navigate('/app/assessment', { state: { patient_id: patient.id } })}
                                        className="btn btn-primary" 
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '999px', boxShadow: 'var(--shadow-sm)' }}
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
