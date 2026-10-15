import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors } from '@shared/theme';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  leftElement?: React.ReactNode;
  rightIcon?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  leftElement,
  rightIcon = 'chevron-forward',
  rightElement,
  onPress,
  disabled = false,
  style,
}: ListItemProps) {
  const colors = useColors();

  const content = (
    <>
      {(leftIcon || leftElement) && (
        <View style={styles.leftContainer}>
          {leftElement || <Ionicons name={leftIcon!} size={24} color={colors.mutedForeground} />}
        </View>
      )}
      <View style={styles.textContainer}>
        <Text
          style={[styles.title, { color: disabled ? colors.mutedForeground : colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {(rightIcon || rightElement) && (
        <View style={styles.rightContainer}>
          {rightElement || (onPress && <Ionicons name={rightIcon} size={20} color={colors.mutedForeground} />)}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        android_ripple={{ color: colors.muted }}
        style={[styles.container, disabled && { opacity: 0.5 }, style]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
}

export interface ListSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ListSection({ title, children, style }: ListSectionProps) {
  const colors = useColors();

  return (
    <View style={[styles.section, style]}>
      {title && <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>}
      <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );
}

export interface ListDividerProps {
  inset?: boolean;
  style?: ViewStyle;
}

export function ListDivider({ inset = false, style }: ListDividerProps) {
  const colors = useColors();

  return <View style={[styles.divider, { backgroundColor: colors.border }, inset && styles.dividerInset, style]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  leftContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  dividerInset: {
    marginLeft: 56,
  },
});

export default ListItem;
