import { useState } from 'react';
import { useSupplierDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver } from '@/hooks/useDrivers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Car, Truck, Bike, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Driver } from '@/types/gps-tracking';

type VehicleType = 'car' | 'van' | 'bike' | 'scooter';

const vehicleIcons: Record<VehicleType, React.ReactNode> = {
  car: <Car className="w-4 h-4" />,
  van: <Truck className="w-4 h-4" />,
  bike: <Bike className="w-4 h-4" />,
  scooter: <Bike className="w-4 h-4" />,
};

const vehicleLabels: Record<VehicleType, string> = {
  car: 'Car',
  van: 'Van',
  bike: 'Bike',
  scooter: 'Scooter',
};

interface DriverFormData {
  name: string;
  phone: string;
  email: string;
  vehicle_type: VehicleType | '';
  vehicle_plate: string;
}

const initialFormData: DriverFormData = {
  name: '',
  phone: '',
  email: '',
  vehicle_type: '',
  vehicle_plate: '',
};

export default function DriversPage() {
  const { data: drivers, isLoading, error } = useSupplierDrivers();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(initialFormData);
  const [deleteConfirmDriver, setDeleteConfirmDriver] = useState<Driver | null>(null);

  const handleOpenDialog = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        phone: driver.phone || '',
        email: driver.email || '',
        vehicle_type: (driver.vehicle_type as VehicleType) || '',
        vehicle_plate: driver.vehicle_plate || '',
      });
    } else {
      setEditingDriver(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDriver(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Driver name is required');
      return;
    }

    try {
      if (editingDriver) {
        await updateDriver.mutateAsync({
          driverId: editingDriver.id,
          updates: {
            name: formData.name,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            vehicle_type: formData.vehicle_type || undefined,
            vehicle_plate: formData.vehicle_plate || undefined,
          },
        });
        toast.success('Driver updated successfully');
      } else {
        await createDriver.mutateAsync({
          name: formData.name,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          vehicle_type: formData.vehicle_type || undefined,
          vehicle_plate: formData.vehicle_plate || undefined,
          is_active: true,
        });
        toast.success('Driver added successfully');
      }
      handleCloseDialog();
    } catch (err) {
      toast.error(editingDriver ? 'Failed to update driver' : 'Failed to add driver');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmDriver) return;

    try {
      await deleteDriver.mutateAsync(deleteConfirmDriver.id);
      toast.success('Driver removed successfully');
      setDeleteConfirmDriver(null);
    } catch (err) {
      toast.error('Failed to remove driver');
      console.error(err);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load drivers</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-muted-foreground">Manage your delivery drivers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                <DialogDescription>
                  {editingDriver
                    ? 'Update the driver information below.'
                    : 'Enter the details for the new driver.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Driver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+358 40 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="driver@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Vehicle Type</Label>
                    <Select
                      value={formData.vehicle_type}
                      onValueChange={(value) => setFormData({ ...formData, vehicle_type: value as VehicleType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="bike">Bike</SelectItem>
                        <SelectItem value="scooter">Scooter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_plate">License Plate</Label>
                    <Input
                      id="vehicle_plate"
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                      placeholder="ABC-123"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDriver.isPending || updateDriver.isPending}>
                  {editingDriver ? 'Update' : 'Add'} Driver
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>
            {drivers?.length || 0} active driver{(drivers?.length || 0) !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : drivers && drivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#009EE0]/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-[#009EE0]" />
                        </div>
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          {driver.vehicle_plate && (
                            <p className="text-sm text-muted-foreground">{driver.vehicle_plate}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {driver.phone && <p>{driver.phone}</p>}
                        {driver.email && <p className="text-muted-foreground">{driver.email}</p>}
                        {!driver.phone && !driver.email && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.vehicle_type ? (
                        <div className="flex items-center gap-2">
                          {vehicleIcons[driver.vehicle_type as VehicleType]}
                          <span>{vehicleLabels[driver.vehicle_type as VehicleType]}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={driver.is_active ? 'default' : 'secondary'}>
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(driver)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmDriver(driver)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No drivers yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first driver to start tracking deliveries.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmDriver} onOpenChange={() => setDeleteConfirmDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteConfirmDriver?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
