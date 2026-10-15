/**
 * Server screen — mobile port of huginn-webapp's /server page.
 *
 * Mirrors the web layout: an overview card grid (CPU, memory, containers,
 * docker disk, server disk), then the container list with live stats, then a
 * log viewer. The web page lays the cards out 5-across; on a phone they stack
 * two per row, which is the same information at phone width.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { Card } from '@shared/components/ui';
import {
  getContainers,
  getContainerStats,
  getServerInfo,
  getContainerLogs,
  type ContainerInfo,
  type ContainerStats,
  type ServerInfo,
  type ContainerLogs,
} from '../services/server';

/** Same units the web page uses, so the two read identically. */
function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '--';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function ServerScreen() {
  const colors = useColors();
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [stats, setStats] = useState<Map<string, ContainerStats>>(new Map());
  const [logs, setLogs] = useState<ContainerLogs | null>(null);
  const [logsName, setLogsName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [infoData, containerData, statsData] = await Promise.all([
        getServerInfo(),
        getContainers(),
        getContainerStats(),
      ]);
      setInfo(infoData);
      setContainers(containerData);
      setStats(new Map(statsData.map((s) => [s.id, s])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load server info.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openLogs = async (container: ContainerInfo) => {
    setLogsName(container.name);
    try {
      setLogs(await getContainerLogs(container.id));
    } catch (e) {
      setLogs({
        containerId: container.id,
        lines: [e instanceof Error ? e.message : 'Failed to load logs.'],
      });
    }
  };

  const styles = makeStyles(colors);

  const statCard = (icon: string, tint: string, value: string, label: string) => (
    <Card style={styles.statCard}>
      <View style={styles.statRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${tint}1A` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statValue} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    </Card>
  );

  const hostDisk = info?.hostDisk ?? null;
  const dockerBytes = info?.diskUsage.available
    ? (info.diskUsage.imagesBytes ?? 0) + (info.diskUsage.volumesBytes ?? 0)
    : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {info ? (
        <>
          <Text style={styles.hostname}>{info.hostname}</Text>
          <Text style={styles.subtle}>
            {info.os} · {info.kernel} · Docker {info.dockerVersion}
          </Text>

          <View style={styles.grid}>
            {statCard('hardware-chip-outline', '#6366f1', `${info.cpuCount} cores`, 'CPU')}
            {statCard('server-outline', '#0ea5e9', formatBytes(info.memTotalBytes), 'Total Memory')}
            {statCard(
              'cube-outline',
              '#f59e0b',
              `${info.containers.running}/${info.containers.total}`,
              'Containers running',
            )}
            {statCard(
              'albums-outline',
              '#f43f5e',
              formatBytes(dockerBytes),
              `Docker Disk (${info.images} images)`,
            )}
            {statCard(
              'disc-outline',
              '#10b981',
              hostDisk ? `${formatBytes(hostDisk.usedBytes)} / ${formatBytes(hostDisk.totalBytes)}` : '--',
              hostDisk
                ? `Server Disk (${Math.round((hostDisk.usedBytes / hostDisk.totalBytes) * 100)}% used)`
                : 'Server Disk',
            )}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Containers</Text>
      {containers.map((c) => {
        const s = stats.get(c.id);
        const running = c.state === 'running';
        return (
          <Card key={c.id} style={styles.containerCard}>
            <View style={styles.containerHead}>
              <View style={[styles.dot, { backgroundColor: running ? '#10b981' : colors.foregroundSubtle }]} />
              <Text style={styles.containerName} numberOfLines={1}>
                {c.name}
              </Text>
              <TouchableOpacity onPress={() => openLogs(c)} style={styles.logsBtn}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text style={styles.logsBtnText}>Logs</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtle} numberOfLines={1}>
              {c.status}
            </Text>
            {s ? (
              <Text style={styles.metrics}>
                CPU {s.cpuPercent.toFixed(1)}% · MEM {formatBytes(s.memUsageBytes)} ({s.memPercent.toFixed(0)}%)
              </Text>
            ) : null}
          </Card>
        );
      })}

      <Modal visible={logs !== null} animationType="slide" onRequestClose={() => setLogs(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {logsName}
            </Text>
            <TouchableOpacity onPress={() => setLogs(null)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logBody} horizontal>
            <ScrollView>
              <Text style={styles.logText}>{logs?.lines.join('\n')}</Text>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing[4], paddingBottom: spacing[8] },
    hostname: { ...textStyles.h2, color: colors.foreground },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginTop: spacing[4],
    },
    statCard: { flexGrow: 1, flexBasis: '47%', padding: spacing[2] },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statText: { flex: 1, minWidth: 0 },
    statValue: { ...textStyles.body, fontWeight: '700', color: colors.foreground },
    statLabel: { ...textStyles.caption, color: colors.foregroundMuted },
    sectionTitle: {
      ...textStyles.h3,
      color: colors.foreground,
      marginTop: spacing[6],
      marginBottom: spacing[2],
    },
    containerCard: { padding: spacing[2], marginBottom: spacing[2] },
    containerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    dot: { width: 8, height: 8, borderRadius: 4 },
    containerName: { ...textStyles.body, fontWeight: '600', color: colors.foreground, flex: 1 },
    logsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    logsBtnText: { ...textStyles.caption, color: colors.primary },
    metrics: { ...textStyles.caption, color: colors.foregroundMuted, marginTop: 2 },
    errorBox: {
      backgroundColor: '#ef44441A',
      borderRadius: radius.base,
      padding: spacing[2],
      marginBottom: spacing[2],
    },
    errorText: { ...textStyles.caption, color: '#ef4444' },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing[4],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitle: { ...textStyles.h3, color: colors.foreground, flex: 1 },
    logBody: { flex: 1, padding: spacing[2] },
    logText: { color: colors.foregroundMuted, fontFamily: 'Menlo', fontSize: 11 },
  });

export default ServerScreen;
