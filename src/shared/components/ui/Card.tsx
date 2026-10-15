import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Pressable, PressableProps } from 'react-native';
import { useColors, radius, shadow as shadowTokens, spacing } from '@shared/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
}

export function Card({ children, variant = 'elevated', padding = 'md', style, onPress, onLongPress }: CardProps) {
  const colors = useColors();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
      case 'outlined':
        return colors.card;
      case 'filled':
        return colors.muted;
      case 'ghost':
        return 'transparent';
      default:
        return colors.card;
    }
  };

  const paddingSizes: Record<string, number> = {
    none: 0,
    sm: spacing[3], // 12px
    md: spacing[4], // 16px
    lg: spacing[6], // 24px
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: radius.lg,
    padding: paddingSizes[padding],
    // Outlined variant: softer border (Soft Minimal)
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: colors.borderMuted,
    }),
    // Elevated variant: soft shadow + subtle border (Soft Minimal)
    ...(variant === 'elevated' && {
      borderWidth: 1,
      borderColor: colors.borderMuted,
      ...shadowTokens.sm,
    }),
  };

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        android_ripple={{ color: colors.surfaceHover }}
        style={[cardStyle, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

export interface CardTitleProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardTitle({ children, style }: CardTitleProps) {
  const colors = useColors();
  return (
    <View style={[styles.cardTitle, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.titleText, { color: colors.foreground }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  const colors = useColors();
  return (
    <View style={[styles.cardDescription, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.cardFooter, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  cardHeader: {
    marginBottom: spacing[3], // 12px
  },
  cardTitle: {
    marginBottom: spacing[1], // 4px
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  cardDescription: {
    marginBottom: spacing[2], // 8px
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardFooter: {
    marginTop: spacing[4], // 16px
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing[2], // 8px
  },
});

export default Card;
