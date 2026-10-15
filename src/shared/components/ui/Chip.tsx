import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors } from '@shared/theme';

export interface ChipProps {
  children: React.ReactNode;
  variant?: 'filled' | 'outlined';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'default';
  size?: 'sm' | 'md';
  selected?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  children,
  variant = 'filled',
  color = 'default',
  size = 'md',
  selected = false,
  onPress,
  onClose,
  leftIcon,
  style,
}: ChipProps) {
  const colors = useColors();

  const getColors = () => {
    const colorMap = {
      primary: {
        bg: colors.primaryMuted,
        text: colors.primary,
        border: colors.primary,
      },
      success: {
        bg: colors.successMuted,
        text: colors.success,
        border: colors.success,
      },
      warning: {
        bg: colors.warningMuted,
        text: colors.warning,
        border: colors.warning,
      },
      error: {
        bg: colors.destructiveMuted,
        text: colors.destructive,
        border: colors.destructive,
      },
      default: {
        bg: colors.muted,
        text: colors.mutedForeground,
        border: colors.border,
      },
    };
    return colorMap[color];
  };

  const chipColors = getColors();
  const isSmall = size === 'sm';

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmall ? 4 : 8,
    paddingHorizontal: isSmall ? 8 : 12,
    borderRadius: 999,
    backgroundColor: variant === 'filled' || selected ? chipColors.bg : 'transparent',
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: variant === 'outlined' ? colors.borderMuted : chipColors.border,
    gap: 6,
  };

  const textStyle = {
    color: chipColors.text,
    fontSize: isSmall ? 12 : 14,
    fontWeight: '500' as const,
  };

  const content = (
    <>
      {leftIcon}
      <Text style={textStyle}>{children}</Text>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={4}>
          <Ionicons name="close-circle" size={isSmall ? 14 : 18} color={chipColors.text} />
        </Pressable>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[containerStyle, style]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{content}</View>;
}

export interface ChipGroupProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ChipGroup({ children, style }: ChipGroupProps) {
  return <View style={[styles.group, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default Chip;
