import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types as docTypes } from '@react-native-documents/picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { useColors, radius, shadow, spacing } from '@shared/theme';
import { MediaService } from '@shared/services/MediaService';
import { MediaType } from '@shared/types/MediaAttachment';
import { FileAttachment } from '../types/Muninn';

interface PendingAttachment {
  id: string;
  localUri: string;
  uploadedUrl?: string;
  /**
   * R2 object key returned by MediaService.uploadMedia. Captured so the client
   * can re-sign via useResolvedUri if needed, and so we have the opaque
   * identifier ready for a future backend schema that accepts keys instead of
   * URLs. Currently unused at send time — see handleSend comment.
   */
  uploadedKey?: string;
  uploading: boolean;
  type: 'image' | 'file' | 'audio';
  name?: string;
  mimeType?: string;
  duration?: number;
}

interface ChatInputProps {
  // imageUrls → R2 keys (persist-safe, sent to backend).
  // imageDisplayUris → local device URIs (immediately displayable in the
  // optimistic user bubble). Historical messages get signed URLs from the
  // backend; only the just-sent message needs this parallel channel.
  onSend: (
    message: string,
    imageUrls?: string[],
    fileAttachments?: FileAttachment[],
    audioUrl?: string,
    imageDisplayUris?: string[],
  ) => void;
  disabled?: boolean;
}

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachModal, setShowAttachModal] = useState(false);

  const hasAttachments = pendingAttachments.length > 0;
  const allUploaded = pendingAttachments.every(a => !!a.uploadedUrl);
  const canSend = !disabled && (text.trim() || hasAttachments) && (!hasAttachments || allUploaded);

  const handleSend = () => {
    if (!canSend) return;

    // Send R2 object keys, not signed URLs. The backend stores keys and
    // re-signs to short-lived URLs at use time (OpenAI dispatch, GET response).
    // This keeps persisted conversations valid indefinitely regardless of the
    // 10-min signature expiry. Falls back to uploadedUrl only if key capture
    // failed for some reason (legacy path).
    const imageUrls = pendingAttachments
      .filter(a => a.type === 'image' && (a.uploadedKey || a.uploadedUrl))
      .map(a => a.uploadedKey || a.uploadedUrl!);

    // Parallel local-URI list for the optimistic bubble. localUri is set
    // the moment the picker returns — always safe to render with
    // <Image source={{ uri }} />. Backend still receives the R2 keys.
    const imageDisplayUris = pendingAttachments
      .filter(a => a.type === 'image' && (a.uploadedKey || a.uploadedUrl))
      .map(a => a.localUri);

    const fileAttachments: FileAttachment[] = pendingAttachments
      .filter(a => a.type === 'file' && (a.uploadedKey || a.uploadedUrl))
      .map(a => ({
        url: a.uploadedKey || a.uploadedUrl!,
        name: a.name || 'file',
        mimeType: a.mimeType || 'application/octet-stream',
      }));

    const audioAttachment = pendingAttachments.find(
      a => a.type === 'audio' && (a.uploadedKey || a.uploadedUrl),
    );

    onSend(
      text.trim(),
      imageUrls.length > 0 ? imageUrls : undefined,
      fileAttachments.length > 0 ? fileAttachments : undefined,
      audioAttachment ? audioAttachment.uploadedKey || audioAttachment.uploadedUrl : undefined,
      imageDisplayUris.length > 0 ? imageDisplayUris : undefined,
    );
    setText('');
    setPendingAttachments([]);
  };

  const handlePickImage = async () => {
    const imageCount = pendingAttachments.filter(a => a.type === 'image').length;
    if (disabled || imageCount >= 5) return;

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 5 - imageCount,
      quality: 0.7,
    });

    if (result.didCancel || !result.assets?.length) return;

    const newAttachments: PendingAttachment[] = result.assets.map(asset => ({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      localUri: asset.uri!,
      uploading: true,
      type: 'image' as const,
      name: asset.fileName,
      mimeType: asset.type,
    }));

    setPendingAttachments(prev => [...prev, ...newAttachments]);

    for (const att of newAttachments) {
      try {
        const uploadResult = await MediaService.uploadMedia(
          att.localUri,
          MediaType.IMAGE,
          undefined,
          undefined,
          'chat-media',
        );
        if (uploadResult.success && uploadResult.uri) {
          setPendingAttachments(prev =>
            prev.map(p =>
              p.id === att.id
                ? { ...p, uploadedUrl: uploadResult.uri, uploadedKey: uploadResult.key, uploading: false }
                : p,
            ),
          );
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Could not upload image.');
          setPendingAttachments(prev => prev.filter(p => p.id !== att.id));
        }
      } catch {
        Alert.alert('Upload Failed', 'An error occurred while uploading the image.');
        setPendingAttachments(prev => prev.filter(p => p.id !== att.id));
      }
    }
  };

  const handlePickFile = async () => {
    if (disabled) return;

    try {
      const [file] = await pick({
        type: [docTypes.pdf, docTypes.plainText, docTypes.csv, docTypes.docx],
        allowMultiSelection: false,
      });

      if (!file?.uri) return;

      const att: PendingAttachment = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localUri: file.uri,
        uploading: true,
        type: 'file',
        name: file.name || 'document',
        mimeType: file.type || 'application/octet-stream',
      };

      setPendingAttachments(prev => [...prev, att]);

      try {
        const uploadResult = await MediaService.uploadMedia(
          att.localUri,
          MediaType.DOCUMENT,
          att.name,
          undefined,
          'chat-media',
        );
        if (uploadResult.success && uploadResult.uri) {
          setPendingAttachments(prev =>
            prev.map(p =>
              p.id === att.id
                ? { ...p, uploadedUrl: uploadResult.uri, uploadedKey: uploadResult.key, uploading: false }
                : p,
            ),
          );
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Could not upload file.');
          setPendingAttachments(prev => prev.filter(p => p.id !== att.id));
        }
      } catch {
        Alert.alert('Upload Failed', 'An error occurred while uploading the file.');
        setPendingAttachments(prev => prev.filter(p => p.id !== att.id));
      }
    } catch (err: any) {
      // User cancelled — do nothing
      if (err?.message?.includes('cancel') || err?.code === 'DOCUMENT_PICKER_CANCELED') return;
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const handleStartRecording = async () => {
    if (disabled || isRecording) return;

    try {
      await audioRecorderPlayer.startRecorder();
      setIsRecording(true);
      setRecordingDuration(0);

      audioRecorderPlayer.addRecordBackListener(e => {
        setRecordingDuration(Math.floor(e.currentPosition / 1000));
      });
    } catch {
      Alert.alert('Error', 'Could not start recording. Check microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    try {
      const uri = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      const duration = recordingDuration;
      setRecordingDuration(0);

      const att: PendingAttachment = {
        id: `audio-${Date.now()}`,
        localUri: uri,
        uploading: true,
        type: 'audio',
        name: 'Voice message',
        mimeType: 'audio/m4a',
        duration,
      };

      setPendingAttachments(prev => [...prev, att]);

      try {
        const uploadResult = await MediaService.uploadMedia(
          uri,
          MediaType.AUDIO,
          undefined,
          undefined,
          'chat-media',
        );
        if (uploadResult.success && uploadResult.uri) {
          setPendingAttachments(prev =>
            prev.map(p =>
              p.id === att.id
                ? { ...p, uploadedUrl: uploadResult.uri, uploadedKey: uploadResult.key, uploading: false }
                : p,
            ),
          );
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Could not upload voice message.');
          setPendingAttachments(prev => prev.filter(p => p.id !== att.id));
        }
      } catch {
        Alert.alert('Upload Failed', 'An error occurred while uploading the voice message.');
        setPendingAttachments(prev => prev.filter(p => p.id !== att.id));
      }
    } catch {
      setIsRecording(false);
      Alert.alert('Error', 'Could not stop recording.');
    }
  };

  const handleAttachPress = () => {
    setShowAttachModal(true);
  };

  const handleAttachOption = (action: () => void) => {
    setShowAttachModal(false);
    // Small delay so modal closes before picker opens
    setTimeout(action, 150);
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(p => p.id !== id));
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {hasAttachments && (
        <View style={styles.previewRow}>
          {pendingAttachments.map(att => (
            <View key={att.id} style={styles.previewItem}>
              {att.type === 'image' ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: att.localUri }} style={styles.imagePreview} />
                  {att.uploading && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
              ) : att.type === 'file' ? (
                <View style={[styles.fileChip, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="document-outline" size={16} color={colors.primary} />
                  <Text style={[styles.fileChipText, { color: colors.foreground }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  {att.uploading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
                </View>
              ) : (
                <View style={[styles.fileChip, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="mic-outline" size={16} color={colors.primary} />
                  <Text style={[styles.fileChipText, { color: colors.foreground }]}>
                    {att.duration ? formatDuration(att.duration) : 'Voice'}
                  </Text>
                  {att.uploading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
                </View>
              )}
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                onPress={() => removeAttachment(att.id)}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {isRecording && (
        <View style={[styles.recordingBar, { backgroundColor: colors.destructive + '15' }]}>
          <View style={[styles.recordingDot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.recordingText, { color: colors.destructive }]}>
            Recording {formatDuration(recordingDuration)}
          </Text>
          <TouchableOpacity onPress={handleStopRecording} style={[styles.stopRecordBtn, { backgroundColor: colors.destructive }]}>
            <Ionicons name="stop" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleAttachPress} disabled={disabled}>
          <Ionicons
            name="attach-outline"
            size={24}
            color={disabled ? colors.foregroundSubtle : colors.primary}
          />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.foreground }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.foregroundSubtle}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          editable={!disabled && !isRecording}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        {!isRecording && !text.trim() && !hasAttachments ? (
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: colors.primary }]}
            onPress={handleStartRecording}
            disabled={disabled}
          >
            <Ionicons name="mic" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.border }]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons name="send" size={18} color={canSend ? colors.primaryForeground : colors.foregroundSubtle} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showAttachModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachModal(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAttachModal(false)}>
          <Pressable
            style={[
              styles.attachSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing[4] },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.attachGrid}>
              {[
                { icon: 'image', color: colors.primary, bg: colors.primaryMuted, label: 'Photo', action: handlePickImage },
                { icon: 'document-text', color: colors.info, bg: colors.infoMuted, label: 'File', action: handlePickFile },
                { icon: 'mic', color: colors.destructive, bg: colors.destructiveMuted, label: 'Voice', action: handleStartRecording },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.attachGridItem}
                  onPress={() => handleAttachOption(item.action)}
                >
                  <View style={[styles.attachGridIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={26} color={item.color} />
                  </View>
                  <Text style={[styles.attachGridLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  previewItem: {
    position: 'relative',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    maxWidth: 180,
  },
  fileChipText: {
    fontSize: 13,
    flexShrink: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  stopRecordBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  attachSheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing[2],
    paddingHorizontal: spacing[6],
    ...shadow.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[5],
  },
  attachGrid: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: spacing[2],
  },
  attachGridItem: {
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 72,
  },
  attachGridIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGridLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
