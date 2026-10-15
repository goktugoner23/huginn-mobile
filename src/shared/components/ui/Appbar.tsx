import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors, textStyles, shadow as shadowTokens, spacing } from '@shared/theme';

export interface AppbarActionProps {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}

export function AppbarAction({ icon, onPress, disabled, color }: AppbarActionProps) {
  const colors = useColors();
  const iconColor = color || colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    >
      <Ionicons name={icon} size={24} color={disabled ? colors.foregroundSubtle : iconColor} />
    </Pressable>
  );
}

export interface AppbarProps {
  title?: string;
  subtitle?: string;
  leading?: 'back' | 'menu' | 'close' | React.ReactNode;
  onLeadingPress?: () => void;
  trailing?: React.ReactNode;
  elevated?: boolean;
  transparent?: boolean;
  style?: ViewStyle;
}

export function Appbar({
  title,
  subtitle,
  leading,
  onLeadingPress,
  trailing,
  elevated = false,
  transparent = false,
  style,
}: AppbarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const getLeadingIcon = (): string | null => {
    if (typeof leading === 'string') {
      switch (leading) {
        case 'back':
          return 'chevron-back';
        case 'menu':
          return 'menu';
        case 'close':
          return 'close';
        default:
          return null;
      }
    }
    return null;
  };

  const leadingIcon = getLeadingIcon();
  const isCustomLeading = leading && typeof leading !== 'string';

  const containerStyle: ViewStyle = {
    backgroundColor: transparent ? 'transparent' : colors.background,
    paddingTop: insets.top,
    ...(elevated ? shadowTokens.sm : {}),
    ...(!elevated && !transparent
      ? {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }
      : {}),
  };

  return (
    <View style={[containerStyle, style]}>
      <View style={styles.content}>
        {/* Leading */}
        <View style={styles.leading}>
          {leadingIcon && onLeadingPress && (
            <Pressable
              onPress={onLeadingPress}
              style={styles.actionButton}
            >
              <Ionicons name={leadingIcon} size={24} color={colors.foreground} />
            </Pressable>
          )}
          {isCustomLeading && leading}
        </View>

        {/* Title/Subtitle */}
        <View style={styles.titleContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                { color: colors.foreground },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                textStyles.caption,
                { color: colors.foregroundMuted },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Trailing */}
        <View style={styles.trailing}>{trailing}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2], // 8px
  },
  leading: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[2], // 8px
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1], // 4px
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});

export default Appbar;
