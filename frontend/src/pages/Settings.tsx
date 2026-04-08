import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Trash2, Shield } from 'lucide-react';
import { getUsers, createUser, deleteUser } from '../services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Zod Schema
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["doctor", "nurse", "admin"])
});
type UserFormValues = z.infer<typeof userSchema>;

const Settings = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // form state
  const [showAddForm, setShowAddForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'doctor' }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to fetch users. Ensure you have admin access.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitForm = async (data: UserFormValues) => {
    try {
      await createUser({
        username: data.username,
        email: data.email,
        hashed_password: data.password, // backend handles hashing
        role: data.role
      });
      await fetchUsers();
      setShowAddForm(false);
      reset({ username: '', email: '', password: '', role: 'doctor' });
      toast.success("User created successfully");
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user log-in permanently?")) return;
    try {
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success("User deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: '1200px', margin: '0 auto' }}
    >
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={28} />
          Admin Settings & User Management
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Add new doctors or staff that can access the VitalGuard system.</p>
      </div>



      {/* Add User Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> System Users
          </h2>
          <button 
              className="btn btn-primary" 
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '999px' }}
          >
            <UserPlus size={18} />
            Add Staff Member
          </button>
        </div>

        {showAddForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}
            onSubmit={handleSubmit(onSubmitForm)}
          >
            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Username</label>
                <input 
                  type="text" className="input-field" 
                  {...register("username")}
                  placeholder="e.g. dr.smith"
                />
                {errors.username && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.username.message}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
                <input 
                  type="email" className="input-field" 
                  {...register("email")}
                  placeholder="e.g. smith@vitalguard.com"
                />
                {errors.email && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.email.message}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Temporary Password</label>
                <input 
                  type="password" className="input-field" 
                  {...register("password")}
                  placeholder="Must be at least 6 characters"
                />
                {errors.password && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.password.message}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Role</label>
                <select 
                  className="input-field" 
                  {...register("role")}
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Administrator</option>
                </select>
                {errors.role && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.role.message}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </motion.form>
        )}

        {/* Users Table */}
        {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
        ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Username / ID</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Email</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Role</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => (
                    <motion.tr 
                      key={user.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                        <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.username}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {user.id}</div>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--secondary)' }}>
                           {user.email}
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                backgroundColor: user.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                color: user.role === 'admin' ? 'var(--warning)' : 'var(--primary)'
                            }}>
                                {user.role.toUpperCase()}
                            </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.5rem', borderRadius: '8px' }}
                                title="Delete User"
                                disabled={users.length <= 1}
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
        )}
      </div>

    </motion.div>
  );
};

export default Settings;
