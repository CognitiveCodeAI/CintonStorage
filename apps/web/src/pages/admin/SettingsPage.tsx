import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '../../components/ui/toast';
import {
  Settings,
  Save,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { VehicleType, VehicleClass, TowReason } from '../../types';

interface SystemSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  defaultState: string;
  defaultVehicleType: string;
  defaultVehicleClass: string;
  defaultTowReason: string;
  defaultPaymentMethod: string;
  alertThresholdDaysWarning: number;
  alertThresholdDaysCritical: number;
  alertThresholdBalance: number;
}

const stateOptions = [
  { value: 'MI', label: 'Michigan' },
  { value: 'OH', label: 'Ohio' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IL', label: 'Illinois' },
  { value: 'WI', label: 'Wisconsin' },
];

const paymentMethodOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'MONEY_ORDER', label: 'Money Order' },
];

export default function SettingsPage() {
  const { addToast } = useToast();
  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.admin.settings.get.useQuery();

  const [formData, setFormData] = useState<SystemSettings>({
    businessName: 'Garfield & Canal Service',
    businessAddress: '',
    businessPhone: '',
    defaultState: 'MI',
    defaultVehicleType: 'SEDAN',
    defaultVehicleClass: 'STANDARD',
    defaultTowReason: 'ABANDONED',
    defaultPaymentMethod: 'CASH',
    alertThresholdDaysWarning: 14,
    alertThresholdDaysCritical: 30,
    alertThresholdBalance: 500,
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      addToast('Settings saved successfully', 'success');
      utils.admin.settings.invalidate();
    },
    onError: (error) => {
      addToast(`Failed to save settings: ${error.message}`, 'error');
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <AdminLayout title="System Settings" description="Configure system-wide settings and defaults">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Settings" description="Configure system-wide settings and defaults">
      <div className="space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Business Information</CardTitle>
            </div>
            <CardDescription>
              Company details displayed on receipts and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Business Name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Garfield & Canal Service"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Business Address</label>
                <Textarea
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  placeholder="123 Main Street&#10;Clinton Township, MI 48035"
                  rows={2}
                />
              </div>
              <Input
                label="Business Phone"
                type="tel"
                value={formData.businessPhone}
                onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                placeholder="586-555-0100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Values */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Default Values</CardTitle>
            </div>
            <CardDescription>
              Pre-selected values for new intakes and forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Default State</label>
                <Select
                  value={formData.defaultState}
                  onValueChange={(value) => setFormData({ ...formData, defaultState: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Default Vehicle Type</label>
                <Select
                  value={formData.defaultVehicleType}
                  onValueChange={(value) => setFormData({ ...formData, defaultVehicleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(VehicleType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Default Vehicle Class</label>
                <Select
                  value={formData.defaultVehicleClass}
                  onValueChange={(value) => setFormData({ ...formData, defaultVehicleClass: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(VehicleClass).map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Default Tow Reason</label>
                <Select
                  value={formData.defaultTowReason}
                  onValueChange={(value) => setFormData({ ...formData, defaultTowReason: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TowReason).map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Default Payment Method</label>
                <Select
                  value={formData.defaultPaymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, defaultPaymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Alert Thresholds</CardTitle>
            </div>
            <CardDescription>
              Configure when cases are highlighted for attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Input
                  label="Days Warning (Amber)"
                  type="number"
                  min="1"
                  value={formData.alertThresholdDaysWarning}
                  onChange={(e) => setFormData({ ...formData, alertThresholdDaysWarning: parseInt(e.target.value) || 14 })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Show warning after this many days
                </p>
              </div>
              <div>
                <Input
                  label="Days Critical (Red)"
                  type="number"
                  min="1"
                  value={formData.alertThresholdDaysCritical}
                  onChange={(e) => setFormData({ ...formData, alertThresholdDaysCritical: parseInt(e.target.value) || 30 })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Show critical alert after this many days
                </p>
              </div>
              <div>
                <Input
                  label="High Balance Threshold"
                  type="number"
                  min="0"
                  step="50"
                  value={formData.alertThresholdBalance}
                  onChange={(e) => setFormData({ ...formData, alertThresholdBalance: parseInt(e.target.value) || 500 })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Highlight cases with balance above this amount
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            loading={updateMutation.isLoading}
            className="min-w-[140px]"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
