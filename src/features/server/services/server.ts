/**
 * Server module — mirrors huginn-webapp/src/modules/v1.0/server/services.ts.
 *
 * Same four endpoints, same shapes, so the mobile screen can render exactly
 * what the web Server page renders. Keep the interfaces in sync with the web
 * copy: huginn-external owns the contract and both clients read it.
 */

import { api } from '@shared/services/api/httpClient';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: number;
  ports: string[];
  networks: string[];
}

export interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memUsageBytes: number;
  memLimitBytes: number;
  memPercent: number;
  netRxBytes: number;
  netTxBytes: number;
}

export interface ServerInfo {
  hostname: string;
  os: string;
  kernel: string;
  dockerVersion: string;
  cpuCount: number;
  memTotalBytes: number;
  containers: {
    total: number;
    running: number;
    paused: number;
    stopped: number;
  };
  images: number;
  /** imagesBytes/volumesBytes are null when Docker's /system/df timed out. */
  diskUsage: {
    imagesBytes: number | null;
    volumesBytes: number | null;
    available: boolean;
  };
  /** Host filesystem. null when statfs failed. */
  hostDisk: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
  } | null;
}

export interface ContainerLogs {
  containerId: string;
  lines: string[];
}

export function getContainers() {
  return api.get<ContainerInfo[]>('/api/server/containers');
}

export function getContainerStats() {
  return api.get<ContainerStats[]>('/api/server/stats');
}

export function getServerInfo() {
  return api.get<ServerInfo>('/api/server/info');
}

export function getContainerLogs(id: string, tail = 200) {
  return api.get<ContainerLogs>(`/api/server/containers/${id}/logs`, {
    searchParams: { tail },
  });
}
