import React from 'react';
import { Pressable, ViewStyle, PressableProps, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors } from '@shared/theme';

export interface IconButtonProps extends PressableProps {
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined' | 'ghost';
  color?: string;
  loading?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  size = 'md',
  variant = 'default',
  color,
  loading = false,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const sizes: Record<string, { button: number; icon: number }> = {
    sm: { button: 32, icon: 18 },
    md: { button: 44, icon: 24 },
    lg: { button: 56, icon: 28 },
  };

  const sizeValues = sizes[size];

  const getColors = () => {
    const baseColor = color || colors.foreground;
    switch (variant) {
      case 'filled':
        return {
          bg: colors.primaryMuted,
          icon: colors.primary,
        };
      case 'outlined':
        return {
          bg: 'transparent',
          icon: baseColor,
          border: colors.border,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          icon: baseColor,
        };
      default:
        return {
          bg: colors.muted,
          icon: baseColor,
        };
    }
  };

  const buttonColors = getColors();

  const buttonStyle: ViewStyle = {
    width: sizeValues.button,
    height: sizeValues.button,
    borderRadius: sizeValues.button / 2,
    backgroundColor: buttonColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.5 : 1,
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: buttonColors.border,
    }),
  };

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={[buttonStyle, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={buttonColors.icon} />
      ) : (
        <Ionicons name={icon} size={sizeValues.icon} color={buttonColors.icon} />
      )}
    </Pressable>
  );
}

export default IconButton;
