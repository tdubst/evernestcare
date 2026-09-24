export type HealthDeviceIntegration = {
  id: "apple-health" | "bluetooth-bp" | "smart-scale";
  name: string;
  scope: string;
  status: "planned" | "mobile-required";
};

export const HEALTH_DEVICE_INTEGRATIONS: HealthDeviceIntegration[] = [
  {
    id: "apple-health",
    name: "Mobile connection path",
    scope: "Future app review required",
    status: "mobile-required",
  },
  {
    id: "bluetooth-bp",
    name: "Accessory connection path",
    scope: "Manual setup review required",
    status: "planned",
  },
  {
    id: "smart-scale",
    name: "Home reading connection path",
    scope: "Import review required",
    status: "planned",
  },
];
