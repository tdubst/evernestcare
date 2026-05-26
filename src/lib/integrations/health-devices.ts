export type HealthDeviceIntegration = {
  id: "apple-health" | "bluetooth-bp" | "smart-scale";
  name: string;
  scope: string;
  status: "planned" | "mobile-required";
};

export const HEALTH_DEVICE_INTEGRATIONS: HealthDeviceIntegration[] = [
  {
    id: "apple-health",
    name: "Apple Health",
    scope: "Vitals sync through the future iOS app",
    status: "mobile-required",
  },
  {
    id: "bluetooth-bp",
    name: "Bluetooth blood pressure cuffs",
    scope: "Manual pairing bridge for supported devices",
    status: "planned",
  },
  {
    id: "smart-scale",
    name: "Smart scales",
    scope: "Weight history import when device support is enabled",
    status: "planned",
  },
];
