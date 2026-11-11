import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { User, UserRole, AuditLog } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Workflow,
  Package,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  History,
  Clock,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Building,
  Mail,
  UserCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Check,
} from 'lucide-react';

export const Users: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  // User Accounts State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admin: 0,
    productionManager: 0,
    storeKeeper: 0,
    viewer: 0,
    other: 0,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditUserFilter, setAuditUserFilter] = useState('all');
  const [auditTotal, setAuditTotal] = useState(0);
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleAuditRow = (id: string) => {
    setExpandedAuditIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAllAudits = () => {
    if (expandedAuditIds.size === auditLogs.length && auditLogs.length > 0) {
      setExpandedAuditIds(new Set());
    } else {
      setExpandedAuditIds(new Set(auditLogs.map((l) => l._id)));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State for Add User
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'viewer' as UserRole,
    customRole: '',
    department: 'Production & Planning',
    isActive: true,
  });

  // Form State for Edit User
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'viewer' as UserRole,
    customRole: '',
    department: 'Production & Planning',
    isActive: true,
    password: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.users);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const params: any = { limit: 100 };
      if (auditSearch) params.search = auditSearch;
      if (auditEntityFilter !== 'all') params.entityType = auditEntityFilter;
      if (auditActionFilter !== 'all') params.action = auditActionFilter;
      if (auditUserFilter !== 'all') params.userId = auditUserFilter;

      const res = await api.get('/audit-logs', { params });
      if (res.data.success) {
        setAuditLogs(res.data.data);
        setAuditTotal(res.data.total);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditEntityFilter, auditActionFilter, auditUserFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setSubmitting(true);
      const res = await api.post('/users', addForm);
      if (res.data.success) {
        setIsAddModalOpen(false);
        setAddForm({
          name: '',
          username: '',
          email: '',
          password: '',
          role: 'viewer',
          customRole: '',
          department: 'Production & Planning',
          isActive: true,
        });
        setSuccessMsg('User account created successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg('');
    try {
      setSubmitting(true);
      const targetId = selectedUser._id || selectedUser.id;
      const res = await api.put(`/users/${targetId}`, editForm);
      if (res.data.success) {
        setIsEditModalOpen(false);
        setSelectedUser(null);
        setSuccessMsg('User updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userToToggle: User) => {
    const targetId = userToToggle._id || userToToggle.id;
    if (currentUser && (currentUser.id === targetId || currentUser._id === targetId)) {
      alert('You cannot deactivate your own account.');
      return;
    }
    const actionLabel = userToToggle.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionLabel} account for ${userToToggle.name}?`)) {
      return;
    }
    try {
      const res = await api.patch(`/users/${targetId}/toggle-status`);
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    const targetId = userToDelete._id || userToDelete.id;
    if (currentUser && (currentUser.id === targetId || currentUser._id === targetId)) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Are you sure you want to deactivate and remove ${userToDelete.name}?`)) {
      return;
    }
    try {
      const res = await api.delete(`/users/${targetId}`);
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      username: u.username || '',
      email: u.email,
      role: u.role,
      customRole: u.customRole || '',
      department: u.department || 'Production & Planning',
      isActive: u.isActive !== undefined ? u.isActive : true,
      password: '',
    });
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const filterToUserAudit = (u: User) => {
    const targetId = u._id || u.id;
    setAuditUserFilter(targetId || 'all');
    setActiveTab('audit');
  };

  const getRoleBadge = (role: UserRole, customRole?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'production_manager':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Workflow className="w-3 h-3" /> Production Manager
          </span>
        );
      case 'store_keeper':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Package className="w-3 h-3" /> Store Keeper
          </span>
        );
      case 'other':
      case 'others':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <UserCheck className="w-3 h-3" /> {customRole ? `Others (${customRole})` : 'Others'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-700">
            <Eye className="w-3 h-3" /> Viewer
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            DELETE
          </span>
        );
      case 'STOCK_IN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            STOCK IN
          </span>
        );
      case 'STOCK_OUT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            STOCK OUT
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            TRANSFER
          </span>
        );
      case 'PRODUCTION_RUN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            PRODUCTION RUN
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
            {action}
          </span>
        );
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const now = new Date().getTime();
    const then = new Date(dateStr).getTime();
    const diffSecs = Math.floor((now - then) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesRole =
      roleFilter === 'all' ||
      u.role === roleFilter ||
      (roleFilter === 'other' && (u.role === 'other' || u.role === 'others'));
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? u.isActive !== false
        : u.isActive === false;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                User Management & System Audit Log
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage operator accounts, roles, access permissions, and trace who edited what with exact timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Action */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>User Accounts ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <div className="flex items-center gap-1.5">
                <span>Activity & Audit Trail</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
            </button>
          </div>

          {activeTab === 'users' && hasRole('admin') && (
            <button
              onClick={() => {
                setErrorMsg('');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/40 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          )}

          {activeTab === 'audit' && (
            <button
              onClick={fetchAuditLogs}
              disabled={loadingAudit}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Users
            </span>
            <UsersIcon className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats.total || users.length}</p>
          <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {stats.active} Active accounts
          </p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Admins
            </span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-2">{stats.admin}</p>
          <p className="text-[10px] text-slate-500 mt-1">Full System Governance</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Production Mgrs
            </span>
            <Workflow className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{stats.productionManager}</p>
          <p className="text-[10px] text-slate-500 mt-1">BOM & Floor Operations</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Store Keepers
            </span>
            <Package className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400 mt-2">{stats.storeKeeper}</p>
          <p className="text-[10px] text-slate-500 mt-1">Stock Movement & GRN</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800/80 col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Audit Events
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{auditTotal || auditLogs.length || 'Active'}</p>
          <p className="text-[10px] text-slate-500 mt-1">Logged system edits</p>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER ACCOUNTS TABLE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, username, email, department..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="production_manager">Production Manager</option>
                <option value="store_keeper">Store Keeper</option>
                <option value="viewer">Viewer</option>
                <option value="other">Others</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-bold">User / Team Member</th>
                    <th className="py-3 px-4 font-bold">System Role</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                    <th className="py-3 px-4 font-bold">Last Edited By & Time</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No user accounts match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isActive = u.isActive !== false;
                      const initials = u.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={u._id || u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-950/50 border border-purple-800/50 flex items-center justify-center font-bold text-purple-300 text-xs shadow-inner">
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-100">{u.name}</span>
                                  {currentUser && (currentUser.email === u.email || (currentUser.username && currentUser.username === u.username)) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
                                  {u.username && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold text-[10px]">
                                      @{u.username}
                                    </span>
                                  )}
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    <span>{u.email}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {getRoleBadge(u.role, u.customRole)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-300 font-medium">{u.department || 'Production & Planning'}</span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Inactive
                              </span>
                            )}
                          </td>

                          {/* Last Edited By & Timestamp */}
                          <td className="py-3.5 px-4">
                            {u.lastEditedBy?.userName ? (
                              <div>
                                <p className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                                  <span className="text-purple-400">✏️ {u.lastEditedBy.userName}</span>
                                  <span className="text-[10px] text-slate-500">({getRelativeTime(u.lastEditedBy.editedAt)})</span>
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[220px]" title={u.lastEditedBy.summary}>
                                  {u.lastEditedBy.summary || 'Details updated'}
                                </p>
                                <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                                  {formatTimestamp(u.lastEditedBy.editedAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Created at setup</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Filter to activity log */}
                              <button
                                onClick={() => filterToUserAudit(u)}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-purple-300 transition-colors"
                                title="View this user's activity logs"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {hasRole('admin') && (
                                <>
                                  <button
                                    onClick={() => openEditModal(u)}
                                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                                    title="Edit user details & role"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      isActive
                                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                    }`}
                                    title={isActive ? 'Deactivate account' : 'Activate account'}
                                  >
                                    {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                                    title="Remove user account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT & ACTIVITY LOG (WHO EDITED WHAT, WHEN, DETAILS)              */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Controls & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                placeholder="Search audit trail by item name, user, or change description..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              {/* Entity Type Filter */}
              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Modules</option>
                <option value="FinishedGood">Finished Goods</option>
                <option value="RawMaterial">Raw Materials</option>
                <option value="PackingMaterial">Packing Materials</option>
                <option value="BOM">Bill of Materials (BOM)</option>
                <option value="DailyMatrix">Daily Matrix Sheet</option>
                <option value="StockTransaction">Stock Moves</option>
                <option value="User">User Accounts</option>
              </select>

              {/* Action Filter */}
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="STOCK_IN">STOCK IN</option>
                <option value="STOCK_OUT">STOCK OUT</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="PRODUCTION_RUN">PRODUCTION RUN</option>
              </select>

              {/* User Filter */}
              <select
                value={auditUserFilter}
                onChange={(e) => setAuditUserFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 max-w-[150px]"
              >
                <option value="all">All Users</option>
                {users.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              {(auditSearch || auditEntityFilter !== 'all' || auditActionFilter !== 'all' || auditUserFilter !== 'all') && (
                <button
                  onClick={() => {
                    setAuditSearch('');
                    setAuditEntityFilter('all');
                    setAuditActionFilter('all');
                    setAuditUserFilter('all');
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Audit Logs Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-3 w-12 text-center font-bold">
                      <button
                        type="button"
                        onClick={toggleExpandAllAudits}
                        title={
                          expandedAuditIds.size === auditLogs.length && auditLogs.length > 0
                            ? 'Collapse all rows'
                            : 'Expand all rows'
                        }
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center justify-center"
                      >
                        <ChevronsUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="py-3 px-4 font-bold">Date & Time</th>
                    <th className="py-3 px-4 font-bold">Edited By (User)</th>
                    <th className="py-3 px-4 font-bold">Action</th>
                    <th className="py-3 px-4 font-bold">Target Item / Module</th>
                    <th className="py-3 px-4 font-bold">What Was Updated</th>
                    <th className="py-3 px-4 font-bold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Fetching system audit trail...</span>
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No audit trail entries found matching your filters. Make updates in the system to see them appear here!
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const isExpanded = expandedAuditIds.has(log._id);
                      return (
                        <React.Fragment key={log._id}>
                          <tr
                            className={`hover:bg-slate-800/30 transition-colors ${
                              isExpanded ? 'bg-slate-800/25' : ''
                            }`}
                          >
                            {/* Expand / Collapse Arrow Button */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap w-12">
                              <button
                                type="button"
                                onClick={() => toggleAuditRow(log._id)}
                                title={isExpanded ? 'Collapse update details' : 'Expand full update details'}
                                className={`w-7 h-7 inline-flex items-center justify-center rounded-lg border transition-all ${
                                  isExpanded
                                    ? 'bg-purple-950/60 border-purple-500/60 text-purple-300 shadow-sm shadow-purple-950/50'
                                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-purple-300' : 'text-slate-400'
                                  }`}
                                />
                              </button>
                            </td>

                            {/* Date & Time */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                <div>
                                  <p className="font-mono text-slate-200 font-semibold">
                                    {formatTimestamp(log.createdAt)}
                                  </p>
                                  <p className="text-[10px] text-purple-400 font-medium">
                                    {getRelativeTime(log.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Edited By User */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div>
                                <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                                  {log.performedByName}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                  <span className="capitalize font-mono px-1 rounded bg-slate-800 text-slate-300">
                                    {log.performedByRole || 'user'}
                                  </span>
                                  {log.performedByEmail && <span>• {log.performedByEmail}</span>}
                                </div>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {getActionBadge(log.action)}
                            </td>

                            {/* Target Item / Module */}
                            <td className="py-3.5 px-4">
                              <div className="max-w-[200px]">
                                <p className="font-semibold text-slate-200 truncate" title={log.entityName}>
                                  {log.entityName}
                                </p>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400 mt-0.5">
                                  {log.entityType}
                                </span>
                              </div>
                            </td>

                            {/* What Was Updated */}
                            <td className="py-3.5 px-4">
                              <div className="max-w-md">
                                <p className="text-slate-100 font-medium text-xs leading-relaxed">
                                  {log.summary}
                                </p>
                                {/* If specific field changes exist, show diff chips */}
                                {log.changes && log.changes.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {log.changes.map((c, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700/80 text-slate-300"
                                      >
                                        <span className="text-purple-300 font-semibold">{c.label || c.field}:</span>
                                        <span className="text-rose-400 font-mono line-through opacity-80">
                                          {c.oldValue !== null && c.oldValue !== undefined ? String(c.oldValue) : 'none'}
                                        </span>
                                        <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                                        <span className="text-emerald-400 font-mono font-bold">
                                          {c.newValue !== null && c.newValue !== undefined ? String(c.newValue) : 'none'}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Metadata / ID */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => toggleAuditRow(log._id)}
                                className="text-[10px] font-mono text-slate-500 hover:text-purple-400 underline decoration-dotted transition-colors"
                                title="Click to view details"
                              >
                                ID #{log._id.slice(-6)}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-950/70 border-b border-slate-800">
                              <td colSpan={7} className="py-4 px-6 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95">
                                <div className="space-y-4 max-w-5xl">
                                  {/* Header / Summary bar */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-200">
                                        Audit Event Log Details
                                      </span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/20">
                                        {log.action} on {log.entityType}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(log._id, `id-${log._id}`)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-mono border border-slate-700/60 transition-colors"
                                        title="Copy Full Audit ID"
                                      >
                                        {copiedId === `id-${log._id}` ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Copied!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy ID: {log._id}</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Full Summary */}
                                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                      Full Summary Description
                                    </p>
                                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                      {log.summary}
                                    </p>
                                  </div>

                                  {/* Detailed Changes Diffs */}
                                  {log.changes && log.changes.length > 0 ? (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                          <History className="w-3.5 h-3.5 text-purple-400" /> Modified Attributes ({log.changes.length})
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Visual Field-by-Field Breakdown
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {log.changes.map((c, idx) => (
                                          <div
                                            key={idx}
                                            className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col justify-between space-y-2 hover:border-slate-700/80 transition-colors"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-semibold text-purple-300 capitalize">
                                                {c.label || c.field}
                                              </span>
                                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                                                {c.field}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/70">
                                              <div className="flex-1 min-w-0">
                                                <span className="text-[9px] uppercase tracking-wider text-rose-400/80 block font-semibold">
                                                  Previous Value
                                                </span>
                                                <span
                                                  className="font-mono text-rose-300/90 line-through text-xs truncate block mt-0.5"
                                                  title={c.oldValue !== null && c.oldValue !== undefined ? String(c.oldValue) : '(none)'}
                                                >
                                                  {c.oldValue !== null && c.oldValue !== undefined && String(c.oldValue).trim() !== ''
                                                    ? String(c.oldValue)
                                                    : '(none)'}
                                                </span>
                                              </div>
                                              <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-semibold">
                                                  New Value
                                                </span>
                                                <span
                                                  className="font-mono text-emerald-300 font-bold text-xs truncate block mt-0.5"
                                                  title={c.newValue !== null && c.newValue !== undefined ? String(c.newValue) : '(cleared)'}
                                                >
                                                  {c.newValue !== null && c.newValue !== undefined && String(c.newValue).trim() !== ''
                                                    ? String(c.newValue)
                                                    : '(cleared)'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/50 text-xs text-slate-400 italic">
                                      No specific field changes recorded for this entry (e.g. deletion, login, or initial entry).
                                    </div>
                                  )}

                                  {/* Metadata Breakdown */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Operator</span>
                                      <span className="text-slate-200 font-semibold">{log.performedByName}</span>
                                      <span className="text-[10px] text-slate-400 block">{log.performedByEmail || 'No email'}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Record</span>
                                      <span className="text-slate-200 font-semibold truncate block" title={log.entityName}>{log.entityName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono block">ID: {log.entityId || 'N/A'}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Action Type</span>
                                      <span className="text-slate-200 font-semibold">{log.action}</span>
                                      <span className="text-[10px] text-slate-400 block">Entity: {log.entityType}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Timestamp</span>
                                      <span className="text-slate-200 font-mono text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
                                      <span className="text-[10px] text-purple-400 block font-medium">{getRelativeTime(log.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW USER                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New System User"
        subtitle="Create an authorized terminal login for factory operators or management."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Asanka Wijesinghe"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Username (Login ID) *
              </label>
              <input
                type="text"
                required
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                placeholder="e.g. asanka"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="e.g. asanka@fadna.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                System Role *
              </label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="store_keeper">Store Keeper (Stock In/Out, Relocate)</option>
                <option value="production_manager">Production Manager (BOM, Planning)</option>
                <option value="admin">Administrator (Full Control)</option>
                <option value="other">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Department
              </label>
              <input
                type="text"
                value={addForm.department}
                onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                placeholder="e.g. Packaging Operations"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {(addForm.role === 'other' || addForm.role === 'others') && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Specify Role Title (Optional)
              </label>
              <input
                type="text"
                value={addForm.customRole}
                onChange={(e) => setAddForm({ ...addForm, customRole: e.target.value })}
                placeholder="e.g. Quality Inspector, Machine Operator, Accounts Staff"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="addUserActive"
              checked={addForm.isActive}
              onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="addUserActive" className="text-xs text-slate-300 font-medium">
              Activate account immediately upon creation
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/40"
            >
              {submitting ? 'Creating...' : 'Create User Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT USER (ROLE, DETAILS, PASSWORD RESET)                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.name}`}
        subtitle={`System ID: ${selectedUser?._id || selectedUser?.id}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Previous edit audit banner */}
          {selectedUser?.lastEditedBy?.userName && (
            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-300">
              <span className="font-bold">Last edited:</span> by {selectedUser.lastEditedBy.userName} on{' '}
              {formatTimestamp(selectedUser.lastEditedBy.editedAt)} —{' '}
              <span className="italic">{selectedUser.lastEditedBy.summary}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Username (Login ID) *
              </label>
              <input
                type="text"
                required
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                System Role *
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="store_keeper">Store Keeper (Stock In/Out, Relocate)</option>
                <option value="production_manager">Production Manager (BOM, Planning)</option>
                <option value="admin">Administrator (Full Control)</option>
                <option value="other">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Department
              </label>
              <input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {(editForm.role === 'other' || editForm.role === 'others') && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Specify Role Title (Optional)
              </label>
              <input
                type="text"
                value={editForm.customRole}
                onChange={(e) => setEditForm({ ...editForm, customRole: e.target.value })}
                placeholder="e.g. Quality Inspector, Machine Operator, Accounts Staff"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Reset Password (leave blank to keep current password)
            </label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Enter new password if resetting..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editUserActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="editUserActive" className="text-xs text-slate-300 font-medium">
              Account is Active
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/40"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Users;
