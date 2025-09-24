import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldX,
  Mail,
  Phone,
  Calendar,
  Activity,
  Eye,
  EyeOff,
  Key,
  Settings,
  UserCheck,
  UserX,
  Clock,
  Building,
  MapPin
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'admin' | 'reception' | 'security' | 'manager';
  department?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  avatar_url?: string;
}

interface UserFormData {
  email: string;
  full_name: string;
  phone: string;
  role: string;
  department: string;
  is_active: boolean;
  password?: string;
}

const ROLES = [
  { value: 'admin', label: 'Administrator', color: 'bg-red-100 text-red-800' },
  { value: 'manager', label: 'Manager', color: 'bg-purple-100 text-purple-800' },
  { value: 'reception', label: 'Reception', color: 'bg-blue-100 text-blue-800' },
  { value: 'security', label: 'Security', color: 'bg-green-100 text-green-800' }
];

const DEPARTMENTS = [
  'Administration',
  'Reception',
  'Security',
  'IT',
  'HR',
  'Operations',
  'Management'
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    phone: '',
    role: 'reception',
    department: '',
    is_active: true,
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      // TODO: Implement actual user fetching from database
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .select('*')
      //   .order('created_at', { ascending: false });
      
      // if (error) throw error;
      // setUsers(data || []);
      
      // For now, start with empty list until proper user management is implemented
      setUsers([]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.is_active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    try {
      // In a real app, this would create user via Supabase Auth
      const newUser: User = {
        id: Date.now().toString(),
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role as any,
        department: formData.department,
        is_active: formData.is_active,
        created_at: new Date().toISOString()
      };

      setUsers([...users, newUser]);
      setShowCreateDialog(false);
      resetForm();

      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updatedUser: User = {
        ...selectedUser,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role as any,
        department: formData.department,
        is_active: formData.is_active
      };

      setUsers(users.map(user => user.id === selectedUser.id ? updatedUser : user));
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setUsers(users.filter(user => user.id !== userId));
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !user.is_active }
          : user
      ));

      const user = users.find(u => u.id === userId);
      toast({
        title: 'Success',
        description: `User ${user?.is_active ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      role: 'reception',
      department: '',
      is_active: true,
      password: ''
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role,
      department: user.department || '',
      is_active: user.is_active
    });
    setShowEditDialog(true);
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0];
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const UserCard = ({ user }: { user: User }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar>
              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{user.full_name || 'Unnamed User'}</h3>
                <Badge className={getRoleInfo(user.role).color}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleInfo(user.role).label}
                </Badge>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? (
                    <>
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <UserX className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {user.department && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span>{user.department}</span>
                    </div>
                  )}
                  {user.last_login && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last: {new Date(user.last_login).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSelectedUser(user);
                setShowDetailsDialog(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEditDialog(user)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant={user.is_active ? "secondary" : "default"}
              onClick={() => handleToggleUserStatus(user.id)}
            >
              {user.is_active ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Deactivate
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Activate
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {user.full_name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Enter full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter password"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active User</Label>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with appropriate role and permissions.
              </DialogDescription>
            </DialogHeader>
            <UserForm />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                <p className="text-sm text-muted-foreground">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.last_login && new Date(u.last_login) > new Date(Date.now() - 24*60*60*1000)).length}</p>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <UserForm isEdit />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Update User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.full_name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getRoleInfo(selectedUser.role).color}>
                      {getRoleInfo(selectedUser.role).label}
                    </Badge>
                    <Badge variant={selectedUser.is_active ? 'default' : 'secondary'}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Email:</strong> {selectedUser.email}</div>
                      {selectedUser.phone && (
                        <div><strong>Phone:</strong> {selectedUser.phone}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Work Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Role:</strong> {getRoleInfo(selectedUser.role).label}</div>
                      {selectedUser.department && (
                        <div><strong>Department:</strong> {selectedUser.department}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Created:</strong><br />
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </div>
                  {selectedUser.last_login && (
                    <div>
                      <strong>Last Login:</strong><br />
                      {new Date(selectedUser.last_login).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}