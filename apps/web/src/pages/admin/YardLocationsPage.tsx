import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '../../components/ui/toast';
import { Toggle } from '@/components/ui/toggle';
import {
  Plus,
  MapPin,
  Trash2,
  Car,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleClass } from '../../types';

interface YardSection {
  id: string;
  name: string;
  prefix: string;
  spots: YardSpot[];
}

interface YardSpot {
  id: string;
  name: string;
  sectionId: string;
  vehicleClass?: string;
  active: boolean;
  occupied: boolean;
}

const vehicleClassColors: Record<string, string> = {
  STANDARD: 'bg-blue-500',
  LARGE: 'bg-purple-500',
  MOTORCYCLE: 'bg-green-500',
  OVERSIZED: 'bg-amber-500',
  TRAILER: 'bg-rose-500',
};

export default function YardLocationsPage() {
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<YardSection | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionPrefix, setSectionPrefix] = useState('');
  const [spotsCount, setSpotsCount] = useState('6');

  const [spotDialogOpen, setSpotDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<YardSpot | null>(null);
  const [spotName, setSpotName] = useState('');
  const [spotVehicleClass, setSpotVehicleClass] = useState('');
  const [spotSectionId, setSpotSectionId] = useState('');

  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: yardData, isLoading } = trpc.admin.yard.list.useQuery();

  const createSectionMutation = trpc.admin.yard.createSection.useMutation({
    onSuccess: () => {
      addToast('Section created successfully', 'success');
      utils.admin.yard.invalidate();
      closeSectionDialog();
    },
    onError: (error) => {
      addToast(`Failed to create section: ${error.message}`, 'error');
    },
  });

  const updateSectionMutation = trpc.admin.yard.updateSection.useMutation({
    onSuccess: () => {
      addToast('Section updated successfully', 'success');
      utils.admin.yard.invalidate();
      closeSectionDialog();
    },
    onError: (error) => {
      addToast(`Failed to update section: ${error.message}`, 'error');
    },
  });

  const deleteSectionMutation = trpc.admin.yard.deleteSection.useMutation({
    onSuccess: () => {
      addToast('Section deleted successfully', 'success');
      utils.admin.yard.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to delete section: ${error.message}`, 'error');
    },
  });

  const updateSpotMutation = trpc.admin.yard.updateSpot.useMutation({
    onSuccess: () => {
      addToast('Spot updated successfully', 'success');
      utils.admin.yard.invalidate();
      closeSpotDialog();
    },
    onError: (error) => {
      addToast(`Failed to update spot: ${error.message}`, 'error');
    },
  });

  const toggleSpotMutation = trpc.admin.yard.toggleSpot.useMutation({
    onSuccess: (data) => {
      addToast(`Spot ${data.active ? 'activated' : 'deactivated'}`, 'success');
      utils.admin.yard.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to update spot: ${error.message}`, 'error');
    },
  });

  const closeSectionDialog = () => {
    setSectionDialogOpen(false);
    setEditingSection(null);
    setSectionName('');
    setSectionPrefix('');
    setSpotsCount('6');
  };

  const closeSpotDialog = () => {
    setSpotDialogOpen(false);
    setEditingSpot(null);
    setSpotName('');
    setSpotVehicleClass('');
    setSpotSectionId('');
  };

  const openCreateSectionDialog = () => {
    setEditingSection(null);
    setSectionName('');
    setSectionPrefix('');
    setSpotsCount('6');
    setSectionDialogOpen(true);
  };

  const openEditSectionDialog = (section: YardSection) => {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionPrefix(section.prefix);
    setSpotsCount(section.spots.length.toString());
    setSectionDialogOpen(true);
  };

  const openEditSpotDialog = (spot: YardSpot, sectionId: string) => {
    setEditingSpot(spot);
    setSpotName(spot.name);
    setSpotVehicleClass(spot.vehicleClass || '');
    setSpotSectionId(sectionId);
    setSpotDialogOpen(true);
  };

  const handleSectionSubmit = () => {
    if (editingSection) {
      updateSectionMutation.mutate({
        id: editingSection.id,
        name: sectionName,
        prefix: sectionPrefix,
      });
    } else {
      createSectionMutation.mutate({
        name: sectionName,
        prefix: sectionPrefix,
        spotsCount: parseInt(spotsCount) || 6,
      });
    }
  };

  const handleSpotSubmit = () => {
    if (!editingSpot) return;
    updateSpotMutation.mutate({
      id: editingSpot.id,
      name: spotName,
      vehicleClass: spotVehicleClass || undefined,
    });
  };

  const sections: YardSection[] = yardData?.sections || [];
  const totalSpots = sections.reduce((sum, s) => sum + s.spots.length, 0);
  const occupiedSpots = sections.reduce((sum, s) => sum + s.spots.filter((sp) => sp.occupied).length, 0);
  const activeSpots = sections.reduce((sum, s) => sum + s.spots.filter((sp) => sp.active).length, 0);

  return (
    <AdminLayout title="Yard Locations" description="Configure yard sections and parking spots">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spots</CardDescription>
            <CardTitle className="text-2xl">{totalSpots}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Spots</CardDescription>
            <CardTitle className="text-2xl text-success">{activeSpots}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Occupied</CardDescription>
            <CardTitle className="text-2xl text-primary">{occupiedSpots}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl">{activeSpots - occupiedSpots}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Add Section Button */}
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreateSectionDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      {/* Sections Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="h-10 bg-muted rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No yard sections configured</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Create sections to define your yard layout
            </p>
            <Button onClick={openCreateSectionDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {section.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditSectionDialog(section)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger"
                      onClick={() => {
                        if (section.spots.some((s) => s.occupied)) {
                          addToast('Cannot delete section with occupied spots', 'error');
                          return;
                        }
                        if (confirm(`Delete section ${section.name}?`)) {
                          deleteSectionMutation.mutate({ id: section.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {section.spots.filter((s) => s.active && !s.occupied).length} of {section.spots.filter((s) => s.active).length} available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {section.spots.map((spot) => (
                    <button
                      key={spot.id}
                      onClick={() => openEditSpotDialog(spot, section.id)}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-medium transition-all',
                        !spot.active && 'opacity-40 bg-muted',
                        spot.active && !spot.occupied && 'bg-surface hover:border-primary hover:bg-primary/5',
                        spot.active && spot.occupied && 'bg-primary/10 border-primary/30',
                      )}
                    >
                      <span className="font-mono font-semibold">{spot.name}</span>
                      {spot.vehicleClass && (
                        <span className={cn(
                          'mt-1 h-1.5 w-1.5 rounded-full',
                          vehicleClassColors[spot.vehicleClass] || 'bg-muted-foreground'
                        )} />
                      )}
                      {spot.occupied && (
                        <Car className="absolute top-1 right-1 h-3 w-3 text-primary" />
                      )}
                      {!spot.active && (
                        <X className="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-surface"></div>
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-primary/10 border-primary/30"></div>
              <span className="text-muted-foreground">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-muted opacity-40"></div>
              <span className="text-muted-foreground">Inactive</span>
            </div>
            <div className="border-l pl-4 flex items-center gap-4">
              {Object.entries(vehicleClassColors).map(([vc, color]) => (
                <div key={vc} className="flex items-center gap-1.5">
                  <div className={cn('h-2 w-2 rounded-full', color)}></div>
                  <span className="text-muted-foreground text-xs">{vc}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Section' : 'Create Section'}</DialogTitle>
            <DialogDescription>
              {editingSection
                ? 'Update section name and prefix.'
                : 'Create a new yard section with parking spots.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Section Name *"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g., Row A"
            />
            <Input
              label="Spot Prefix *"
              value={sectionPrefix}
              onChange={(e) => setSectionPrefix(e.target.value.toUpperCase())}
              placeholder="e.g., A"
              maxLength={2}
            />
            {!editingSection && (
              <div>
                <label className="mb-1 block text-sm font-medium">Number of Spots</label>
                <Select value={spotsCount} onValueChange={setSpotsCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} spots
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Spots will be named {sectionPrefix || 'X'}-1 through {sectionPrefix || 'X'}-{spotsCount}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSectionDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSectionSubmit}
              loading={createSectionMutation.isLoading || updateSectionMutation.isLoading}
              disabled={!sectionName || !sectionPrefix}
            >
              {editingSection ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spot Dialog */}
      <Dialog open={spotDialogOpen} onOpenChange={setSpotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Spot {editingSpot?.name}</DialogTitle>
            <DialogDescription>
              Configure spot settings and restrictions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Spot Name"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value.toUpperCase())}
              placeholder="e.g., A-1"
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Vehicle Class Restriction</label>
              <Select value={spotVehicleClass} onValueChange={setSpotVehicleClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Any vehicle class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any vehicle class</SelectItem>
                  {Object.values(VehicleClass).map((vc) => (
                    <SelectItem key={vc} value={vc}>
                      {vc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Optionally restrict this spot to a specific vehicle class
              </p>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Spot Status</p>
                  <p className="text-sm text-muted-foreground">
                    {editingSpot?.active ? 'This spot is active' : 'This spot is inactive'}
                  </p>
                </div>
                <Button
                  variant={editingSpot?.active ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => {
                    if (editingSpot) {
                      toggleSpotMutation.mutate({ id: editingSpot.id });
                    }
                  }}
                  disabled={editingSpot?.occupied}
                >
                  {editingSpot?.active ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
              {editingSpot?.occupied && (
                <p className="mt-2 text-xs text-danger">
                  Cannot deactivate an occupied spot
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSpotDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSpotSubmit}
              loading={updateSpotMutation.isLoading}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
